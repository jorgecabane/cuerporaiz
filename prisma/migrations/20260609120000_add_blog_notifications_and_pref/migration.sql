-- AlterTable: nuevo switch de preferencia para nuevas entradas del blog
ALTER TABLE "EmailPreference" ADD COLUMN     "blogPublished" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: dedup de notificaciones de blog (un registro por post de Sanity notificado)
CREATE TABLE "BlogPostNotification" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPostNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostNotification_postId_key" ON "BlogPostNotification"("postId");

-- CreateIndex
CREATE INDEX "BlogPostNotification_centerId_idx" ON "BlogPostNotification"("centerId");
