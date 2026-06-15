-- AlterTable: a checklist template can carry a default assignee and a category
-- which are applied to every task it generates.
ALTER TABLE "ChecklistTemplate" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "ChecklistTemplate_assigneeId_idx" ON "ChecklistTemplate"("assigneeId");

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
