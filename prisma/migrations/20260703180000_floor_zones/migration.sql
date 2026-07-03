-- CreateTable
CREATE TABLE "FloorZone" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tableIds" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FloorZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FloorZone_locationId_name_key" ON "FloorZone"("locationId", "name");

-- CreateIndex
CREATE INDEX "FloorZone_locationId_idx" ON "FloorZone"("locationId");

-- AddForeignKey
ALTER TABLE "FloorZone" ADD CONSTRAINT "FloorZone_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
