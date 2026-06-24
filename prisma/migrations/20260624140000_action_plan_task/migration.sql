-- Editable task definitions for the Action Plan tracker.
CREATE TABLE "ActionPlanTask" (
    "id" TEXT NOT NULL,
    "tab" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "dueDay" INTEGER,
    "deadlineMode" TEXT,
    "mode" TEXT,
    "applicable" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionPlanTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActionPlanTask_taskKey_key" ON "ActionPlanTask"("taskKey");
