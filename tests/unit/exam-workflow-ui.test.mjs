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
