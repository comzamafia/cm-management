-- CreateTable: NotificationSettings (singleton)
CREATE TABLE "NotificationSettings" (
    "id"                         TEXT NOT NULL DEFAULT 'default',
    "nearDueEnabled"             BOOLEAN NOT NULL DEFAULT true,
    "nearDueHours"               INTEGER NOT NULL DEFAULT 2,
    "complianceRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "complianceThresholds"       INTEGER[] DEFAULT ARRAY[14, 7, 3, 1]::INTEGER[],
    "pushEnabled"                BOOLEAN NOT NULL DEFAULT true,
    "updatedAt"                  TIMESTAMP(3) NOT NULL,
    "updatedById"                TEXT,
    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);
