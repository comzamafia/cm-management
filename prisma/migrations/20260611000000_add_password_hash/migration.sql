-- AlterTable: add optional password hash for credential-based authentication
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
