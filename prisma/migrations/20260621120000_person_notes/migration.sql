-- CreateEnum: NoteColor
CREATE TYPE "NoteColor" AS ENUM ('YELLOW', 'PINK', 'GREEN', 'BLUE', 'PURPLE');

-- CreateTable: PersonNote
CREATE TABLE "PersonNote" (
    "id"        TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "title"     TEXT,
    "body"      TEXT NOT NULL,
    "color"     "NoteColor" NOT NULL DEFAULT 'YELLOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonNote_subjectId_createdAt_idx" ON "PersonNote"("subjectId", "createdAt");

ALTER TABLE "PersonNote" ADD CONSTRAINT "PersonNote_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PersonNote" ADD CONSTRAINT "PersonNote_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
