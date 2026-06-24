import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

const VINCENT_ID = "cmql49svj0001kw046vqakazr";
const ADMIN_ID = "cmq8jcoyy0003l2045vyu6suw";
// Company-wide tasks pin to Head Office so the generator creates one task
// instead of fanning out to every location (a null locationId hits them all).
const HQ_ID = "cmq8rx9sh0000l104ivpmre50";

async function main() {
  // ── 1. Daily Checklist Templates ──
  const dailyTemplates = [
    {
      name: "Stores Overview",
      items: [
        "Check Sales figures",
        "Check Voids and discounts",
        "Review Google reviews",
        "Verify checklists completion",
        "Review Logbook entries",
      ],
    },
    {
      name: "Social Media Management",
      items: [
        "Repost Instagram stories",
        "Reply to comments",
        "Respond to DMs",
        "Reply to Emails",
      ],
    },
    {
      name: "Social Media Posting",
      items: ["Post Instagram Story", "Post to Feed (every 3 days)"],
    },
    {
      name: "System Monitoring",
      items: [
        "Check Snappy emergencies overview",
        "Provide assistance for any issues",
      ],
    },
  ];

  // ── 2. Weekly Store Visits (day-specific) ──
  // weekDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const storeVisits = [
    {
      name: "Store Visit - Monday",
      weekDay: 1,
      items: [
        "Walk through Danforth",
        "Walk through Parklawn",
        "Walk through Liberty",
        "Walk through York Mills",
        "Conduct store audit",
        "Coaching session",
      ],
    },
    {
      name: "Store Visit - Tuesday",
      weekDay: 2,
      items: [
        "Walk through Junction",
        "Walk through Parklawn",
        "Conduct store audit",
        "Coaching session",
      ],
    },
    {
      name: "Store Visit - Wednesday",
      weekDay: 3,
      items: [
        "Walk through Danforth",
        "Walk through Liberty",
        "Conduct store audit",
        "Coaching session",
      ],
    },
    {
      name: "Store Visit - Thursday",
      weekDay: 4,
      items: [
        "Walk through Junction",
        "Walk through Parklawn",
        "Walk through York Mills",
        "Conduct store audit",
        "Coaching session",
      ],
    },
    {
      name: "Store Visit - Friday",
      weekDay: 5,
      items: [
        "Walk through Mississauga",
        "Conduct store audit",
        "Coaching session",
      ],
    },
    {
      name: "Store Visit - Saturday",
      weekDay: 6,
      items: [
        "Walk through York Mills",
        "Conduct store audit",
        "Coaching session",
      ],
    },
  ];

  // ── 3. Weekly Templates ──
  const weeklyTemplates = [
    {
      name: "Briefing Pachara",
      weekDay: 1,
      dept: "Marketing",
      items: [
        "Brief social media content",
        "Brief A-Frame designs",
        "Brief Google posts",
        "Brief Flyers",
        "Brief Tent cards",
        "Brief Posters",
      ],
    },
    {
      name: "Marketing Review",
      weekDay: 2,
      dept: "Marketing",
      items: ["Review Marketing strategy", "Propose App boost plan"],
    },
    {
      name: "Influencer Management",
      weekDay: 3,
      dept: "Marketing",
      items: [
        "Coordinate Instagram influencers",
        "Coordinate Rednote influencers",
      ],
    },
    {
      name: "Product Distribution",
      weekDay: 2,
      dept: "Operations",
      items: ["Deliver Tres Leches batch 1", "Deliver Tres Leches batch 2"],
    },
    {
      name: "Supplier Relations",
      weekDay: 4,
      dept: "Operations",
      items: [
        "Check in with Nonna Lia",
        "Check in with D'AMO",
        "Check in with Bae Greens",
        "Check in with Paradise Fields",
        "Check in with KAF",
        "Check in with Donald",
      ],
    },
  ];

  // ── 4. Monthly Templates ──
  const monthlyTemplates = [
    {
      name: "Snappy Meeting",
      monthDay: 1,
      items: [
        "Review email campaigns",
        "Review SEO performance",
        "Review LV Google Ads",
      ],
    },
    {
      name: "System Updates",
      monthDay: 15,
      items: [
        "Follow up on open issues",
        "Update website content",
        "Send Google posts",
      ],
    },
  ];

  // ── Create all checklist templates ──
  let created = 0;

  for (const t of dailyTemplates) {
    const exists = await p.checklistTemplate.findFirst({
      where: { name: t.name, assigneeId: VINCENT_ID },
    });
    if (exists) {
      console.log("SKIP (exists):", t.name);
      continue;
    }
    await p.checklistTemplate.create({
      data: {
        name: t.name,
        frequency: "DAILY",
        items: t.items,
        locationId: HQ_ID,
        autoGenerateHour: 9,
        priority: "MEDIUM",
        department: "Operations",
        proofRequired: false,
        createdById: ADMIN_ID,
        assigneeId: VINCENT_ID,
      },
    });
    console.log("Created template:", t.name);
    created++;
  }

  for (const t of storeVisits) {
    const exists = await p.checklistTemplate.findFirst({
      where: { name: t.name, assigneeId: VINCENT_ID },
    });
    if (exists) {
      console.log("SKIP (exists):", t.name);
      continue;
    }
    await p.checklistTemplate.create({
      data: {
        name: t.name,
        frequency: "WEEKLY",
        items: t.items,
        locationId: HQ_ID,
        autoGenerateHour: 8,
        weekDay: t.weekDay,
        priority: "MEDIUM",
        department: "Operations",
        proofRequired: false,
        createdById: ADMIN_ID,
        assigneeId: VINCENT_ID,
      },
    });
    console.log("Created template:", t.name);
    created++;
  }

  for (const t of weeklyTemplates) {
    const exists = await p.checklistTemplate.findFirst({
      where: { name: t.name, assigneeId: VINCENT_ID },
    });
    if (exists) {
      console.log("SKIP (exists):", t.name);
      continue;
    }
    await p.checklistTemplate.create({
      data: {
        name: t.name,
        frequency: "WEEKLY",
        items: t.items,
        locationId: HQ_ID,
        autoGenerateHour: 9,
        weekDay: t.weekDay,
        priority: "MEDIUM",
        department: t.dept || "Marketing",
        proofRequired: false,
        createdById: ADMIN_ID,
        assigneeId: VINCENT_ID,
      },
    });
    console.log("Created template:", t.name);
    created++;
  }

  for (const t of monthlyTemplates) {
    const exists = await p.checklistTemplate.findFirst({
      where: { name: t.name, assigneeId: VINCENT_ID },
    });
    if (exists) {
      console.log("SKIP (exists):", t.name);
      continue;
    }
    await p.checklistTemplate.create({
      data: {
        name: t.name,
        frequency: "MONTHLY",
        items: t.items,
        locationId: HQ_ID,
        autoGenerateHour: 9,
        monthDay: t.monthDay,
        priority: "MEDIUM",
        department: "Marketing",
        proofRequired: false,
        createdById: ADMIN_ID,
        assigneeId: VINCENT_ID,
      },
    });
    console.log("Created template:", t.name);
    created++;
  }

  console.log("\nChecklist templates created:", created);

  // ── 5. One-time Tasks ──
  const oneTimeTasks = [
    {
      title: "MACHAN Launch",
      desc: "Prepare for MACHAN launch",
      priority: "HIGH",
    },
    {
      title: "Recruit Manager + 2 FOH for Parklawn",
      desc: "Hire 1 Manager and 2 FOH staff for Parklawn branch",
      priority: "HIGH",
    },
    {
      title: "Recruit Marketing Community Manager",
      desc: "Hire a Marketing Community Manager",
      priority: "HIGH",
    },
    {
      title: "Recruit Agency for Insta/TikTok",
      desc: "Hire an agency to manage Instagram and TikTok accounts",
      priority: "HIGH",
    },
    {
      title: "Launch Next Influencer Campaign",
      desc: "Release the next influencer campaign",
      priority: "MEDIUM",
    },
    {
      title: "Finalize Deal with ToDoToronto",
      desc: "Finalize partnership agreement with ToDoToronto",
      priority: "MEDIUM",
    },
    {
      title: "Cineplex Ad",
      desc: "Manage and set up Cineplex advertising",
      priority: "MEDIUM",
    },
    {
      title: "Content Calendar (July - August)",
      desc: "Create content calendar for July and August",
      priority: "MEDIUM",
    },
    {
      title: "BlogTo Article + Website Post",
      desc: "Manage BlogTo article and post to website",
      priority: "MEDIUM",
    },
    {
      title: "Print Materials for Junction Festival",
      desc: "Order print materials for Junction Festival and promote desserts across all branches",
      priority: "MEDIUM",
    },
    {
      title: "Summer Drinks + Happy Hour Menu",
      desc: "Update summer drinks and happy hour menu",
      priority: "MEDIUM",
    },
    {
      title: "Launch Portal System",
      desc: "Start using Portal system - launch and fill portal ASAP",
      priority: "MEDIUM",
    },
    {
      title: "Label Printer Setup",
      desc: "Prepare label printer for Danforth, Parklawn and Junction",
      priority: "MEDIUM",
    },
    {
      title: "T-shirts + Flyers for Rai",
      desc: "Prepare T-shirts and Flyers for Rai",
      priority: "LOW",
    },
    {
      title: "Merchandise + BC for Portal",
      desc: "Prepare merchandise and business cards for Portal",
      priority: "LOW",
    },
    {
      title: "Digital + Physical Gift Cards",
      desc: "Manage new digital GC and new physical GC",
      priority: "LOW",
    },
    {
      title: "Post Card SQ1 + Scratching Cards",
      desc: "Create post cards for SQ1 and scratching cards",
      priority: "LOW",
    },
    {
      title: "Patio Photo Shoot",
      desc: "Organize and manage patio photo shoot",
      priority: "LOW",
    },
  ];

  let tasksCreated = 0;
  for (const t of oneTimeTasks) {
    const exists = await p.task.findFirst({
      where: { title: t.title, assigneeId: VINCENT_ID, type: "ONE_OFF" },
    });
    if (exists) {
      console.log("SKIP (exists):", t.title);
      continue;
    }
    await p.task.create({
      data: {
        title: t.title,
        description: t.desc,
        type: "ONE_OFF",
        priority: t.priority,
        status: "PENDING",
        locationId: HQ_ID,
        assignerId: ADMIN_ID,
        assigneeId: VINCENT_ID,
      },
    });
    console.log("Created task:", t.title);
    tasksCreated++;
  }

  console.log("One-time tasks created:", tasksCreated);
  console.log("\nDone!");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
