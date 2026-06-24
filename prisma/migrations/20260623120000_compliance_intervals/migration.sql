-- Add day-based cadences to ComplianceInterval (Weekly / Bi-weekly / 8-weekly).
ALTER TYPE "ComplianceInterval" ADD VALUE IF NOT EXISTS 'WEEKLY';
ALTER TYPE "ComplianceInterval" ADD VALUE IF NOT EXISTS 'BIWEEKLY';
ALTER TYPE "ComplianceInterval" ADD VALUE IF NOT EXISTS 'BIMONTHLY';
