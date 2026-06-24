import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const HANG_ID = "cmqfi1g790001kw044jtels01";

// Hang's action plan now lives on the /action-plan tracker, so stop her seeded
// checklist templates from generating duplicate daily tasks. Reversible.
async function main() {
  const r = await p.checklistTemplate.updateMany({
    where: { assigneeId: HANG_ID, active: true },
    data: { active: false },
  });
  console.log("Deactivated Hang checklist templates:", r.count);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
