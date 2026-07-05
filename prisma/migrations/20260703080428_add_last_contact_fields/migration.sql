-- AlterTable
ALTER TABLE "Affiliate" ADD COLUMN     "lastContactDate" TIMESTAMP(3),
ADD COLUMN     "lastFollowUpDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Affiliate_lastContactDate_idx" ON "Affiliate"("lastContactDate");

-- CreateIndex
CREATE INDEX "Affiliate_lastFollowUpDate_idx" ON "Affiliate"("lastFollowUpDate");
