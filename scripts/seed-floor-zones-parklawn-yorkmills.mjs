// One-off, additive seed — Park Lawn and York Mills confirmed Floor Plan
// zones, from the provided seating charts. Safe to re-run — upserts on
// (locationId, name).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BRANCH_ZONES = [
  {
    locationName: "Park lawn",
    zones: [
      { name: "Round Tables", tableIds: ["1", "2", "3", "4a", "4b", "5a", "5b", "7a", "7b", "8a", "8b", "9", "10", "11", "12", "13", "14", "15", "16"], position: 1 },
      { name: "Booths", tableIds: ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10"], position: 2 },
    ],
  },
  {
    locationName: "YORK MILLS",
    zones: [
      { name: "Booths", tableIds: ["b21", "b22", "b23", "b24", "b25", "b26"], position: 1 },
      { name: "Bar", tableIds: ["B1", "B2", "B3", "B4", "B5", "B11", "B12", "B13", "B14"], position: 2 },
    ],
  },
];

async function main() {
  for (const branch of BRANCH_ZONES) {
    const loc = await prisma.location.findFirst({ where: { name: branch.locationName }, select: { id: true, name: true } });
    if (!loc) throw new Error(`${branch.locationName} location not found`);
    console.log("Seeding zones for", loc.name, loc.id);

    for (const z of branch.zones) {
      const row = await prisma.floorZone.upsert({
        where: { locationId_name: { locationId: loc.id, name: z.name } },
        update: { tableIds: z.tableIds, position: z.position },
        create: { locationId: loc.id, name: z.name, tableIds: z.tableIds, position: z.position },
      });
      console.log(`  ${row.name}: ${row.tableIds.join(", ")}`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
