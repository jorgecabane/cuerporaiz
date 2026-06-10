-- Conserva la serie de origen cuando una instancia se desvincula al editar
-- "solo esta clase" (seriesId pasa a null). Permite avisar al admin, cuando
-- edita la serie completa, que existen clases sueltas que no se verán afectadas.

-- AlterTable
ALTER TABLE "LiveClass" ADD COLUMN "detachedFromSeriesId" TEXT;

-- CreateIndex
CREATE INDEX "LiveClass_detachedFromSeriesId_idx" ON "LiveClass"("detachedFromSeriesId");
