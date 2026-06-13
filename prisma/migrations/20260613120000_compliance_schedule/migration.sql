-- CreateEnum
CREATE TYPE "ComplianceCategory" AS ENUM ('PEST_CONTROL', 'GREASE_TRAP', 'HOOD_CLEANING', 'FIRE_SAFETY', 'HVAC', 'EQUIPMENT', 'SANITATION', 'LICENSE_PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplianceInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMPLIANCE_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'COMPLIANCE_OVERDUE';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "complianceScheduleId" TEXT;

-- CreateTable
CREATE TABLE "ComplianceSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ComplianceCategory" NOT NULL DEFAULT 'OTHER',
    "interval" "ComplianceInterval" NOT NULL DEFAULT 'QUARTERLY',
    "locationId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "vendor" TEXT,
    "vendorContact" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'HIGH',
    "estimatedCost" DOUBLE PRECISION,
    "lastCost" DOUBLE PRECISION,
    "notes" TEXT,
    "lastServiceDate" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "remindersSent" JSONB NOT NULL DEFAULT '[]',
    "lastOverdueAlert" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "currentTaskId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceSchedule_currentTaskId_key" ON "ComplianceSchedule"("currentTaskId");

-- CreateIndex
CREATE INDEX "ComplianceSchedule_locationId_active_idx" ON "ComplianceSchedule"("locationId", "active");

-- CreateIndex
CREATE INDEX "ComplianceSchedule_nextDueDate_idx" ON "ComplianceSchedule"("nextDueDate");

-- CreateIndex
CREATE INDEX "Task_complianceScheduleId_idx" ON "Task"("complianceScheduleId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_complianceScheduleId_fkey" FOREIGN KEY ("complianceScheduleId") REFERENCES "ComplianceSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSchedule" ADD CONSTRAINT "ComplianceSchedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSchedule" ADD CONSTRAINT "ComplianceSchedule_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSchedule" ADD CONSTRAINT "ComplianceSchedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSchedule" ADD CONSTRAINT "ComplianceSchedule_currentTaskId_fkey" FOREIGN KEY ("currentTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
