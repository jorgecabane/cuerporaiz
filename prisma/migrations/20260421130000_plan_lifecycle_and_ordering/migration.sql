-- AlterTable
ALTER TABLE "Plan"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isPopular"  BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Plan_centerId_archivedAt_idx" ON "Plan"("centerId", "archivedAt");
