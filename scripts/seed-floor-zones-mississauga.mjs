// One-off, additive seed — Mississauga's confirmed Floor Plan zones (L Section,
// R Section, Tunnel). More zones (71-76, 81-82, 96-97, the 101-104 round
// tables) will be added later once confirmed. Safe to re-run — upserts on
// (locationId, name).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ZONES = [
  { name: "L Section", tableIds: ["L1", "L2", "L3", "L4", "L5", "L6", "L11", "L12", "L14", "L15"], position: 1 },
  { name: "R Section", tableIds: ["R1", "R2", "R3", "R4"], position: 2 },
  { name: "Tunnel", tableIds: ["83", "84", "85", "86", "87", "91", "92", "93", "94", "95"], position: 3 },
];

async function main() {
  const loc = await prisma.location.findFirst({ where: { name: "Mississauga" }, select: { id: true, name: true } });
  if (!loc) throw new Error("Mississauga location not found");
  console.log("Seeding zones for", loc.name, loc.id);

  for (const z of ZONES) {
    const row = await prisma.floorZone.upsert({
      where: { locationId_name: { locationId: loc.id, name: z.name } },
      update: { tableIds: z.tableIds, position: z.position },
      create: { locationId: loc.id, name: z.name, tableIds: z.tableIds, position: z.position },
    });
    console.log(`  ${row.name}: ${row.tableIds.join(", ")}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
