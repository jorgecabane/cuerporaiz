-- CreateEnum
CREATE TYPE "OnDemandContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable: EmailPreference — add on-demand notification columns
ALTER TABLE "EmailPreference"
  ADD COLUMN "lessonUnlocked" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "quotaExhausted" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "newContent"     BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: OnDemandCategory
CREATE TABLE "OnDemandCategory" (
    "id"           TEXT NOT NULL,
    "centerId"     TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "thumbnailUrl" TEXT,
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "status"       "OnDemandContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnDemandCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OnDemandPractice
CREATE TABLE "OnDemandPractice" (
    "id"           TEXT NOT NULL,
    "categoryId"   TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "thumbnailUrl" TEXT,
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "status"       "OnDemandContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnDemandPractice_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OnDemandLesson
CREATE TABLE "OnDemandLesson" (
    "id"              TEXT NOT NULL,
    "practiceId"      TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "description"     TEXT,
    "videoUrl"        TEXT NOT NULL,
    "promoVideoUrl"   TEXT,
    "thumbnailUrl"    TEXT,
    "durationMinutes" INTEGER,
    "level"           TEXT,
    "intensity"       TEXT,
    "targetAudience"  TEXT,
    "equipment"       TEXT,
    "tags"            TEXT,
    "sortOrder"       INTEGER NOT NULL DEFAULT 0,
    "status"          "OnDemandContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnDemandLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PlanCategoryQuota
CREATE TABLE "PlanCategoryQuota" (
    "id"         TEXT NOT NULL,
    "planId"     TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "maxLessons" INTEGER NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCategoryQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LessonUnlock
CREATE TABLE "LessonUnlock" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "lessonId"   TEXT NOT NULL,
    "userPlanId" TEXT NOT NULL,
    "centerId"   TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnDemandCategory_centerId_idx" ON "OnDemandCategory"("centerId");
CREATE INDEX "OnDemandCategory_centerId_status_idx" ON "OnDemandCategory"("centerId", "status");
CREATE UNIQUE INDEX "OnDemandCategory_centerId_name_key" ON "OnDemandCategory"("centerId", "name");

-- CreateIndex
CREATE INDEX "OnDemandPractice_categoryId_idx" ON "OnDemandPractice"("categoryId");
CREATE UNIQUE INDEX "OnDemandPractice_categoryId_name_key" ON "OnDemandPractice"("categoryId", "name");

-- CreateIndex
CREATE INDEX "OnDemandLesson_practiceId_idx" ON "OnDemandLesson"("practiceId");
CREATE INDEX "OnDemandLesson_practiceId_status_idx" ON "OnDemandLesson"("practiceId", "status");

-- CreateIndex
CREATE INDEX "PlanCategoryQuota_planId_idx" ON "PlanCategoryQuota"("planId");
CREATE INDEX "PlanCategoryQuota_categoryId_idx" ON "PlanCategoryQuota"("categoryId");
CREATE UNIQUE INDEX "PlanCategoryQuota_planId_categoryId_key" ON "PlanCategoryQuota"("planId", "categoryId");

-- CreateIndex
CREATE INDEX "LessonUnlock_userId_idx" ON "LessonUnlock"("userId");
CREATE INDEX "LessonUnlock_userPlanId_idx" ON "LessonUnlock"("userPlanId");
CREATE INDEX "LessonUnlock_centerId_idx" ON "LessonUnlock"("centerId");
CREATE UNIQUE INDEX "LessonUnlock_userId_lessonId_key" ON "LessonUnlock"("userId", "lessonId");

-- AddForeignKey: OnDemandCategory → Center
ALTER TABLE "OnDemandCategory"
  ADD CONSTRAINT "OnDemandCategory_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: OnDemandPractice → OnDemandCategory
ALTER TABLE "OnDemandPractice"
  ADD CONSTRAINT "OnDemandPractice_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "OnDemandCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: OnDemandLesson → OnDemandPractice
ALTER TABLE "OnDemandLesson"
  ADD CONSTRAINT "OnDemandLesson_practiceId_fkey"
  FOREIGN KEY ("practiceId") REFERENCES "OnDemandPractice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PlanCategoryQuota → Plan
ALTER TABLE "PlanCategoryQuota"
  ADD CONSTRAINT "PlanCategoryQuota_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PlanCategoryQuota → OnDemandCategory
ALTER TABLE "PlanCategoryQuota"
  ADD CONSTRAINT "PlanCategoryQuota_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "OnDemandCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LessonUnlock → User
ALTER TABLE "LessonUnlock"
  ADD CONSTRAINT "LessonUnlock_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LessonUnlock → OnDemandLesson
ALTER TABLE "LessonUnlock"
  ADD CONSTRAINT "LessonUnlock_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "OnDemandLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LessonUnlock → UserPlan
ALTER TABLE "LessonUnlock"
  ADD CONSTRAINT "LessonUnlock_userPlanId_fkey"
  FOREIGN KEY ("userPlanId") REFERENCES "UserPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LessonUnlock → Center
ALTER TABLE "LessonUnlock"
  ADD CONSTRAINT "LessonUnlock_centerId_fkey"
  FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
