import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(rel) {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

test("exam list exposes class assignment and lifecycle status", () => {
  const route = read("src/routes/_authenticated/admin.ujian.tsx");
  assert.match(route, /penawaranRepo/);
  assert.match(route, /kelas\.pesertaIds\.length/);
  assert.match(route, /u\.status === "published"/);
});

test("unused broad exam-list server endpoint stays removed", () => {
  const server = read("src/lib/server/ujian/functions.ts");
  assert.doesNotMatch(server, /export const getUjiansList/);
});

test("class workflow refreshes authoritative core data and uses guarded membership updates", () => {
  const route = read("src/routes/_authenticated/admin.akademik.kelas-mata-kuliah.tsx");
  assert.match(route, /await hydrateRepos\(\)/);
  assert.match(route, /penawaranRepo\.updateMembership/);
  assert.doesNotMatch(route, /penawaranRepo\.(?:upsert|remove)/);
});

test("academic metadata is optional for question banks and exams", () => {
  const moduleRoute = read("src/routes/_authenticated/admin.modul.tsx");
  const examRoute = read("src/routes/_authenticated/admin.ujian.$id.tsx");

  assert.match(moduleRoute, /mataKuliahId: mkId === "none" \? undefined : mkId/);
  assert.match(moduleRoute, /Mata kuliah \(opsional\)/i);
  assert.doesNotMatch(moduleRoute, /Wajib memilih Mata Kuliah/);
  assert.match(examRoute, /Metadata akademik \(opsional\)/);
  assert.doesNotMatch(examRoute, /Wajib dipilih sebelum paket dipublikasikan/);
});

test("creating an exam opens its setup editor immediately", () => {
  const route = read("src/routes/_authenticated/admin.ujian.tsx");

  assert.match(route, /const result = await ujianRepo\.flush\(\)/);
  assert.match(route, /if \(!result\.ok\)/);
  assert.match(route, /navigate\(\{ to: "\/admin\/ujian\/\$id", params: \{ id: u\.id \} \}\)/);
});

test("secondary exam settings use native collapsed sections", () => {
  const route = read("src/routes/_authenticated/admin.ujian.$id.tsx");

  assert.match(
    route,
    /<details className="rounded-md border">[\s\S]*Metadata akademik \(opsional\)/,
  );
  assert.match(route, /<summary[^>]*>Pengaturan skoring<\/summary>/);
  assert.match(route, /<summary[^>]*>Alat bantu ujian<\/summary>/);
  assert.match(route, /<summary[^>]*>\s*Tampilan hasil & anti-cheat\s*<\/summary>/);
});

test("exam participant and question import pages use responsive content widths", () => {
  const participants = read("src/routes/_authenticated/admin.ujian.$id.peserta.tsx");
  const questionImport = read("src/routes/_authenticated/admin.modul.import.tsx");

  assert.match(participants, /max-w-6xl pb-12/);
  assert.match(participants, /overflow-x-auto/);
  assert.match(questionImport, /max-w-6xl pb-12/);
  assert.match(questionImport, /sm:grid-cols-3/);
  assert.match(questionImport, /min-w-\[840px\] w-full text-xs/);
});

test("exam participant and question import pages use the shared admin theme", () => {
  const participants = read("src/routes/_authenticated/admin.ujian.$id.peserta.tsx");
  const questionImport = read("src/routes/_authenticated/admin.modul.import.tsx");

  assert.match(participants, /AdminPageHeader/);
  assert.match(participants, /AdminPageContent/);
  assert.match(questionImport, /AdminPageHeader/);
  assert.match(questionImport, /AdminPageContent/);
  assert.doesNotMatch(questionImport, /text-indigo-|text-amber-|bg-indigo-|bg-amber-/);
});

test("exam participant and question import pages keep visible back navigation", () => {
  const participants = read("src/routes/_authenticated/admin.ujian.$id.peserta.tsx");
  const questionImport = read("src/routes/_authenticated/admin.modul.import.tsx");

  assert.match(participants, /to="\/admin\/ujian"[\s\S]*Kembali/);
  assert.match(questionImport, /to="\/admin\/modul"[\s\S]*Kembali/);
});

test("exam editor uses the shared header and aligned question-source controls", () => {
  const route = read("src/routes/_authenticated/admin.ujian.$id.tsx");

  assert.match(route, /<AdminPage className="mx-auto w-full max-w-\[1600px\] pb-12">/);
  assert.match(route, /<AdminPageHeader[\s\S]*Editor Paket Ujian/);
  assert.match(route, /sm:grid-cols-\[minmax\(0,1fr\)_8rem_auto_auto\]/);
  assert.match(route, /<ArrowLeft className="mr-1 h-4 w-4" \/>[\s\S]*Kembali/);
});

test("leaderboard pages use the full admin layout and scroll wide tables", () => {
  const index = read("src/routes/_authenticated/admin.leaderboard.index.tsx");
  const detail = read("src/routes/_authenticated/admin.leaderboard.$id.tsx");

  assert.match(index, /<AdminPage className="w-full pb-20">/);
  assert.doesNotMatch(index, /max-w-4xl/);
  assert.match(detail, /<AdminPage className="w-full pb-12">/);
  assert.match(detail, /<Card className="w-full">/);
  assert.match(detail, /overflow-x-auto/);
  assert.match(detail, /min-w-\[720px\] w-full/);
});

test("settings page keeps full width and balanced two-column sections", () => {
  const route = read("src/routes/_authenticated/admin.pengaturan.tsx");

  assert.match(route, /<AdminPage className="mx-auto w-full max-w-\[1600px\] pb-12">/);
  assert.match(route, /lg:grid-cols-\[minmax\(220px,0\.8fr\)_minmax\(0,2fr\)\]/);
  assert.match(route, /role="region" aria-labelledby="identitas-heading"/);
  assert.match(route, /role="region" aria-labelledby="tema-heading"[^>]*rounded-xl border/);
});
