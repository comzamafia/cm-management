-- Add page discriminator to support multiple plan pages (action-plan, marketing).
ALTER TABLE "ActionPlanTask" ADD COLUMN "page" TEXT NOT NULL DEFAULT 'action-plan';
ALTER TABLE "ActionPlanEntry" ADD COLUMN "page" TEXT NOT NULL DEFAULT 'action-plan';

-- Replace old unique constraint with page-aware one.
DROP INDEX IF EXISTS "ActionPlanEntry_period_key_key";
CREATE UNIQUE INDEX "ActionPlanEntry_page_period_key_key" ON "ActionPlanEntry"("page", "period", "key");

-- Replace old index with page-aware one.
DROP INDEX IF EXISTS "ActionPlanEntry_period_idx";
CREATE INDEX "ActionPlanEntry_page_period_idx" ON "ActionPlanEntry"("page", "period");
