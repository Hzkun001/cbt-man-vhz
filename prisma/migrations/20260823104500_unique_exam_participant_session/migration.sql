-- Preflight: this index intentionally fails if an existing database contains
-- duplicate sessions for the same exam and participant. Do not delete history
-- automatically; resolve duplicates explicitly before deploying this migration.
CREATE UNIQUE INDEX "SesiUjian_ujianId_pesertaId_key" ON "SesiUjian"("ujianId", "pesertaId");

-- Backfill the canonical claim table from the legacy single-user marker.
INSERT OR IGNORE INTO "TokenClaim" ("id", "ujianId", "pesertaId", "kode", "claimedAt")
SELECT 'tc_legacy_' || "id", "ujianId", "dipakaiOleh", "kode", COALESCE("dipakaiAt", 0)
FROM "TokenUjian"
WHERE "dipakaiOleh" IS NOT NULL;
