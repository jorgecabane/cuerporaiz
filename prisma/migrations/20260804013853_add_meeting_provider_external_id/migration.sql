-- AlterTable
ALTER TABLE "LiveClass" ADD COLUMN     "meetingExternalId" TEXT,
ADD COLUMN     "meetingProvider" TEXT;

-- AlterTable
ALTER TABLE "LiveClassSeries" ADD COLUMN     "meetingExternalId" TEXT,
ADD COLUMN     "meetingProvider" TEXT;
