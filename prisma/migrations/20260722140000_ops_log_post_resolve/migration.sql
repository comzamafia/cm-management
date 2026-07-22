-- AlterTable
ALTER TABLE "OpsLogPost" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "OpsLogPost" ADD COLUMN "resolvedById" TEXT;

-- CreateIndex (replaces the single-column follow-up index)
DROP INDEX IF EXISTS "OpsLogPost_aiFollowUpRequired_idx";
CREATE INDEX "OpsLogPost_aiFollowUpRequired_resolvedAt_idx" ON "OpsLogPost"("aiFollowUpRequired", "resolvedAt");
