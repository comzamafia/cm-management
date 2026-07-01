// One-off, additive seed for the Logbook feature — inserts sample LogEntry rows
// across real branches so /logbook has something to show. Does NOT delete or
// touch any existing data. Safe to re-run (creates new rows each time, so only
// run once unless you want duplicates).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOC = {
  headOffice: "cmq8rx9sh0000l104ivpmre50",
  liberty: "cmq9p0qtz0006l504fzlduxdx",
  mississauga: "cmq9ox2io0000lb04fm929spj",
  junction: "cmq9oyfd80003l504ljad5gkd",
  danforth: "cmq9ovrwt0000l5047kauyh81",
  parklawn: "cmq9p4mqp0009l504r1y0d9b0",
  yorkMills: "cmq9p5o0f000cl5049ghi17nt",
};

async function main() {
  const users = await prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } });
  const byName = Object.fromEntries(users.map((u) => [u.name, u.id]));
  const chef = byName["Chef Not"];
  const sujee = byName["Sujee"];
  const vincent = byName["Vincent"];
  const komal = byName["Komal"];

  const now = Date.now();
  const hoursAgo = (h) => new Date(now - h * 3600000);

  const entries = [
    {
      locationId: LOC.danforth, authorId: sujee, category: "OPERATIONS", department: "FOH",
      body: "Service flow: dish mix-up between lobster pineapple fried rice and shrimp basil fried rice.",
      itemTag: "Pineapple Fried Rice", createdAt: hoursAgo(20),
      aiRiskLevel: "MEDIUM", aiSummary: "Order mix-up caused a customer to be charged for the wrong dish.",
    },
    {
      locationId: LOC.danforth, authorId: sujee, category: "CUSTOMER_COMPLAINT", department: "FOH",
      body: "Customer received wrong dish and was charged for the mistake before manager caught it.",
      itemTag: null, createdAt: hoursAgo(19),
      aiRiskLevel: "MEDIUM", aiSummary: "Billing error on a wrong-dish complaint; needs refund + process fix.",
    },
    {
      locationId: LOC.mississauga, authorId: chef ?? sujee, category: "CUSTOMER_COMPLAINT", department: "BOH",
      body: "Guest with celiac disease said the gluten free roll still had regular tofu in it and had a reaction. Manager comped the meal and offered follow-up call.",
      itemTag: "Gluten Free Roll", createdAt: hoursAgo(15),
      aiRiskLevel: "HIGH", aiSummary: "Possible allergen cross-contamination served to a celiac guest — needs same-day follow-up.",
    },
    {
      locationId: LOC.mississauga, authorId: chef ?? sujee, category: "OPERATIONS", department: "BOH",
      body: "Tofu shortage for gluten free rolls noted during prep. Ordered more for tomorrow.",
      itemTag: "Tofu", createdAt: hoursAgo(14),
      aiRiskLevel: "LOW", aiSummary: "Routine inventory shortage, reorder already placed.",
    },
    {
      locationId: LOC.mississauga, authorId: chef ?? sujee, category: "CUSTOMER_COMPLAINT", department: "BOH",
      body: "Table said the pad kee mao was too spicy for the 'mild' spice level ordered. Remade with less chili, guest happy.",
      itemTag: "Pad Kee Mao", createdAt: hoursAgo(13),
      aiRiskLevel: "LOW", aiSummary: "Spice level miscommunication, resolved on the spot with a remake.",
    },
    {
      locationId: LOC.parklawn, authorId: komal ?? sujee, category: "OPERATIONS", department: "FOH",
      body: "10 tables, 43 guests, peak 7-9pm, reservations confirmed. Alma on the pass, Fiona on reservations, Serene on takeout.",
      itemTag: null, createdAt: hoursAgo(10),
      aiRiskLevel: "LOW", aiSummary: "Routine staffing and cover count for the evening shift.",
    },
    {
      locationId: LOC.parklawn, authorId: komal ?? sujee, category: "ACTION_NEEDED", department: "BOH",
      body: "Order 2 more cases of mango malibu from LCBO — ran low over the weekend.",
      itemTag: "Mango Malibu", createdAt: hoursAgo(9),
      aiRiskLevel: "LOW", aiSummary: "Routine reorder request for the bar.",
    },
    {
      locationId: LOC.yorkMills, authorId: vincent ?? sujee, category: "OPERATIONS", department: "BOH",
      body: "Bar fridge cleaned, liquor delivery received, catering order delivered on time. Cutlery/glasses/plates inventory completed.",
      itemTag: null, createdAt: hoursAgo(6),
      aiRiskLevel: "LOW", aiSummary: "Routine cleaning and inventory tasks completed, no issues.",
    },
    {
      locationId: LOC.junction, authorId: vincent ?? sujee, category: "CUSTOMER_COMPLAINT", department: "FOH",
      body: "Guest slipped near the entrance during the rain — no injury reported but floor mat was soaked through. Staff put out a wet floor sign after.",
      itemTag: null, createdAt: hoursAgo(3),
      aiRiskLevel: "HIGH", aiSummary: "Slip-and-fall near-miss with potential liability exposure — needs safety review of entrance mats.",
    },
    {
      locationId: LOC.liberty, authorId: sujee, category: "SALES_METRICS", department: "FOH",
      body: "Slower Tuesday night, moderate volume, staff maintained pace with no wait times.",
      itemTag: null, createdAt: hoursAgo(2),
      aiRiskLevel: "LOW", aiSummary: "Routine, unremarkable sales night.",
    },
  ];

  console.log(`Inserting ${entries.length} demo LogEntry rows...`);
  for (const e of entries) {
    const { aiRiskLevel, aiSummary, createdAt, ...rest } = e;
    const row = await prisma.logEntry.create({
      data: {
        ...rest,
        photoUrls: [],
        createdAt,
        aiRiskLevel,
        aiSummary,
        aiAnalyzedAt: createdAt,
      },
    });
    await prisma.activityLog.create({
      data: {
        userId: rest.authorId,
        action: "logbook.entry_created",
        entity: "LogEntry",
        entityId: row.id,
        locationId: rest.locationId,
        timestamp: createdAt,
        meta: { category: rest.category, department: rest.department, excerpt: rest.body.slice(0, 80) },
      },
    });
    if (aiRiskLevel === "HIGH") {
      await prisma.activityLog.create({
        data: {
          userId: rest.authorId,
          action: "logbook.entry_flagged_high_risk",
          entity: "LogEntry",
          entityId: row.id,
          locationId: rest.locationId,
          timestamp: createdAt,
          meta: { summary: aiSummary },
        },
      });
    }
  }

  // Resolve the older HIGH-risk one (celiac/allergen) so the queue also shows history,
  // leave the slip-and-fall one unresolved so the Attention Queue isn't empty.
  const toResolve = await prisma.logEntry.findFirst({
    where: { locationId: LOC.mississauga, aiRiskLevel: "HIGH" },
    orderBy: { createdAt: "asc" },
  });
  if (toResolve) {
    await prisma.logEntry.update({
      where: { id: toResolve.id },
      data: { resolvedById: sujee, resolvedAt: hoursAgo(12) },
    });
    await prisma.activityLog.create({
      data: {
        userId: sujee,
        action: "logbook.entry_resolved",
        entity: "LogEntry",
        entityId: toResolve.id,
        locationId: toResolve.locationId,
        timestamp: hoursAgo(12),
        meta: {},
      },
    });
    console.log("Resolved the Mississauga allergen entry as an example of a closed-out item.");
  }

  console.log("Done. The Junction slip-and-fall entry is left unresolved in the Attention Queue.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
