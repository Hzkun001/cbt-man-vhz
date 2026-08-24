import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(rel) {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

test("exam lifecycle has additive draft/published persistence", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260823100000_add_ujian_lifecycle/migration.sql");
  const types = read("src/lib/cbt/types.ts");

  assert.match(schema, /enum StatusUjian \{[\s\S]*draft[\s\S]*published/);
  assert.match(schema, /status\s+StatusUjian\s+@default\(draft\)/);
  assert.match(migration, /ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft'/);
  assert.match(migration, /UPDATE "Ujian" SET "status" = 'published'/);
  assert.match(types, /StatusUjianEnum = z\.enum\(\["draft", "published"\]\)/);
});

test("only published exams with explicit groups enter the participant snapshot", () => {
  const snapshot = read("src/lib/server/repos/snapshot.ts");
  const start = snapshot.indexOf("export function pesertaSnapshot(");
  const end = snapshot.indexOf("export async function buildSnapshotForUser", start);
  const body = snapshot.slice(start, end);

  assert.match(body, /item\.status === "published"/);
  assert.match(body, /offering\?\.pesertaIds\.includes\(caller\.id\)/);
  assert.match(body, /soalSnapshot: \[\]/);
});

test("publish performs readiness checks before changing status", () => {
  const server = read("src/lib/server/ujian/functions.ts");
  assert.match(server, /action: z\.enum\(\["upsert", "remove", "bulkSet", "publish"\]\)/);
  assert.match(server, /if \(item\.topicSets\.length === 0\)/);
  assert.match(server, /if \(item\.groupIds\.length === 0 && parseJson/);
  assert.match(server, /if \(!item\.penawaranId\)/);
  assert.match(server, /if \(item\.beginAt === undefined \|\| item\.endAt === undefined\)/);
  assert.match(server, /topikMataKuliahId !== item\.mataKuliahId/);
  assert.match(server, /status: "published"/);
});

test("server refuses session creation for draft exams", () => {
  const server = read("src/lib/server/sesi/functions.ts");
  assert.match(server, /ujian\.status !== "published"/);
  assert.match(server, /sourceTopikIds\.has\(ts\.topikId\)/);
});

test("one participant can have only one session per exam", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260823104500_unique_exam_participant_session/migration.sql");
  const server = read("src/lib/server/sesi/functions.ts");
  assert.match(schema, /@@unique\(\[ujianId, pesertaId\]\)/);
  assert.match(migration, /CREATE UNIQUE INDEX/);
  assert.match(server, /ujianId_pesertaId/);
});

test("TokenClaim is the canonical token access check", () => {
  const session = read("src/lib/server/sesi/functions.ts");
  const participant = read("src/routes/_authenticated/peserta.ujian.$id.index.tsx");
  const migration = read("prisma/migrations/20260823104500_unique_exam_participant_session/migration.sql");
  assert.match(session, /prisma\.tokenClaim\.findUnique/);
  assert.doesNotMatch(session, /where: \{ ujianId: ujian\.id, dipakaiOleh: caller\.id \}/);
  assert.doesNotMatch(participant, /tokenRow\?\.dipakaiOleh/);
  assert.match(migration, /INSERT OR IGNORE INTO "TokenClaim"/);
});

test("session mutations use the existing session scope and restrict evaluators", () => {
  const server = read("src/lib/server/sesi/functions.ts");
  assert.match(server, /Evaluator hanya dapat memperbarui penilaian/);
  assert.match(server, /Sesi belum selesai untuk dievaluasi/);
  assert.match(server, /where: \{ id: String\(\(payload as SesiUjian\)\.id/);
});

test("domain migration has a read-only preflight", () => {
  const script = read("scripts/preflight-domain-migration.mjs");
  assert.match(script, /readyForDomainMigration/);
  assert.match(script, /module_without_course/);
  assert.match(script, /topic_without_course/);
  assert.match(script, /duplicate_session/);
  assert.match(script, /legacy_token_without_claim/);
  assert.doesNotMatch(script, /\.deleteMany\(/);
});

test("development and build refresh Prisma Client before starting", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.scripts.predev, "prisma generate");
  assert.equal(packageJson.scripts.prebuild, "prisma generate");
});

test("legacy module remediation is explicit and non-destructive by default", () => {
  const script = read("scripts/remediate-legacy-module-courses.mjs");
  assert.match(script, /process\.argv\.includes\("--apply"\)/);
  assert.match(script, /prisma\.modul\.update/);
  assert.doesNotMatch(script, /deleteMany/);
});

test("course offerings are additive and legacy exams receive a compatibility offering", () => {
  const schema = read("prisma/schema.prisma");
  const migration = read("prisma/migrations/20260824100000_add_penawaran_mata_kuliah/migration.sql");
  const types = read("src/lib/cbt/types.ts");
  assert.match(schema, /model PenawaranMataKuliah/);
  assert.match(schema, /penawaranId\s+String\?/);
  assert.match(migration, /CREATE TABLE "PenawaranMataKuliah"/);
  assert.match(migration, /po_legacy_/);
  assert.match(types, /penawaranId: z\.string\(\)\.optional\(\)/);
});

test("backup includes course classes and exams lock after a session exists", () => {
  const backup = read("src/lib/cbt/backup.ts");
  const server = read("src/lib/server/backup/functions.ts");
  const exam = read("src/lib/server/ujian/functions.ts");
  assert.match(backup, /penawaran: penawaranRepo\.all\(\)/);
  assert.match(server, /penawaranMataKuliah\.createMany/);
  assert.match(exam, /Paket tidak dapat diubah karena sudah memiliki sesi peserta/);
});

test("exam list exposes class assignment and lifecycle status", () => {
  const route = read("src/routes/_authenticated/admin.ujian.tsx");
  assert.match(route, /penawaranRepo/);
  assert.match(route, /kelas\.pesertaIds\.length/);
  assert.match(route, /u\.status === "published"/);
});
