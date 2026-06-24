-- Area Manager Action Plan tracker: flat key/value store per (period, key).
CREATE TABLE "ActionPlanEntry" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActionPlanEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActionPlanEntry_period_key_key" ON "ActionPlanEntry"("period", "key");
CREATE INDEX "ActionPlanEntry_period_idx" ON "ActionPlanEntry"("period");
