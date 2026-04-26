-- Add faviconUrl to CenterSiteConfig for per-tenant favicon support
ALTER TABLE "CenterSiteConfig" ADD COLUMN "faviconUrl" TEXT;
