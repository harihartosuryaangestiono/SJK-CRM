-- Replace curate TEXT with curated BOOLEAN (idempotent for DBs that already have curated)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Affiliate' AND column_name = 'curated'
  ) THEN
    ALTER TABLE "Affiliate" ADD COLUMN "curated" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Migrate legacy curate text values if column still exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Affiliate' AND column_name = 'curate'
  ) THEN
    UPDATE "Affiliate"
    SET "curated" = true
    WHERE LOWER(TRIM("curate")) IN ('sudah', 'yes', 'true', '1', 'sudah dikurasi', 'sudahdikurasi');

    ALTER TABLE "Affiliate" DROP COLUMN "curate";
  END IF;
END $$;

-- Migrate deprecated status to new flow
UPDATE "Affiliate" SET "status" = 'Sudah Dihubungi' WHERE "status" = 'Menunggu Balasan';
