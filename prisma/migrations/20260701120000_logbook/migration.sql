-- CreateEnum
CREATE TYPE "LogDepartment" AS ENUM ('FOH', 'BOH');

-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('OPERATIONS', 'SALES_METRICS', 'CUSTOMER_COMPLAINT', 'ACTION_NEEDED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" "LogCategory" NOT NULL,
    "department" "LogDepartment" NOT NULL,
    "body" TEXT NOT NULL,
    "itemTag" TEXT,
    "photoUrls" JSONB NOT NULL DEFAULT '[]',
    "aiRiskLevel" "RiskLevel",
    "aiSummary" TEXT,
    "aiAnalyzedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogEntry_locationId_createdAt_idx" ON "LogEntry"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "LogEntry_locationId_category_createdAt_idx" ON "LogEntry"("locationId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "LogEntry_aiRiskLevel_resolvedAt_idx" ON "LogEntry"("aiRiskLevel", "resolvedAt");

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
