-- CreateTable: ComplianceComment
CREATE TABLE "ComplianceComment" (
    "id"         TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceComment_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "ComplianceComment_scheduleId_createdAt_idx" ON "ComplianceComment"("scheduleId", "createdAt");

-- Foreign keys
ALTER TABLE "ComplianceComment" ADD CONSTRAINT "ComplianceComment_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "ComplianceSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceComment" ADD CONSTRAINT "ComplianceComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
