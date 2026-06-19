-- CreateEnum: LessonType
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'ARTICLE', 'DOCUMENT', 'LINK');

-- CreateTable: Course
CREATE TABLE "Course" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "category"    "TrainingCategory" NOT NULL,
    "thumbnail"   TEXT,
    "locationId"  TEXT,
    "published"   BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Lesson
CREATE TABLE "Lesson" (
    "id"         TEXT NOT NULL,
    "courseId"    TEXT NOT NULL,
    "title"      TEXT NOT NULL,
    "content"    TEXT,
    "contentUrl" TEXT,
    "type"       "LessonType" NOT NULL DEFAULT 'ARTICLE',
    "duration"   INTEGER,
    "position"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Course_locationId_category_idx" ON "Course"("locationId", "category");
CREATE INDEX "Lesson_courseId_position_idx" ON "Lesson"("courseId", "position");

ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Course" ADD CONSTRAINT "Course_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
