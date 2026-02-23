-- CreateTable
CREATE TABLE "BehavioralImpactLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "logDate" TIMESTAMP(3) NOT NULL,
  "overtradingStatus" TEXT NOT NULL,
  "intensityLevel" TEXT NOT NULL,
  "behavioralScoreImpact" INTEGER NOT NULL,
  "flags" JSONB NOT NULL,
  "suggestion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BehavioralImpactLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BehavioralImpactLog_userId_logDate_key" ON "BehavioralImpactLog"("userId", "logDate");

-- CreateIndex
CREATE INDEX "BehavioralImpactLog_userId_logDate_idx" ON "BehavioralImpactLog"("userId", "logDate");

-- AddForeignKey
ALTER TABLE "BehavioralImpactLog" ADD CONSTRAINT "BehavioralImpactLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
