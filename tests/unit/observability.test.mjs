import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import { z } from "zod";

function load(relativePath, dependencies) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    console,
    Promise,
    URL,
    Request,
    crypto: dependencies["node:crypto"],
    setTimeout,
    Math,
    Date,
    require(name) {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

function serverFn() {
  const api = {
    validator() {
      return api;
    },
    handler(fn) {
      return fn;
    },
  };
  return api;
}

const types = {
  ObservabilityLevelSchema: z.enum(["debug", "info", "warn", "error"]),
  DEFAULT_OBSERVABILITY_CONFIG: {
    enabled: false,
    captureRequests: true,
    minLevel: "info",
    sampleRate: 1,
    retentionDays: 30,
  },
};
types.ObservabilityConfigSchema = z.object({
  enabled: z.boolean().default(false),
  captureRequests: z.boolean().default(true),
  minLevel: types.ObservabilityLevelSchema.default("info"),
  sampleRate: z.number().min(0).max(1).default(1),
  retentionDays: z.number().int().min(1).max(365).default(30),
});

function dependencies({ prisma, requireAdminResult }) {
  let sequence = 0;
  return {
    "node:crypto": { randomUUID: () => `uuid-${++sequence}` },
    "@tanstack/react-start": { createServerFn: serverFn },
    zod: { z },
    "@/lib/cbt/types": types,
    "./db/json": {
      parseJson: (value, fallback) => {
        try {
          return value ? JSON.parse(value) : fallback;
        } catch {
          return fallback;
        }
      },
      stringifyJson: JSON.stringify,
    },
    "./db/auth": { requireAdminResult },
    "./db/prisma": { prisma },
  };
}

test("observability config is Super Admin-only and persists only its JSON field", async () => {
  let saved;
  const prisma = {
    appConfig: {
      async findUnique() {
        return { observability: saved?.update?.observability ?? "{}" };
      },
      async upsert(args) {
        saved = args;
      },
    },
  };
  const functions = load(
    "../../src/lib/server/observability.ts",
    dependencies({
      prisma,
      requireAdminResult: async () => ({ ok: true }),
    }),
  );
  const config = {
    enabled: true,
    captureRequests: false,
    minLevel: "warn",
    sampleRate: 0.25,
    retentionDays: 14,
  };
  assert.equal(
    JSON.stringify(await functions.saveObservabilityConfigServer({ data: config })),
    JSON.stringify({ ok: true }),
  );
  assert.equal(saved.update.observability, JSON.stringify(config));
  assert.equal(
    JSON.stringify((await functions.getObservabilityConfigServer()).config),
    JSON.stringify(config),
  );

  const denied = load(
    "../../src/lib/server/observability.ts",
    dependencies({
      prisma,
      requireAdminResult: async () => ({ ok: false, error: "Forbidden" }),
    }),
  );
  assert.equal(
    JSON.stringify(await denied.getObservabilityConfigServer()),
    JSON.stringify({ ok: false, error: "Forbidden" }),
  );
  assert.equal(
    JSON.stringify(await denied.getObservabilityLogsServer({ data: { limit: 10 } })),
    JSON.stringify({ ok: false, error: "Forbidden", logs: [] }),
  );
});

test("request telemetry redacts opaque path segments, omits query strings, and keeps errors unsampled", async () => {
  const prisma = {
    appConfig: {
      async findUnique() {
        return {
          observability: JSON.stringify({
            enabled: true,
            captureRequests: true,
            minLevel: "info",
            sampleRate: 0,
            retentionDays: 30,
          }),
        };
      },
      async upsert() {},
    },
  };
  const functions = load(
    "../../src/lib/server/observability.ts",
    dependencies({
      prisma,
      requireAdminResult: async () => ({ ok: true }),
    }),
  );
  await functions.recordHttpRequest({
    request: new Request("https://cbt.test/api/files/f_secretToken123?password=hidden"),
    requestId: "request-1",
    statusCode: 200,
    durationMs: 12.7,
  });
  await functions.recordHttpRequest({
    request: new Request("https://cbt.test/api/files/f_secretToken123?password=hidden"),
    requestId: "request-2",
    statusCode: 500,
    durationMs: 18.4,
    errorType: "DatabaseError\nprivate path",
  });
  const result = await functions.getObservabilityLogsServer({ data: { limit: 10 } });
  assert.equal(result.logs.length, 1);
  assert.equal(result.logs[0].id, "obs_uuid-1");
  assert.equal(result.logs[0].severity, "error");
  assert.equal(result.logs[0].event, "http.server.request");
  assert.equal(result.logs[0].requestId, "request-2");
  assert.equal(result.logs[0].method, "GET");
  assert.equal(result.logs[0].path, "/api/files/:id");
  assert.equal(result.logs[0].statusCode, 500);
  assert.equal(result.logs[0].durationMs, 18);
  assert.equal(result.logs[0].errorType, "DatabaseError private path");
  assert.equal(result.logs[0].path.includes("secret"), false);
});

test("malformed persisted observability config fails closed", async () => {
  const functions = load(
    "../../src/lib/server/observability.ts",
    dependencies({
      prisma: {
        appConfig: {
          async findUnique() {
            return { observability: "{broken" };
          },
        },
      },
      requireAdminResult: async () => ({ ok: true }),
    }),
  );
  await functions.recordHttpRequest({
    request: new Request("https://cbt.test/admin"),
    requestId: "request-1",
    statusCode: 500,
    durationMs: 1,
  });
  assert.equal(
    (await functions.getObservabilityLogsServer({ data: { limit: 10 } })).logs.length,
    0,
  );
});
