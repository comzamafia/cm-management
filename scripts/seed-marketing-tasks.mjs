import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const RESTAURANTS = ["Danforth", "IMM", "Junction", "Liberty", "Park Lawn", "SQ1", "YM"];
const PAGE = "marketing";

// All Vincent tasks from the Excel (daily + store visits + weekly + monthly + one-time).
const WEEKLY = [
  // Daily tasks (Mon-Fri)
  { taskKey: "mw1", name: "Stores Overview", category: "Operations", location: "All", days: [1,2,3,4,5] },
  { taskKey: "mw2", name: "Social Media Management", category: "Marketing", location: "All", days: [1,2,3,4,5] },
  { taskKey: "mw3", name: "Social Media Posting", category: "Marketing", location: "All", days: [1,2,3,4,5] },
  { taskKey: "mw4", name: "System Monitoring (Snappy)", category: "Operations", location: "All", days: [1,2,3,4,5] },
  // Day-specific store visits
  { taskKey: "mw5", name: "Store Visit — Danforth/Parklawn/Liberty/YM", category: "Store Visit", location: "All", days: [1] },
  { taskKey: "mw6", name: "Store Visit — Junction/Parklawn", category: "Store Visit", location: "All", days: [2] },
  { taskKey: "mw7", name: "Store Visit — Danforth/Liberty", category: "Store Visit", location: "All", days: [3] },
  { taskKey: "mw8", name: "Store Visit — Junction/Parklawn/YM", category: "Store Visit", location: "All", days: [4] },
  { taskKey: "mw9", name: "Store Visit — Mississauga", category: "Store Visit", location: "Mississauga", days: [5] },
  { taskKey: "mw10", name: "Store Visit — York Mills", category: "Store Visit", location: "YM", days: [6] },
  // Weekly recurring
  { taskKey: "mw11", name: "Briefing Pachara (Content)", category: "Marketing", location: "All", days: [1] },
  { taskKey: "mw12", name: "Marketing Review & App Boost", category: "Marketing", location: "All", days: [2] },
  { taskKey: "mw13", name: "Influencer Management (IG + Rednote)", category: "Marketing", location: "All", days: [3] },
  { taskKey: "mw14", name: "Product Distribution (Tres Leches)", category: "Operations", location: "All", days: [2, 4] },
  { taskKey: "mw15", name: "Supplier Relations", category: "Operations", location: "All", days: [4] },
];

const MONTHLY = [
  { taskKey: "mm1", name: "Snappy Meeting (SEO, Google Ads, Emailing)", dueDay: 1, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mm2", name: "System Updates (Website, Google Posts, Issues)", dueDay: 15, deadlineMode: "same", mode: "all", applicable: [] },
];

// One-time projects treated as monthly items (can check off when done)
const PROJECTS = [
  { taskKey: "mp1", name: "MACHAN Launch", dueDay: 1, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp2", name: "Recruit Manager + 2 FOH for Parklawn", dueDay: 1, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp3", name: "Recruit Marketing Community Manager", dueDay: 1, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp4", name: "Recruit Agency for Insta/TikTok", dueDay: 1, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp5", name: "Launch Next Influencer Campaign", dueDay: 8, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp6", name: "Finalize Deal with ToDoToronto", dueDay: 8, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp7", name: "Cineplex Ad", dueDay: 8, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp8", name: "Content Calendar (July - August)", dueDay: 15, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp9", name: "BlogTo Article + Website Post", dueDay: 15, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp10", name: "Print Materials for Junction Festival", dueDay: 15, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp11", name: "Summer Drinks + Happy Hour Menu", dueDay: 15, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp12", name: "Launch Portal System", dueDay: 20, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp13", name: "Label Printer Setup (Danforth/Parklawn/Junction)", dueDay: 20, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp14", name: "T-shirts + Flyers for Rai", dueDay: 25, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp15", name: "Merchandise + BC for Portal", dueDay: 25, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp16", name: "Digital + Physical Gift Cards", dueDay: 25, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp17", name: "Post Card SQ1 + Scratching Cards", dueDay: 25, deadlineMode: "same", mode: "all", applicable: [] },
  { taskKey: "mp18", name: "Patio Photo Shoot", dueDay: 28, deadlineMode: "same", mode: "all", applicable: [] },
];

// Key suppliers as "vendors"
const VENDORS = [
  "Nonna Lia", "D'AMO", "Bae Greens", "Paradise Fields", "KAF", "Donald",
];

async function main() {
  let created = 0;

  for (let i = 0; i < WEEKLY.length; i++) {
    const t = WEEKLY[i];
    const exists = await p.actionPlanTask.findUnique({ where: { taskKey: t.taskKey } });
    if (exists) { console.log("SKIP:", t.taskKey); continue; }
    await p.actionPlanTask.create({
      data: { page: PAGE, tab: "weekly", taskKey: t.taskKey, name: t.name, category: t.category, location: t.location, days: t.days, sortOrder: i },
    });
    console.log("Created weekly:", t.name);
    created++;
  }

  const allMonthly = [...MONTHLY, ...PROJECTS];
  for (let i = 0; i < allMonthly.length; i++) {
    const t = allMonthly[i];
    const exists = await p.actionPlanTask.findUnique({ where: { taskKey: t.taskKey } });
    if (exists) { console.log("SKIP:", t.taskKey); continue; }
    await p.actionPlanTask.create({
      data: { page: PAGE, tab: "monthly", taskKey: t.taskKey, name: t.name, dueDay: t.dueDay, deadlineMode: t.deadlineMode, mode: t.mode, applicable: t.applicable, sortOrder: i },
    });
    console.log("Created monthly:", t.name);
    created++;
  }

  for (let i = 0; i < VENDORS.length; i++) {
    const v = VENDORS[i];
    const key = `mv-${v}`;
    const exists = await p.actionPlanTask.findUnique({ where: { taskKey: key } });
    if (exists) { console.log("SKIP:", key); continue; }
    await p.actionPlanTask.create({
      data: { page: PAGE, tab: "vendor", taskKey: key, name: v, sortOrder: i },
    });
    console.log("Created vendor:", v);
    created++;
  }

  console.log("\nTotal created for marketing page:", created);
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
