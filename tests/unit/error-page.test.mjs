import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(nodeEnv) {
  const source = readFileSync(new URL("../../src/lib/error-page.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    process: { env: { NODE_ENV: nodeEnv } },
  });
  return exports.renderErrorPage;
}

test("error page exposes escaped details in development", () => {
  const html = load("development")("Error: <script>alert(1)</script>");
  assert.match(html, /Detail error \(development\)/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test("error page hides internal details outside development", () => {
  const html = load("production")("private database path");
  assert.doesNotMatch(html, /Detail error/);
  assert.doesNotMatch(html, /private database path/);
});
