import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../../", import.meta.url);

// Keep real validators and handlers; replace only the HTTP registration layer.
export function createServerFn() {
  let validator;
  return {
    validator(value) { validator = value; return this; },
    handler(handler) {
      return async ({ data } = {}) => handler({ data: validator
        ? typeof validator === "function" ? validator(data) : validator.parse(data)
        : data });
    },
  };
}

export function load(relativePath, dependencies = {}) {
  const source = readFileSync(new URL(relativePath, root), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, console, process, Buffer, Response, Headers, TextEncoder, crypto, atob, btoa, setTimeout, clearTimeout,
    require: (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
  });
  return exports;
}

export function database() {
  const directory = mkdtempSync(join(tmpdir(), "cbt-security-test-"));
  const url = `file:${join(directory, "test.db")}`;
  try {
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
      cwd: root, env: { ...process.env, DATABASE_URL: url }, timeout: 60_000, stdio: "pipe",
    });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  return { prisma, async close() {
    await prisma.$disconnect();
    rmSync(directory, { recursive: true, force: true });
  } };
}

export function runtime(prisma, callerId) {
  const json = load("src/lib/server/db/json.ts");
  const scope = load("src/lib/cbt/ujian-scope.ts");
  const auth = load("src/lib/server/db/auth.ts", {
    "./prisma": { prisma }, "./json": json,
    "./session": { readSessionToken: callerId, validateSession: (id) => prisma.user.findUnique({ where: { id } }) },
    "@/lib/cbt/ujian-scope": scope, "./seed-shared.mjs": {},
    "@/lib/cbt/hash": {}, "./id.server": {},
  });
  const audit = load("src/lib/server/db/audit.ts", { "./prisma": { prisma } });
  const types = load("src/lib/cbt/types.ts");
  const mappers = load("src/lib/server/repos/mappers.ts", {
    "@/lib/server/db/prisma": { prisma }, "@/lib/server/db/json": json,
  });
  return { auth, audit, types, mappers, json, scope };
}
