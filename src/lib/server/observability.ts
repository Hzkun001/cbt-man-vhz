import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  DEFAULT_OBSERVABILITY_CONFIG,
  ObservabilityConfigSchema,
  ObservabilityLevelSchema,
  type ObservabilityConfig,
  type ObservabilityLevel,
} from "@/lib/cbt/types";
import { parseJson, stringifyJson } from "./db/json";
import { requireAdminResult } from "./db/auth";
import { prisma } from "./db/prisma";

const MAX_RECENT_LOGS = 200;
const CONFIG_CACHE_TTL_MS = 10_000;
const LEVEL_RANK: Record<ObservabilityLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type ObservabilityLogRow = {
  id: string;
  createdAt: string;
  severity: ObservabilityLevel;
  event: "http.server.request";
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  errorType?: string;
};

let configCache: { value: ObservabilityConfig; expiresAt: number } | undefined;
let recentLogs: ObservabilityLogRow[] = [];

function randomId(): string {
  return globalThis.crypto.randomUUID();
}

function disabledConfig(): ObservabilityConfig {
  return { ...DEFAULT_OBSERVABILITY_CONFIG, enabled: false };
}

function parseConfig(value: string | null | undefined): ObservabilityConfig {
  const parsed = ObservabilityConfigSchema.safeParse(parseJson(value, {}));
  return parsed.success ? parsed.data : disabledConfig();
}

export async function getObservabilityConfig(): Promise<ObservabilityConfig> {
  if (configCache && configCache.expiresAt > Date.now()) return configCache.value;
  try {
    const row = await prisma.appConfig.findUnique({
      where: { id: "app" },
      select: { observability: true },
    });
    const value = parseConfig(row?.observability);
    configCache = { value, expiresAt: Date.now() + CONFIG_CACHE_TTL_MS };
    return value;
  } catch {
    return disabledConfig();
  }
}

export function setObservabilityConfig(value: ObservabilityConfig): void {
  configCache = {
    value: ObservabilityConfigSchema.parse(value),
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
  };
}

function pruneLogs(retentionDays: number): void {
  const cutoff = Date.now() - retentionDays * 86_400_000;
  recentLogs = recentLogs.filter((log) => Date.parse(log.createdAt) >= cutoff);
}

function isDynamicRequest(path: string): boolean {
  return !path.startsWith("/assets/") && !path.startsWith("/_build/") && path !== "/favicon.ico";
}

function sanitizePath(pathname: string): string {
  const opaqueSegment =
    /^(?:[a-z]{1,4}_[A-Za-z0-9_-]{8,}|[0-9]+|[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{24,})$/i;
  return pathname
    .split("/")
    .map((segment) => (opaqueSegment.test(segment) ? ":id" : segment))
    .join("/");
}

function shouldRecord(config: ObservabilityConfig, severity: ObservabilityLevel): boolean {
  if (!config.enabled || !config.captureRequests) return false;
  if (LEVEL_RANK[severity] < LEVEL_RANK[config.minLevel]) return false;
  return severity === "error" || Math.random() <= config.sampleRate;
}

export async function recordHttpRequest(input: {
  request: Request;
  requestId?: string;
  statusCode: number;
  durationMs: number;
  errorType?: string;
}): Promise<void> {
  try {
    const config = await getObservabilityConfig();
    const pathname = new URL(input.request.url).pathname;
    if (!isDynamicRequest(pathname)) return;
    const severity: ObservabilityLevel =
      input.statusCode >= 500 ? "error" : input.statusCode >= 400 ? "warn" : "info";
    if (!shouldRecord(config, severity)) return;

    pruneLogs(config.retentionDays);
    recentLogs.push({
      id: `obs_${randomId()}`,
      createdAt: new Date().toISOString(),
      severity,
      event: "http.server.request",
      requestId: input.requestId ?? randomId(),
      method: input.request.method,
      path: sanitizePath(pathname),
      statusCode: input.statusCode,
      durationMs: Math.max(0, Math.round(input.durationMs)),
      errorType: input.errorType?.replace(/[\r\n\t]/g, " ").slice(0, 128),
    });
    if (recentLogs.length > MAX_RECENT_LOGS) recentLogs = recentLogs.slice(-MAX_RECENT_LOGS);
  } catch {
    // ponytail: bounded process-local buffer; use durable/exported telemetry when scale requires it.
  }
}

export const getObservabilityConfigServer = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAdminResult();
  if (!auth.ok) return { ok: false as const, error: auth.error };
  return { ok: true as const, config: await getObservabilityConfig() };
});

export const saveObservabilityConfigServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => ObservabilityConfigSchema.parse(data))
  .handler(async ({ data }) => {
    const auth = await requireAdminResult();
    if (!auth.ok) return { ok: false as const, error: auth.error };
    try {
      await prisma.appConfig.upsert({
        where: { id: "app" },
        update: { observability: stringifyJson(data) },
        create: { id: "app", observability: stringifyJson(data) },
      });
      setObservabilityConfig(data);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "Pengaturan observability gagal disimpan." };
    }
  });

export const getObservabilityLogsServer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      limit: z.number().int().min(1).max(MAX_RECENT_LOGS).default(100),
      severity: ObservabilityLevelSchema.optional(),
    }),
  )
  .handler(async ({ data }) => {
    const auth = await requireAdminResult();
    if (!auth.ok)
      return { ok: false as const, error: auth.error, logs: [] as ObservabilityLogRow[] };
    const config = await getObservabilityConfig();
    pruneLogs(config.retentionDays);
    const logs = recentLogs
      .filter((log) => !data.severity || log.severity === data.severity)
      .slice(-data.limit)
      .reverse();
    return { ok: true as const, logs };
  });
