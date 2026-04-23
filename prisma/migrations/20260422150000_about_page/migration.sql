-- CreateEnum
CREATE TYPE "AboutImageCategory" AS ENUM ('RETIROS', 'CLASES', 'ESPACIO');

-- CreateTable
CREATE TABLE "CenterAboutPage" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "showInHeader" BOOLEAN NOT NULL DEFAULT false,
    "headerLabel" TEXT NOT NULL DEFAULT 'Sobre mí',
    "pageTitle" TEXT NOT NULL DEFAULT 'Sobre mí',
    "pageEyebrow" TEXT,
    "name" TEXT,
    "tagline" TEXT,
    "heroImageUrl" TEXT,
    "bio" TEXT,
    "propuesta" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Agenda tu primera clase',
    "ctaHref" TEXT NOT NULL DEFAULT '/#agenda',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterAboutPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterAboutPageImage" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "category" "AboutImageCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterAboutPageImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CenterAboutPage_centerId_key" ON "CenterAboutPage"("centerId");

-- CreateIndex
CREATE INDEX "CenterAboutPageImage_pageId_category_sortOrder_idx" ON "CenterAboutPageImage"("pageId", "category", "sortOrder");

-- AddForeignKey
ALTER TABLE "CenterAboutPage" ADD CONSTRAINT "CenterAboutPage_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterAboutPageImage" ADD CONSTRAINT "CenterAboutPageImage_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CenterAboutPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
