-- AlterTable: Attachment can now belong to a Project (project-level files) and
-- taskId becomes optional so an attachment is either task- or project-scoped.
ALTER TABLE "Attachment" ADD COLUMN     "name" TEXT,
ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "taskId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Attachment_projectId_idx" ON "Attachment"("projectId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
