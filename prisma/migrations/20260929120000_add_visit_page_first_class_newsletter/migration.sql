-- AlterTable
ALTER TABLE "CenterSiteConfig" ADD COLUMN     "firstClassInfo" TEXT,
ADD COLUMN     "visitVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visitTitle" TEXT,
ADD COLUMN     "visitIntro" TEXT,
ADD COLUMN     "visitHeroImageUrl" TEXT,
ADD COLUMN     "visitVideoUrl" TEXT,
ADD COLUMN     "visitParking" TEXT,
ADD COLUMN     "visitTransit" TEXT;

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_centerId_idx" ON "NewsletterSubscriber"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_centerId_email_key" ON "NewsletterSubscriber"("centerId", "email");

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
