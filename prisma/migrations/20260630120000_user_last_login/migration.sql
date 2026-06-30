-- Add lastLoginAt to User for login-activity tracking
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
