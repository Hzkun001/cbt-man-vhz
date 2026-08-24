ALTER TABLE "Topik" ADD COLUMN "mataKuliahId" TEXT;

UPDATE "Topik"
SET "mataKuliahId" = (
  SELECT "mataKuliahId" FROM "Modul"
  WHERE "Modul"."id" = "Topik"."modulId"
)
WHERE "mataKuliahId" IS NULL;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Topik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modulId" TEXT NOT NULL,
    "mataKuliahId" TEXT,
    "nama" TEXT NOT NULL,
    CONSTRAINT "Topik_modulId_fkey" FOREIGN KEY ("modulId") REFERENCES "Modul" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Topik_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Topik" ("id", "mataKuliahId", "modulId", "nama") SELECT "id", "mataKuliahId", "modulId", "nama" FROM "Topik";
DROP TABLE "Topik";
ALTER TABLE "new_Topik" RENAME TO "Topik";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
