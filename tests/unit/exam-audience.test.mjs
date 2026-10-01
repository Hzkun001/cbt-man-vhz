import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { getExamAudienceMode } from "../../src/lib/cbt/exam-audience.ts";

const source = readFileSync(new URL("../../src/lib/server/ujian/functions.ts", import.meta.url), "utf8");
const body = source.slice(source.indexOf("async function validateExamAudience("), source.indexOf("async function getPublishError("));
const compiled = ts.transpile(body, { target: ts.ScriptTarget.ES2022 });
const validate = new Function("getExamAudienceMode", "prisma", `${compiled}; return validateExamAudience;`)(getExamAudienceMode, {});
const unit = (id, tipe) => ({ id, tipe });
const db = (units) => ({ unitAkademik: { findMany: async ({ where }) => units.filter((u) => where.id.in.includes(u.id)) } });

test("mode kelas accepts multiple classes", async () => {
  const units = [unit("a", "kelas"), unit("b", "kelas")];
  assert.equal(getExamAudienceMode(units), "kelas");
  await validate({ groupIds: ["a", "b"] }, db(units));
});

test("mode jurusan accepts jurusan and prodi together", async () => {
  const units = [unit("a", "jurusan"), unit("b", "prodi")];
  assert.equal(getExamAudienceMode(units), "jurusan");
  await validate({ groupIds: ["a", "b"] }, db(units));
});

test("server rejects a mixture of classes and departments", async () => {
  const units = [unit("a", "kelas"), unit("b", "jurusan")];
  assert.equal(getExamAudienceMode(units), null);
  await assert.rejects(validate({ groupIds: ["a", "b"] }, db(units)), /tidak boleh dicampur/);
});

test("server rejects faculty, semester, free category, and unknown IDs", async () => {
  for (const tipe of ["fakultas", "semester", "kategori_bebas"]) {
    await assert.rejects(validate({ groupIds: ["a"] }, db([unit("a", tipe)])), /tidak boleh dicampur/);
  }
  await assert.rejects(validate({ groupIds: ["missing"] }, db([])), /tidak boleh dicampur/);
});

test("empty groups remain valid for drafts and course membership", async () => {
  assert.equal(getExamAudienceMode([]), null);
  await validate({ groupIds: [] }, { unitAkademik: { findMany: () => assert.fail("Empty groups should not query units") } });
});

test("duplicate IDs do not create a second access mode", async () => {
  await validate({ groupIds: ["a", "a"] }, db([unit("a", "kelas")]));
});

test("malformed groups are rejected before querying", async () => {
  await assert.rejects(validate({ groupIds: null }, {}), /tidak valid/);
  await assert.rejects(validate({ groupIds: [42] }, {}), /tidak valid/);
});
