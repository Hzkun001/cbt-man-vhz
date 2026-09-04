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

test("tools and guide pages use full-width structured admin layouts", () => {
  const tools = read("src/routes/_authenticated/admin.tools.tsx");
  const guide = read("src/routes/_authenticated/admin.panduan.tsx");

  assert.match(tools, /<AdminPage className="mx-auto w-full max-w-\[1600px\] pb-12">/);
  assert.match(tools, /lg:grid-cols-\[minmax\(220px,0\.8fr\)_minmax\(0,2fr\)\]/);
  assert.match(guide, /<AdminPage className="mx-auto w-full max-w-\[1600px\] space-y-6 pb-12">/);
  assert.match(guide, /lg:grid-cols-\[16rem_minmax\(0,1fr\)\]/);
  assert.match(guide, /xl:grid-cols-\[16rem_minmax\(0,1fr\)_14rem\]/);
});

test("admin dashboard uses a Vercel-style full-width toolbar and searchable exam list", () => {
  const dashboard = read("src/routes/_authenticated/admin.index.tsx");

  assert.match(dashboard, /<div className="mx-auto w-full max-w-\[1600px\] space-y-6/);
  assert.match(dashboard, /placeholder="Cari ujian"/);
  assert.match(dashboard, /setSearch\(e\.target\.value\)/);
  assert.match(dashboard, /\.filter\(\(exam\) => exam\.nama\.toLowerCase\(\)\.includes\(search/);
  assert.match(dashboard, /bg-slate-950 p-5 text-white/);
});

test("course classes are nested under the academic structure navigation", () => {
  const admin = read("src/routes/_authenticated/admin.tsx");
  const academic = read("src/routes/_authenticated/admin.akademik.tsx");

  assert.doesNotMatch(admin, /to: "\/admin\/akademik\/kelas-mata-kuliah"/);
  assert.match(academic, /section: "Kelas Perkuliahan"[\s\S]*to: "\/admin\/akademik\/kelas-mata-kuliah"/);
});

test("creating a module creates a default topic and opens its question page", () => {
  const moduleRoute = read("src/routes/_authenticated/admin.modul.tsx");
  const questionRoute = read("src/routes/_authenticated/admin.topik.$id.soal.tsx");
  const importRoute = read("src/routes/_authenticated/admin.modul.import.tsx");

  assert.match(moduleRoute, /const topikId = uid\("t_"\)/);
  assert.match(moduleRoute, /topikRepo\.upsert\(\{ id: topikId, modulId, nama: "Umum" \}\)/);
  assert.match(moduleRoute, /modulRepo\.flush\(\)[\s\S]*topikRepo\.upsert[\s\S]*topikRepo\.flush\(\)/);
  assert.match(moduleRoute, /modulRepo\.upsert\(newModul\)[\s\S]*modulRepo\.flush\(\)[\s\S]*newTopik\.forEach[\s\S]*topikRepo\.flush\(\)[\s\S]*newSoal\.forEach[\s\S]*soalRepo\.flush\(\)/);
  assert.match(moduleRoute, /navigate\(\{ to: "\/admin\/topik\/\$id\/soal", params: \{ id: topikId \} \}\)/);
  assert.match(questionRoute, /to="\/admin\/modul\/import" search=\{\{ topikId \}\}[\s\S]*Import Excel/);
  assert.match(importRoute, /topikId: typeof search\.topikId === "string"/);
  assert.match(importRoute, /const result = await soalRepo\.flush\(\)/);
});

test("bank question deletion uses themed confirmation dialogs", () => {
  const moduleRoute = read("src/routes/_authenticated/admin.modul.tsx");
  const topicRoute = read("src/routes/_authenticated/admin.modul.$id.topik.tsx");
  const questionRoute = read("src/routes/_authenticated/admin.topik.$id.soal.tsx");

  assert.doesNotMatch(moduleRoute, /\bconfirm\(/);
  assert.doesNotMatch(topicRoute, /\bconfirm\(/);
  assert.doesNotMatch(questionRoute, /\bconfirm\(/);
  assert.match(questionRoute, /<ConfirmDialog[\s\S]*Hapus Soal/);
});

test("draft exams stay in preparation even when their schedule is active", () => {
  const route = read("src/routes/_authenticated/admin.ujian.tsx");

  assert.match(route, /u\.status === "draft" \|\| !u\.beginAt \|\| !u\.endAt/);
  assert.match(route, /u\.status === "published" && u\.beginAt && u\.endAt/);
  assert.match(route, /const status = u\.status === "draft" \|\| !u\.beginAt \|\| !u\.endAt \|\| u\.beginAt > now/);
  assert.match(route, /\? "persiapan"/);
});
