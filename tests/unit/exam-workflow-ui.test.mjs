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

test("file drive exposes jurusan buckets and date sorting", () => {
  const route = read("src/routes/_authenticated/admin.files.tsx");
  const filesServer = read("src/lib/server/files/functions.ts");
  assert.match(route, /Bucket penyimpanan/);
  assert.match(route, /Buat Bucket/);
  assert.match(route, /tipe: "kategori_bebas"/);
  assert.match(route, /u\.tipe === "jurusan" \|\| u\.tipe === "prodi"/);
  assert.match(route, /Paling baru/);
  assert.match(route, /Paling lama/);
  assert.match(route, /sortOrder === "newest"/);
  assert.match(route, /bucketCounts\[jurusan\.id\]/);
  assert.match(route, /putFile\(f, targetJurusan, targetBucketId\)/);
  assert.match(filesServer, /bucket\.tipe !== "kategori_bebas"/);
  assert.match(filesServer, /bucketId: data\.bucketId/);
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
