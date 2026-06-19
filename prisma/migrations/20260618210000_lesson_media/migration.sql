-- Add media fields to Lesson
ALTER TABLE "Lesson" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Lesson" ADD COLUMN "fileUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
