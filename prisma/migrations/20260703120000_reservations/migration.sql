-- CreateTable
CREATE TABLE "ReservationImport" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT,
    "rowCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL,
    "telephone" TEXT,
    "customerName" TEXT NOT NULL,
    "numberOfGuests" INTEGER NOT NULL,
    "assignedTables" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "hoursCategory" TEXT,
    "additionalRequest" TEXT,

    CONSTRAINT "ReservationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationImport_locationId_businessDate_key" ON "ReservationImport"("locationId", "businessDate");

-- CreateIndex
CREATE INDEX "ReservationImport_locationId_businessDate_idx" ON "ReservationImport"("locationId", "businessDate");

-- CreateIndex
CREATE INDEX "ReservationRecord_importId_idx" ON "ReservationRecord"("importId");

-- AddForeignKey
ALTER TABLE "ReservationImport" ADD CONSTRAINT "ReservationImport_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationImport" ADD CONSTRAINT "ReservationImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationRecord" ADD CONSTRAINT "ReservationRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ReservationImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
