-- CreateTable
CREATE TABLE "CenterSiteConfig" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroImageUrl" TEXT,
    "logoUrl" TEXT,
    "colorPrimary" TEXT,
    "colorSecondary" TEXT,
    "colorAccent" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactAddress" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "whatsappUrl" TEXT,
    "youtubeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CenterSiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterSiteSection" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CenterSiteSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterSiteSectionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "userId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CenterSiteSectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CenterSiteConfig_centerId_key" ON "CenterSiteConfig"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "CenterSiteSection_centerId_sectionKey_key" ON "CenterSiteSection"("centerId", "sectionKey");

-- CreateIndex
CREATE INDEX "CenterSiteSection_centerId_idx" ON "CenterSiteSection"("centerId");

-- CreateIndex
CREATE INDEX "CenterSiteSectionItem_sectionId_idx" ON "CenterSiteSectionItem"("sectionId");

-- AddForeignKey
ALTER TABLE "CenterSiteConfig" ADD CONSTRAINT "CenterSiteConfig_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterSiteSection" ADD CONSTRAINT "CenterSiteSection_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterSiteSectionItem" ADD CONSTRAINT "CenterSiteSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "CenterSiteSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterSiteSectionItem" ADD CONSTRAINT "CenterSiteSectionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
