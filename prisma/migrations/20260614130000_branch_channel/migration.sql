-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MENTION';

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "locationId" TEXT,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_locationId_createdAt_idx" ON "Message"("locationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
