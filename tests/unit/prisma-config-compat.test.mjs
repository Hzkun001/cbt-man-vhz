import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { loadConfigFromFile } from "@prisma/config";

// Resolve through Prisma so this checks its dependency, not a separate copy.
const require = createRequire(import.meta.url);
const prismaRequire = createRequire(require.resolve("@prisma/config"));
const { deepmerge } = await import(pathToFileURL(prismaRequire.resolve("deepmerge-ts")).href);

test("Prisma's overridden merger handles circular graphs and ordinary config", () => {
  const left = { schema: "old.prisma", migrations: { path: "prisma/migrations" } };
  const right = { schema: "prisma/schema.prisma", migrations: { seed: "node prisma/seed.mjs" } };
  assert.deepEqual(deepmerge(left, right), {
    schema: right.schema,
    migrations: { path: left.migrations.path, seed: right.migrations.seed },
  });
  const a = {};
  const b = {};
  a.self = a;
  b.self = b;
  assert.doesNotThrow(() => deepmerge(a, b));
});

test("Prisma loads the repository config with the overridden merger", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const result = await loadConfigFromFile({ configRoot: root });
  assert.equal(result.error, undefined);
  assert.equal(result.config.schema, resolve(root, "prisma/schema.prisma"));
  assert.equal(result.config.migrations.path, resolve(root, "prisma/migrations"));
  assert.equal(result.config.migrations.seed, "node prisma/seed.mjs");
});
