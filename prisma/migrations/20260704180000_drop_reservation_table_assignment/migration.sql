-- Reverting the manual table-assignment feature per user request — the
-- Reservation dashboard goes back to reading assignedTables straight from
-- the CSV. Drops the now-unused host-entered override column.
ALTER TABLE "ReservationRecord" DROP COLUMN "tableAssignment";
