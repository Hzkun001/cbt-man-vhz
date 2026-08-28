ALTER TABLE "Ujian" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';

-- Existing exams were already visible and executable before lifecycle states
-- existed. Preserve that behavior; newly created exams use the schema default.
UPDATE "Ujian" SET "status" = 'published' WHERE "status" = 'draft';
