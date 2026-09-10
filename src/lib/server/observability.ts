import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  DEFAULT_OBSERVABILITY_CONFIG,
  ObservabilityConfigSchema,
  ObservabilityLevelSchema,
  type ObservabilityConfig,
  type ObservabilityLevel,
} from "@/lib/cbt/types";
import { prisma } from "./db/prisma";
import { parseJson } from "./db/json";
import { requireCaller } from "./db/auth";

const OBSERVABILITY_ENTITY = "observability";
const MAX_DETAILS_LENGTH = 4_000;
const PRUNE_INTERVAL_MS = 15 * 60 * 1_000;
const LEVEL_RANK: Record<ObservabilityLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let cachedConfig: { value: ObservabilityConfig; expiresAt: number } | undefined;
let lastPruneAt = 0;

export type ObservabilityLogRow = {
	id: string;
	createdAt: string;
	severity: ObservabilityLevel;
	event: string;
	requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
};

function parseConfig(value: string | null | undefined): ObservabilityConfig {
  return ObservabilityConfigSchema.parse(parseJson(value, DEFAULT_OBSERVABILITY_CONFIG));
}

export async function getObservabilityConfig(): Promise<ObservabilityConfig> {
  if (cachedConfig && cachedConfig.expiresAt > Date.now()) return cachedConfig.value;
  try {
    const row = await prisma.appConfig.findUnique({
      where: { id: "app" },
      select: { observability: true },
    });
    const value = parseConfig(row?.observability);
    cachedConfig = { value, expiresAt: Date.now() + 10_000 };
    return value;
  } catch {
    return DEFAULT_OBSERVABILITY_CONFIG;
  }
}

export function setObservabilityConfig(value: ObservabilityConfig): void {
  cachedConfig = { value, expiresAt: Date.now() + 10_000 };
}

function shouldRecord(config: ObservabilityConfig, severity: ObservabilityLevel): boolean {
  if (!config.enabled || LEVEL_RANK[severity] < LEVEL_RANK[config.minLevel]) return false;
  return severity === "error" || Math.random() <= config.sampleRate;
}

function isDynamicRequest(path: string): boolean {
  return !path.startsWith("/_build/") && !path.startsWith("/assets/") && path !== "/favicon.ico";
}

function safeText(value: string | undefined, max = 500): string | undefined {
  return value?.replace(/[\r\n\t]/g, " ").slice(0, max);
}

async function writeEvent(event: {
  severity: ObservabilityLevel;
  event: string;
	requestId?: string;
  method?: string;
	path?: string;
	statusCode?: number;
	durationMs?: number;
	errorType?: string;
	message?: string;
}): Promise<void> {
  try {
    const payload = {
      schemaVersion: 1,
      severity: event.severity,
      event: event.event,
			requestId: event.requestId,
      attributes: {
        "http.request.method": safeText(event.method, 16),
        "url.path": safeText(event.path, 512),
				"http.response.status_code": event.statusCode,
				"http.server.duration_ms": event.durationMs,
				"error.type": safeText(event.errorType, 128),
				message: safeText(event.message),
      },
    };
    const encoded = JSON.stringify(payload);
    const details =
      encoded.length <= MAX_DETAILS_LENGTH
        ? encoded
        : JSON.stringify({ ...payload, attributes: { truncated: true } });
    await prisma.auditLog.create({
      data: {
				id: `obs_${globalThis.crypto.randomUUID()}`,
        userId: "system",
        userRole: "system",
        action: event.event,
        entity: OBSERVABILITY_ENTITY,
        details,
      },
    });
  } catch {
    // Observability must never change the primary request outcome.
  }
}

async function pruneObservabilityLogs(retentionDays: number): Promise<void> {
  if (Date.now() - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = Date.now();
  try {
    await prisma.auditLog.deleteMany({
      where: {
        entity: OBSERVABILITY_ENTITY,
        createdAt: { lt: new Date(Date.now() - retentionDays * 86_400_000) },
      },
    });
  } catch {
    // Retention cleanup is best-effort.
  }
}

export async function recordHttpRequest(input: {
  requestId: string;
  request: Request;
	statusCode: number;
	durationMs: number;
	errorType?: string;
}): Promise<void> {
  const path = new URL(input.request.url).pathname;
  const config = await getObservabilityConfig();
  if (!config.captureRequests || !isDynamicRequest(path)) return;
  const severity: ObservabilityLevel =
    input.statusCode >= 500 ? "error" : input.statusCode >= 400 ? "warn" : "info";
  if (!shouldRecord(config, severity)) return;
  await writeEvent({
    severity,
    event: "http.server.request",
		requestId: input.requestId,
    method: input.request.method,
    path,
		statusCode: input.statusCode,
		durationMs: input.durationMs,
		errorType: input.errorType,
  });
  void pruneObservabilityLogs(config.retentionDays);
}

export const getObservabilityLogsServer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      limit: z.number().int().min(1).max(200).default(100),
      severity: ObservabilityLevelSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const caller = await requireCaller();
    if (!caller || caller.role !== "super_admin") {
      return { ok: false as const, error: "Forbidden", logs: [] as ObservabilityLogRow[] };
    }
    const rows = await prisma.auditLog.findMany({
      where: { entity: OBSERVABILITY_ENTITY },
      orderBy: { createdAt: "desc" },
      take: data.limit,
      select: { id: true, details: true, createdAt: true },
    });
    const logs = rows.flatMap((row) => {
      const details = parseJson<{
        severity?: ObservabilityLevel;
        event?: string;
				requestId?: string;
        attributes?: Record<string, unknown>;
      }>(row.details, {});
      const severity = ObservabilityLevelSchema.safeParse(details.severity);
      if (!severity.success || (data.severity && severity.data !== data.severity)) return [];
      const attributes = details.attributes ?? {};
      return [
        {
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          severity: severity.data,
          event: details.event ?? "unknown",
				requestId: details.requestId,
          method:
            typeof attributes["http.request.method"] === "string"
              ? attributes["http.request.method"]
              : undefined,
          path: typeof attributes["url.path"] === "string" ? attributes["url.path"] : undefined,
          statusCode:
            typeof attributes["http.response.status_code"] === "number"
              ? attributes["http.response.status_code"]
              : undefined,
          durationMs:
            typeof attributes["http.server.duration_ms"] === "number"
              ? attributes["http.server.duration_ms"]
              : undefined,
        } satisfies ObservabilityLogRow,
      ];
    });
    return { ok: true as const, logs };
  });
