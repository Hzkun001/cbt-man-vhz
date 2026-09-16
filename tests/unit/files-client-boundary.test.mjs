import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../../src/lib/server/files/functions.ts", import.meta.url), "utf8");

test("file path resolution defers process.cwd until the server function runs", () => {
  assert.match(source, /const uploadsDir = \["data", "uploads"\] as const;/);
  assert.doesNotMatch(source, /const uploadsDir = \[process\.cwd\(\)/);
  assert.match(source, /async function resolveUploadsDir\(\)[\s\S]*return resolve\(process\.cwd\(\), \.\.\.uploadsDir\)/);
});
