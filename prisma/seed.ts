import { PrismaClient, Role, Priority, ProjectStatus, TaskStatus, TaskType, AttachmentType, NotificationType } from "@prisma/client";
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

  const counts = {
    locations: await prisma.location.count(),
    users: await prisma.user.count(),
    tasks: await prisma.task.count(),
    checklists: await prisma.checklistTemplate.count(),
    notifications: await prisma.notification.count(),
    logs: await prisma.activityLog.count(),
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
