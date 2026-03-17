-- CreateTable
CREATE TABLE "CenterZoomConfig" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterZoomConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterGoogleMeetConfig" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterGoogleMeetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CenterZoomConfig_centerId_key" ON "CenterZoomConfig"("centerId");

-- CreateIndex
CREATE UNIQUE INDEX "CenterGoogleMeetConfig_centerId_key" ON "CenterGoogleMeetConfig"("centerId");

-- AddForeignKey
ALTER TABLE "CenterZoomConfig" ADD CONSTRAINT "CenterZoomConfig_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CenterGoogleMeetConfig" ADD CONSTRAINT "CenterGoogleMeetConfig_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
