-- Blog settings for CenterSiteConfig
ALTER TABLE "CenterSiteConfig"
  ADD COLUMN "blogEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "blogLabel"   TEXT    NOT NULL DEFAULT 'Blog';
