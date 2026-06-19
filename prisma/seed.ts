import { PrismaClient, Role, Priority, ProjectStatus, TaskStatus, TaskType, AttachmentType, NotificationType, ComplianceCategory, ComplianceInterval, LessonType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Resetting data…");
  // Default password for all seeded users — change via People page after first login.
  const defaultHash = await bcrypt.hash("chiangmai2024", 12);
  // Order matters for FK constraints.
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.checklistGeneration.deleteMany();
  await prisma.taskCompletion.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.complianceSchedule.deleteMany();
  await prisma.category.deleteMany();
  await prisma.project.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();

  // --- Locations ---
  const downtown = await prisma.location.create({
    data: { name: "Downtown", address: "100 King St", region: "Central" },
  });
  const mississauga = await prisma.location.create({
    data: { name: "Mississauga", address: "55 Square One Dr", region: "West" },
  });
  const northYork = await prisma.location.create({
    data: { name: "North York", address: "12 Yonge Blvd", region: "North" },
  });

  // --- Users ---
  const owner = await prisma.user.create({
    data: { name: "Olivia Owner", email: "mrdamrongsakn.ca@gmail.com", role: Role.OWNER, phone: "555-0100", passwordHash: defaultHash },
  });
  const area = await prisma.user.create({
    data: { name: "Aaron Area", email: "area@cm.local", role: Role.AREA_MANAGER, phone: "555-0101", passwordHash: defaultHash },
  });
  const mgrDowntown = await prisma.user.create({
    data: { name: "Mia Manager", email: "mia@cm.local", role: Role.STORE_MANAGER, locationId: downtown.id, phone: "555-0102", passwordHash: defaultHash },
  });
  const mgrMiss = await prisma.user.create({
    data: { name: "Marco Manager", email: "marco@cm.local", role: Role.STORE_MANAGER, locationId: mississauga.id, phone: "555-0103", passwordHash: defaultHash },
  });
  const lead = await prisma.user.create({
    data: { name: "Liam Lead", email: "liam@cm.local", role: Role.SHIFT_LEAD, locationId: downtown.id, phone: "555-0104", passwordHash: defaultHash },
  });
  const emp1 = await prisma.user.create({
    data: { name: "Emma Employee", email: "emma@cm.local", role: Role.EMPLOYEE, locationId: downtown.id, phone: "555-0105", passwordHash: defaultHash },
  });
  const emp2 = await prisma.user.create({
    data: { name: "Noah Employee", email: "noah@cm.local", role: Role.EMPLOYEE, locationId: mississauga.id, phone: "555-0106", passwordHash: defaultHash },
  });
  const hire = await prisma.user.create({
    data: { name: "Nina NewHire", email: "nina@cm.local", role: Role.NEW_HIRE, locationId: downtown.id, phone: "555-0107", passwordHash: defaultHash },
  });

  // Assign location managers.
  await prisma.location.update({ where: { id: downtown.id }, data: { managerId: mgrDowntown.id } });
  await prisma.location.update({ where: { id: mississauga.id }, data: { managerId: mgrMiss.id } });

  // --- Tasks (one in each status, across locations) ---
  type Seed = {
    title: string;
    desc: string;
    status: TaskStatus;
    priority: Priority;
    locationId: string;
    assigneeId: string;
    assignerId: string;
    department: string;
    dueAt: Date | null;
    type: TaskType;
    proofRequired: boolean;
  };

  const seeds: Seed[] = [
    { title: "Opening checklist — front of house", desc: "Unlock, lights, POS, signage.", status: "VERIFIED", priority: "HIGH", locationId: downtown.id, assigneeId: emp1.id, assignerId: mgrDowntown.id, department: "Operations", dueAt: daysFromNow(-1), type: "RECURRING", proofRequired: false },
    { title: "Clean exhaust hood", desc: "Degrease and wipe the kitchen exhaust hood.", status: "OVERDUE", priority: "CRITICAL", locationId: mississauga.id, assigneeId: emp2.id, assignerId: mgrMiss.id, department: "Kitchen", dueAt: daysFromNow(-3), type: "RECURRING", proofRequired: true },
    { title: "Count fridge stock", desc: "Count cold-storage inventory and report shortages.", status: "DONE", priority: "MEDIUM", locationId: mississauga.id, assigneeId: emp2.id, assignerId: mgrMiss.id, department: "Inventory", dueAt: daysFromNow(0), type: "RECURRING", proofRequired: false },
    { title: "Restock napkins & cutlery", desc: "Refill all dining stations.", status: "IN_PROGRESS", priority: "LOW", locationId: downtown.id, assigneeId: emp1.id, assignerId: lead.id, department: "Front of House", dueAt: daysFromNow(0), type: "ONE_OFF", proofRequired: false },
    { title: "Sanitize restrooms", desc: "Full sanitation, photo proof required.", status: "PENDING", priority: "HIGH", locationId: downtown.id, assigneeId: emp1.id, assignerId: mgrDowntown.id, department: "Cleaning", dueAt: daysFromNow(1), type: "RECURRING", proofRequired: true },
    { title: "Fix flickering sign light", desc: "Report to maintenance and verify repair.", status: "PENDING", priority: "MEDIUM", locationId: northYork.id, assigneeId: "", assignerId: area.id, department: "Maintenance", dueAt: daysFromNow(2), type: "ONE_OFF", proofRequired: false },
    { title: "Onboarding: food safety video", desc: "Watch and acknowledge the food safety module.", status: "PENDING", priority: "MEDIUM", locationId: downtown.id, assigneeId: hire.id, assignerId: mgrDowntown.id, department: "Training", dueAt: daysFromNow(3), type: "ONE_OFF", proofRequired: false },
  ];

  for (const s of seeds) {
    const task = await prisma.task.create({
      data: {
        title: s.title,
        description: s.desc,
        type: s.type,
        priority: s.priority,
        locationId: s.locationId,
        assigneeId: s.assigneeId || null,
        assignerId: s.assignerId,
        department: s.department,
        dueAt: s.dueAt,
        status: s.status,
        proofRequired: s.proofRequired,
      },
    });

    await prisma.activityLog.create({
      data: { userId: s.assignerId, action: "task.created", entity: "Task", entityId: task.id, locationId: task.locationId, meta: { title: task.title } },
    });

    if (s.status === "DONE" || s.status === "VERIFIED") {
      const completion = await prisma.taskCompletion.create({
        data: {
          taskId: task.id,
          completedById: s.assigneeId || emp1.id,
          photoUrls: s.proofRequired ? ["https://placehold.co/600x400?text=Proof"] : [],
          locationStamp: s.locationId,
          ...(s.status === "VERIFIED"
            ? { verifiedById: s.assignerId, verifiedAt: daysFromNow(-1) }
            : {}),
        },
      });
      await prisma.activityLog.create({
        data: { userId: completion.completedById, action: "task.status_changed", entity: "Task", entityId: task.id, locationId: task.locationId, meta: { to: "DONE", title: task.title } },
      });
      if (s.status === "VERIFIED") {
        await prisma.activityLog.create({
          data: { userId: s.assignerId, action: "task.verified", entity: "Task", entityId: task.id, locationId: task.locationId, meta: { title: task.title } },
        });
      }
    }
  }

  // A sample SOP attachment.
  const sanitize = await prisma.task.findFirst({ where: { title: "Sanitize restrooms" } });
  if (sanitize) {
    await prisma.attachment.create({
      data: { taskId: sanitize.id, type: AttachmentType.SOP, url: "https://example.com/sop/restroom-sanitation.pdf" },
    });
  }

  // --- Projects (monday "Customer Projects" board) ---
  type ProjectSeed = {
    name: string;
    client: string;
    status: ProjectStatus;
    priority: Priority;
    color: string;
    locationId: string;
    ownerId: string;
    budget: number;
    startAt: Date;
    dueAt: Date;
  };
  const projectSeeds: ProjectSeed[] = [
    { name: "Patio Renovation",        client: "In-house",            status: "IN_PROGRESS", priority: "HIGH",     color: "#440E48", locationId: downtown.id,    ownerId: mgrDowntown.id, budget: 24000, startAt: daysFromNow(-14), dueAt: daysFromNow(20) },
    { name: "New POS Rollout",         client: "SquareTech",          status: "IN_PROGRESS", priority: "CRITICAL", color: "#F4A626", locationId: mississauga.id, ownerId: mgrMiss.id,     budget: 12500, startAt: daysFromNow(-7),  dueAt: daysFromNow(7)  },
    { name: "Summer Menu Launch",      client: "Marketing",           status: "NOT_STARTED", priority: "MEDIUM",   color: "#1DBA87", locationId: downtown.id,    ownerId: area.id,        budget: 8000,  startAt: daysFromNow(10),  dueAt: daysFromNow(45) },
    { name: "Loyalty App Integration", client: "Bloom Loyalty",       status: "ON_HOLD",     priority: "MEDIUM",   color: "#5B8DD9", locationId: northYork.id,   ownerId: area.id,        budget: 18000, startAt: daysFromNow(-30), dueAt: daysFromNow(-2) },
    { name: "Kitchen Equipment Upgrade", client: "ChefSupply Co.",    status: "COMPLETED",   priority: "HIGH",     color: "#9F4000", locationId: mississauga.id, ownerId: mgrMiss.id,     budget: 32000, startAt: daysFromNow(-60), dueAt: daysFromNow(-10) },
  ];

  let projPos = 0;
  for (const ps of projectSeeds) {
    const project = await prisma.project.create({
      data: {
        name: ps.name,
        client: ps.client,
        status: ps.status,
        priority: ps.priority,
        color: ps.color,
        locationId: ps.locationId,
        ownerId: ps.ownerId,
        budget: ps.budget,
        startAt: ps.startAt,
        dueAt: ps.dueAt,
        position: projPos++,
        createdById: owner.id,
      },
    });
    await prisma.activityLog.create({
      data: { userId: owner.id, action: "project.created", entity: "Project", entityId: project.id, locationId: project.locationId, meta: { name: project.name, client: project.client } },
    });

    // Give each project a couple of tasks so progress bars aren't empty.
    const taskStatuses: TaskStatus[] =
      ps.status === "COMPLETED" ? ["VERIFIED", "DONE", "DONE"]
      : ps.status === "IN_PROGRESS" ? ["DONE", "IN_PROGRESS", "PENDING"]
      : ["PENDING", "PENDING"];
    let i = 0;
    for (const st of taskStatuses) {
      await prisma.task.create({
        data: {
          title: `${ps.name} — milestone ${++i}`,
          description: `Work item for the ${ps.name} project.`,
          type: "ONE_OFF",
          priority: ps.priority,
          locationId: ps.locationId,
          assigneeId: ps.ownerId,
          assignerId: owner.id,
          department: "Projects",
          projectId: project.id,
          dueAt: daysFromNow(i * 5 - 5),
          status: st,
          proofRequired: false,
        },
      });
    }
  }

  // --- Compliance Schedules (recurring preventive maintenance) ---
  function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    const day = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + months, 1);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
    return d;
  }
  const INTERVAL_MONTHS: Record<ComplianceInterval, number> = {
    MONTHLY: 1, QUARTERLY: 3, SEMI_ANNUAL: 6, ANNUAL: 12,
  };
  type ComplianceSeed = {
    name: string; category: ComplianceCategory; interval: ComplianceInterval;
    locationId: string; assigneeId: string; vendor: string; vendorContact: string;
    priority: Priority; estimatedCost: number; lastServiceDaysAgo: number;
  };
  const complianceSeeds: ComplianceSeed[] = [
    { name: "Grease Trap Cleaning", category: "GREASE_TRAP", interval: "MONTHLY", locationId: mississauga.id, assigneeId: mgrMiss.id, vendor: "DrainPro Services", vendorContact: "416-555-0199", priority: "HIGH", estimatedCost: 250, lastServiceDaysAgo: 40 },
    { name: "Pest Control Visit", category: "PEST_CONTROL", interval: "QUARTERLY", locationId: downtown.id, assigneeId: mgrDowntown.id, vendor: "PestAway Co.", vendorContact: "pestaway@example.com", priority: "HIGH", estimatedCost: 180, lastServiceDaysAgo: 85 },
    { name: "Kitchen Hood Cleaning", category: "HOOD_CLEANING", interval: "SEMI_ANNUAL", locationId: downtown.id, assigneeId: lead.id, vendor: "HoodMasters", vendorContact: "647-555-0123", priority: "CRITICAL", estimatedCost: 600, lastServiceDaysAgo: 175 },
    { name: "Fire Extinguisher Inspection", category: "FIRE_SAFETY", interval: "ANNUAL", locationId: mississauga.id, assigneeId: mgrMiss.id, vendor: "SafeGuard Fire", vendorContact: "905-555-0150", priority: "CRITICAL", estimatedCost: 320, lastServiceDaysAgo: 360 },
  ];
  for (const cs of complianceSeeds) {
    const lastServiceDate = daysFromNow(-cs.lastServiceDaysAgo);
    const nextDueDate = addMonths(lastServiceDate, INTERVAL_MONTHS[cs.interval]);
    const schedule = await prisma.complianceSchedule.create({
      data: {
        name: cs.name, category: cs.category, interval: cs.interval,
        locationId: cs.locationId, assigneeId: cs.assigneeId,
        vendor: cs.vendor, vendorContact: cs.vendorContact,
        priority: cs.priority, estimatedCost: cs.estimatedCost,
        lastServiceDate, nextDueDate, createdById: owner.id,
      },
    });
    const task = await prisma.task.create({
      data: {
        title: `[${cs.category}] ${cs.name}`,
        description: `Recurring ${cs.interval.toLowerCase()} compliance service. Vendor: ${cs.vendor}.`,
        type: "RECURRING", priority: cs.priority, locationId: cs.locationId,
        assignerId: owner.id, assigneeId: cs.assigneeId, department: "Compliance",
        complianceScheduleId: schedule.id, dueAt: nextDueDate, proofRequired: false,
      },
    });
    await prisma.complianceSchedule.update({ where: { id: schedule.id }, data: { currentTaskId: task.id } });
    await prisma.activityLog.create({
      data: { userId: owner.id, action: "compliance.created", entity: "ComplianceSchedule", entityId: schedule.id, locationId: cs.locationId, meta: { name: cs.name } },
    });
  }

  // --- Checklist Templates ---
  await prisma.checklistTemplate.createMany({
    data: [
      {
        name: "Opening Duties",
        frequency: "DAILY",
        items: [
          "Unlock front door & disable alarm",
          "Turn on lights and HVAC",
          "Start POS system and verify printer",
          "Check refrigerator and freezer temperatures",
          "Restock condiments and napkins on tables",
          "Sweep and mop entrance area",
        ],
        locationId: null, // company-wide
        autoGenerateHour: 6,
        priority: "HIGH",
        department: "Operations",
        proofRequired: false,
        active: true,
        createdById: mgrDowntown.id,
      },
      {
        name: "Closing Duties",
        frequency: "DAILY",
        items: [
          "Turn off all kitchen equipment",
          "Clean and sanitize all prep surfaces",
          "Empty and clean grease traps",
          "Secure cash and close out POS",
          "Lock all doors and enable alarm",
        ],
        locationId: null,
        autoGenerateHour: 18,
        priority: "HIGH",
        department: "Operations",
        proofRequired: false,
        active: true,
        createdById: mgrDowntown.id,
      },
      {
        name: "Kitchen Deep Clean",
        frequency: "WEEKLY",
        weekDay: 1, // Monday
        items: [
          "Degrease exhaust hood and filters",
          "Clean oven interior and burner grates",
          "Scrub walk-in refrigerator shelves",
          "Descale coffee equipment",
          "Sanitize floor drains",
        ],
        locationId: null,
        autoGenerateHour: 7,
        priority: "CRITICAL",
        department: "Kitchen",
        proofRequired: true,
        active: true,
        createdById: mgrDowntown.id,
      },
      {
        name: "Monthly Stock Audit",
        frequency: "MONTHLY",
        monthDay: 1,
        items: [
          "Count dry goods inventory",
          "Count beverage inventory",
          "Count packaging supplies",
          "Reconcile against POS usage report",
          "Flag and dispose expired items",
        ],
        locationId: mississauga.id,
        autoGenerateHour: 8,
        priority: "MEDIUM",
        department: "Inventory",
        proofRequired: false,
        active: true,
        createdById: mgrMiss.id,
      },
    ],
  });

  // --- Sample notifications ---
  type NotifRow = {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    entityType: string;
    entityId: string | null;
    read: boolean;
  };

  const notifRows: NotifRow[] = [
    { userId: emp1.id, type: "TASK_ASSIGNED", title: "New task assigned to you", body: '"Sanitize restrooms" — due tomorrow.', entityType: "Task", entityId: null, read: false },
    { userId: emp2.id, type: "TASK_OVERDUE", title: "Your task is overdue", body: '"Clean exhaust hood" at Mississauga is past its due date.', entityType: "Task", entityId: null, read: false },
    { userId: mgrMiss.id, type: "ESCALATION", title: "Task overdue: Clean exhaust hood", body: '"Clean exhaust hood" at Mississauga passed its deadline (assigned to Noah Employee).', entityType: "Task", entityId: null, read: false },
    { userId: mgrDowntown.id, type: "CHECKLIST_GENERATED", title: "Checklist generated: Opening Duties", body: "6 task(s) created for Downtown.", entityType: "ChecklistTemplate", entityId: null, read: true },
    { userId: emp1.id, type: "TASK_NEAR_DUE", title: "Task due soon", body: '"Count fridge stock" at Downtown is due within 2 hours.', entityType: "Task", entityId: null, read: true },
  ];

  for (const n of notifRows) {
    await prisma.notification.create({ data: n });
  }

  // --- LMS Courses & Lessons ---
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();

  const courseFoodSafety = await prisma.course.create({
    data: {
      title: "Food Safety Fundamentals",
      description: "Essential food safety knowledge for all team members. Covers handling, storage, temperature control, and hygiene standards.",
      category: "SAFETY",
      createdById: owner.id,
      published: true,
      lessons: {
        create: [
          { title: "Introduction to Food Safety", type: LessonType.ARTICLE, position: 0, duration: 10, content: "Food safety is critical in our operations. Every team member must understand the basics of safe food handling to protect our customers and our business.\n\nKey areas we'll cover:\n• Personal hygiene standards\n• Temperature danger zones\n• Cross-contamination prevention\n• Cleaning and sanitization procedures\n• Allergen awareness" },
          { title: "Temperature Control & Danger Zone", type: LessonType.VIDEO, position: 1, duration: 15, contentUrl: "https://www.youtube.com/watch?v=example-temp", content: "The temperature danger zone is between 4°C and 60°C (40°F - 140°F). Food must not remain in this range for more than 2 hours.\n\nKey rules:\n• Keep cold food below 4°C\n• Keep hot food above 60°C\n• Reheat food to at least 74°C\n• Cool food from 60°C to 20°C within 2 hours" },
          { title: "Handwashing Protocol", type: LessonType.ARTICLE, position: 2, duration: 5, content: "Proper handwashing takes at least 20 seconds:\n\n1. Wet hands with warm running water\n2. Apply soap\n3. Scrub all surfaces including between fingers and under nails\n4. Rinse thoroughly\n5. Dry with single-use towel\n\nWash hands:\n• Before handling food\n• After touching raw meat\n• After using the restroom\n• After touching face/hair\n• After handling garbage" },
          { title: "Cross-Contamination Prevention", type: LessonType.DOCUMENT, position: 3, duration: 8, content: "Cross-contamination occurs when harmful bacteria transfer from one surface to another.\n\nPrevention measures:\n• Use separate cutting boards for raw meat and vegetables\n• Store raw meat on lower shelves\n• Use color-coded equipment\n• Clean and sanitize between tasks\n• Never use the same utensils for raw and cooked food" },
        ],
      },
    },
  });

  const courseServiceExcellence = await prisma.course.create({
    data: {
      title: "Service Excellence Standards",
      description: "Our approach to delivering exceptional guest experiences. From greeting to farewell, every interaction matters.",
      category: "SERVICE",
      createdById: mgrDowntown.id,
      published: true,
      lessons: {
        create: [
          { title: "The Guest Journey", type: LessonType.ARTICLE, position: 0, duration: 12, content: "Every guest interaction follows a journey:\n\n1. Welcome — Greet within 30 seconds of arrival\n2. Engage — Make eye contact, smile, use open body language\n3. Serve — Anticipate needs, be proactive\n4. Check — Follow up to ensure satisfaction\n5. Thank — Express genuine gratitude\n\nRemember: guests don't just come for the product — they come for the experience." },
          { title: "Handling Complaints", type: LessonType.ARTICLE, position: 1, duration: 10, content: "Use the LEARN method:\n\nL — Listen actively without interrupting\nE — Empathize with their frustration\nA — Apologize sincerely\nR — Resolve the issue promptly\nN — Notify a manager if needed\n\nNever argue, blame, or make excuses. Every complaint is an opportunity to create a loyal customer." },
          { title: "Upselling Techniques", type: LessonType.ARTICLE, position: 2, duration: 8, content: "Suggestive selling adds value for the guest and revenue for us:\n\n• Recommend add-ons that complement their order\n• Use descriptive, appetizing language\n• Time your suggestions appropriately\n• Accept 'no' gracefully — never be pushy\n• Know the menu inside out to make genuine recommendations" },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      title: "Opening & Closing SOPs",
      description: "Step-by-step procedures for daily opening and closing routines at each location.",
      category: "SOP",
      createdById: mgrDowntown.id,
      locationId: downtown.id,
      published: true,
      lessons: {
        create: [
          { title: "Morning Opening Checklist", type: LessonType.ARTICLE, position: 0, duration: 5, content: "Opening shift starts 30 minutes before doors open:\n\n1. Disarm security system\n2. Turn on all equipment and check temperatures\n3. Check prep list and begin prep work\n4. Verify cash drawer count\n5. Check staff schedule and assign stations\n6. Inspect dining area — tables clean, chairs aligned\n7. Check restrooms — stocked and clean\n8. Review daily specials and 86 list\n9. Brief staff on any updates\n10. Unlock doors at scheduled time" },
          { title: "Evening Closing Procedures", type: LessonType.ARTICLE, position: 1, duration: 5, content: "Closing shift responsibilities:\n\n1. Stop accepting new orders 15 min before close\n2. Begin breaking down stations\n3. Clean and sanitize all food-contact surfaces\n4. Properly store all food items\n5. Record end-of-day temperatures\n6. Count cash drawer, prepare deposit\n7. Take out garbage and recycling\n8. Mop floors, clean restrooms\n9. Check all equipment is off (except refrigeration)\n10. Set security system and lock up" },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      title: "Menu Knowledge: Products & Ingredients",
      description: "Comprehensive guide to our menu items, ingredients, allergens, and preparation methods.",
      category: "PRODUCT",
      createdById: owner.id,
      published: true,
      lessons: {
        create: [
          { title: "Core Menu Items", type: LessonType.ARTICLE, position: 0, duration: 15, content: "Every team member must know:\n\n• All menu items and their descriptions\n• Key ingredients in each dish\n• Common allergens present\n• Preparation time for each item\n• Recommended pairings and upsells\n• Items available for customization\n\nStudy the menu card provided at your station. You should be able to describe any item to a guest without hesitation." },
          { title: "Allergen Awareness", type: LessonType.ARTICLE, position: 1, duration: 10, content: "The major food allergens:\n\n1. Peanuts\n2. Tree nuts\n3. Milk/Dairy\n4. Eggs\n5. Wheat/Gluten\n6. Soy\n7. Fish\n8. Shellfish\n9. Sesame\n\nAlways ask guests about allergies. If unsure about an ingredient, CHECK — never guess. Cross-contact is as dangerous as cross-contamination for allergy sufferers." },
        ],
      },
    },
  });

  await prisma.course.create({
    data: {
      title: "Workplace Compliance & Policies",
      description: "Company policies, workplace safety, harassment prevention, and legal requirements.",
      category: "COMPLIANCE",
      createdById: owner.id,
      published: true,
      lessons: {
        create: [
          { title: "Code of Conduct", type: LessonType.ARTICLE, position: 0, duration: 10, content: "Our workplace standards:\n\n• Treat all colleagues and guests with respect\n• Arrive on time, in proper uniform\n• Follow all safety procedures\n• Report incidents and hazards immediately\n• Maintain confidentiality of business information\n• No personal phone use during shifts\n• Zero tolerance for harassment or discrimination\n\nViolations may result in disciplinary action up to and including termination." },
          { title: "Health & Safety Requirements", type: LessonType.DOCUMENT, position: 1, duration: 8, contentUrl: "https://example.com/health-safety-policy.pdf", content: "Key health & safety rules:\n\n• Report all injuries immediately\n• Know the location of first aid kits and fire extinguishers\n• Wear non-slip shoes at all times\n• Use proper lifting technique\n• Keep walkways clear\n• Know evacuation routes" },
        ],
      },
    },
  });

  void courseFoodSafety;
  void courseServiceExcellence;

  const counts = {
    locations: await prisma.location.count(),
    users: await prisma.user.count(),
    tasks: await prisma.task.count(),
    checklists: await prisma.checklistTemplate.count(),
    notifications: await prisma.notification.count(),
    logs: await prisma.activityLog.count(),
    courses: await prisma.course.count(),
    lessons: await prisma.lesson.count(),
  };
  console.log("Seed complete:", counts);
  void owner;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
