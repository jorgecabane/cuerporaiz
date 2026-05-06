-- AlterTable: 9 nuevos campos opcionales para copy editable del sitio
-- - blogHeroTitle, blogHeroSubtitle: ítem 5 (encabezado de /blog)
-- - headerNavLabel{HowItWorks, InPerson, Online, Contact}: ítem 6 (labels del header)
-- - libraryHeroTitle, libraryHeroDescription, libraryHeroImageUrl: ítem 8 (hero de biblioteca virtual)
ALTER TABLE "CenterSiteConfig"
  ADD COLUMN "blogHeroTitle"            TEXT,
  ADD COLUMN "blogHeroSubtitle"         TEXT,
  ADD COLUMN "headerNavLabelHowItWorks" TEXT,
  ADD COLUMN "headerNavLabelInPerson"   TEXT,
  ADD COLUMN "headerNavLabelOnline"     TEXT,
  ADD COLUMN "headerNavLabelContact"    TEXT,
  ADD COLUMN "libraryHeroTitle"         TEXT,
  ADD COLUMN "libraryHeroDescription"   TEXT,
  ADD COLUMN "libraryHeroImageUrl"      TEXT;
