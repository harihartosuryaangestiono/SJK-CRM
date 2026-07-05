-- AlterTable
ALTER TABLE "Affiliate" ADD COLUMN     "blacklistDate" TIMESTAMP(3),
ADD COLUMN     "blacklistNotes" TEXT,
ADD COLUMN     "blacklistReason" TEXT;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "sampleReceivedDate" TIMESTAMP(3),
ADD COLUMN     "sampleSentDate" TIMESTAMP(3),
ADD COLUMN     "sowStatus" TEXT NOT NULL DEFAULT 'In Progress',
ADD COLUMN     "uploadedVideoCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "videoLink1" TEXT,
ADD COLUMN     "videoLink2" TEXT,
ADD COLUMN     "videoLink3" TEXT;
