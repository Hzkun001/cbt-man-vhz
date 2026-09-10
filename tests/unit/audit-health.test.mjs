import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";

function load(relativePath, dependencies) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, Response, console: { error() {} },
    require(name) {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

test("audit uses the transaction client and reports write failures", async () => {
  const { writeAuditLog } = load("../../src/lib/server/db/audit.ts", {
    "./prisma": { prisma: { auditLog: { create() { assert.fail("Global client used"); } } } },
  });
  const entry = { userId: "admin", userRole: "super_admin", action: "backup.restore", entity: "backup", details: '{"phase":"succeeded"}' };
  let stored;
  const result = await writeAuditLog(entry, { auditLog: { async create({ data }) { stored = data; } } });
  assert.equal(result.ok, true);
  assert.equal(stored.details, entry.details);
  const failed = await writeAuditLog(entry, { auditLog: { async create() { throw new Error("private database error"); } } });
  assert.equal(failed.ok, false);
  assert.equal(failed.error, "Audit log tidak dapat disimpan");
});

test("readiness retains dependency failure status without disclosing internals", async () => {
  let unavailable = false;
  const { Route } = load("../../src/routes/api.health.ts", {
    "@tanstack/react-router": { createFileRoute: () => (route) => route },
    "@/lib/server/db/prisma": { prisma: { async $queryRaw() { if (unavailable) throw new Error("private database path"); } } },
  });
  const healthy = await Route.server.handlers.GET();
  assert.equal(healthy.status, 200);
  assert.deepEqual(await healthy.json(), { status: "ok" });
  unavailable = true;
  const failed = await Route.server.handlers.GET();
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("cache-control"), "no-store");
  assert.deepEqual(await failed.json(), { status: "not_ready" });
});

test("restore and reset roll back when their completion audit fails", async () => {
  for (const operation of ["importBackupServer", "resetAllDataServer"]) {
    const events = [];
    const tx = new Proxy({}, { get: () => ({ async deleteMany() {}, async create() {} }) });
    const prisma = { async $transaction(run) {
      try { await run(tx); events.push("commit"); }
      catch (error) { events.push("rollback-db"); throw error; }
    } };
    const functions = load("../../src/lib/server/backup/functions.ts", {
      "@tanstack/react-start": { createServerFn: () => ({ validator() { return this; }, handler: (fn) => fn }) },
      zod: { z },
      "../db/prisma": { prisma },
      "../db/auth": { requireAdminResult: async () => ({ ok: true }), requireCaller: async () => ({ id: "admin", role: "super_admin" }) },
      "../db/audit": { async writeAuditLog(entry, db) {
        if (JSON.parse(entry.details).phase === "attempt") return { ok: true };
        assert.equal(db, tx);
        return { ok: false, error: "Audit failed" };
      } },
      "../db/json": { stringifyJson: JSON.stringify },
      "../files/functions": {
        fileBackupSchema: z.object({}),
        withFileOperationLock: (run) => run(),
        stageFileRestore: async () => ({}),
        promoteFileRestore: async () => events.push("promote-files"),
        rollbackFileRestore: async () => events.push("rollback-files"),
        finalizeFileRestore: async () => events.push("cleanup"),
      },
    });
    const data = { users: [], unitAkademik: [], mataKuliah: [], modul: [], topik: [], soal: [], ujian: [], penawaran: [], token: [], tokenClaims: [], sesi: [], config: {}, files: [] };
    await assert.rejects(functions[operation]({ data }), /Audit failed/);
    assert.deepEqual(events, operation === "importBackupServer"
      ? ["promote-files", "rollback-db", "rollback-files"] : ["rollback-db"]);
  }
});
