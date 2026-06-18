-- CreateTable: MaintenanceComment
CREATE TABLE "MaintenanceComment" (
    "id"        TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaintenanceComment_requestId_createdAt_idx" ON "MaintenanceComment"("requestId", "createdAt");

ALTER TABLE "MaintenanceComment" ADD CONSTRAINT "MaintenanceComment_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "MaintenanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MaintenanceComment" ADD CONSTRAINT "MaintenanceComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
