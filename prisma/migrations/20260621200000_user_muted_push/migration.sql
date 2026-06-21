-- Per-user push category opt-outs.
ALTER TABLE "User" ADD COLUMN "mutedPush" TEXT[] DEFAULT ARRAY[]::TEXT[];
