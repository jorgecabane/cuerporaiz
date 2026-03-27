-- Add composite index on LessonUnlock for common query pattern (userId + centerId)
CREATE INDEX "LessonUnlock_userId_centerId_idx" ON "LessonUnlock"("userId", "centerId");

-- Add composite index on OnDemandPractice for filtering by category and status
CREATE INDEX "OnDemandPractice_categoryId_status_idx" ON "OnDemandPractice"("categoryId", "status");

-- Add composite index on UserPlan for active plan lookups by user, center, and status
CREATE INDEX "UserPlan_userId_centerId_status_idx" ON "UserPlan"("userId", "centerId", "status");
