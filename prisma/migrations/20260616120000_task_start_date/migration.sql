-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_STARTING';

-- AlterTable: optional future start date + a flag so the start-day reminder fires once.
ALTER TABLE "Task" ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "startNotified" BOOLEAN NOT NULL DEFAULT false;
