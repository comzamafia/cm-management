-- CreateTable
CREATE TABLE "OpsLogPost" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "locationExtId" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "writerUserId" TEXT,
    "writerName" TEXT NOT NULL,
    "writerRole" TEXT,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "aiAnalyzed" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "aiKeywords" JSONB,
    "aiSeverity" TEXT,
    "aiSentiment" TEXT,
    "aiSentimentScore" INTEGER,
    "aiRiskScore" INTEGER,
    "aiDepartment" TEXT,
    "aiCategory" TEXT,
    "aiRootCause" TEXT,
    "aiRecommendedAction" TEXT,
    "aiFollowUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "aiRaw" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsLogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpsLogPost_externalId_key" ON "OpsLogPost"("externalId");

-- CreateIndex
CREATE INDEX "OpsLogPost_date_idx" ON "OpsLogPost"("date");

-- CreateIndex
CREATE INDEX "OpsLogPost_locationExtId_date_idx" ON "OpsLogPost"("locationExtId", "date");

-- CreateIndex
CREATE INDEX "OpsLogPost_aiFollowUpRequired_idx" ON "OpsLogPost"("aiFollowUpRequired");
