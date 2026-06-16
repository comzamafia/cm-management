-- CreateTable
CREATE TABLE "ServerPerformance" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "covers" INTEGER NOT NULL DEFAULT 0,
    "tips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upsells" INTEGER NOT NULL DEFAULT 0,
    "reviewScore" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'api',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerPerformance_locationId_date_idx" ON "ServerPerformance"("locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ServerPerformance_serverId_locationId_date_key" ON "ServerPerformance"("serverId", "locationId", "date");

-- AddForeignKey
ALTER TABLE "ServerPerformance" ADD CONSTRAINT "ServerPerformance_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerPerformance" ADD CONSTRAINT "ServerPerformance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
