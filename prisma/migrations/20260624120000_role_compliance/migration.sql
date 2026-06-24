-- Single-purpose compliance-support role (sees only the Compliance page).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COMPLIANCE';
