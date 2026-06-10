import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role, Priority, TaskStatus, TaskType, AttachmentType, NotificationType } from "@prisma/client";

// GET /api/seed?secret=<SEED_SECRET>
// One-time endpoint to seed the production database. Disable after first use.

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Reset in FK-safe order
    await prisma.notification.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.checklistGeneration.deleteMany();
    await prisma.taskCompletion.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.checklistTemplate.deleteMany();
    await prisma.user.deleteMany();
    await prisma.location.deleteMany();

    // Locations
    const downtown = await prisma.location.create({
      data: { name: "Downtown", address: "100 King St", region: "Central" },
    });
    const mississauga = await prisma.location.create({
      data: { name: "Mississauga", address: "55 Square One Dr", region: "West" },
    });
    const northYork = await prisma.location.create({
      data: { name: "North York", address: "12 Yonge Blvd", region: "North" },
    });

    // Users
    const owner = await prisma.user.create({
      data: { name: "Olivia Owner", email: "mrdamrongsakn.ca@gmail.com", role: Role.OWNER, phone: "555-0100" },
    });
    const area = await prisma.user.create({
      data: { name: "Aaron Area", email: "area@cm.local", role: Role.AREA_MANAGER, phone: "555-0101" },
    });
    const mgrDowntown = await prisma.user.create({
      data: { name: "Mia Manager", email: "mia@cm.local", role: Role.STORE_MANAGER, locationId: downtown.id, phone: "555-0102" },
    });
    const mgrMiss = await prisma.user.create({
      data: { name: "Marco Manager", email: "marco@cm.local", role: Role.STORE_MANAGER, locationId: mississauga.id, phone: "555-0103" },
    });
    const lead = await prisma.user.create({
      data: { name: "Liam Lead", email: "liam@cm.local", role: Role.SHIFT_LEAD, locationId: downtown.id, phone: "555-0104" },
    });
    const emp1 = await prisma.user.create({
      data: { name: "Emma Employee", email: "emma@cm.local", role: Role.EMPLOYEE, locationId: downtown.id, phone: "555-0105" },
    });
    const emp2 = await prisma.user.create({
      data: { name: "Noah Employee", email: "noah@cm.local", role: Role.EMPLOYEE, locationId: mississauga.id, phone: "555-0106" },
    });
    const hire = await prisma.user.create({
      data: { name: "Nina NewHire", email: "nina@cm.local", role: Role.NEW_HIRE, locationId: downtown.id, phone: "555-0107" },
    });

    await prisma.location.update({ where: { id: downtown.id }, data: { managerId: mgrDowntown.id } });
    await prisma.location.update({ where: { id: mississauga.id }, data: { managerId: mgrMiss.id } });

    // Tasks
    type SeedTask = {
      title: string; desc: string; status: TaskStatus; priority: Priority;
      locationId: string; assigneeId: string; assignerId: string;
      department: string; dueAt: Date | null; type: TaskType; proofRequired: boolean;
    };

    const seeds: SeedTask[] = [
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
          title: s.title, description: s.desc, type: s.type, priority: s.priority,
          locationId: s.locationId, assigneeId: s.assigneeId || null,
          assignerId: s.assignerId, department: s.department,
          dueAt: s.dueAt, status: s.status, proofRequired: s.proofRequired,
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
            ...(s.status === "VERIFIED" ? { verifiedById: s.assignerId, verifiedAt: daysFromNow(-1) } : {}),
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

    const sanitize = await prisma.task.findFirst({ where: { title: "Sanitize restrooms" } });
    if (sanitize) {
      await prisma.attachment.create({
        data: { taskId: sanitize.id, type: AttachmentType.SOP, url: "https://example.com/sop/restroom-sanitation.pdf" },
      });
    }

    // Checklist templates
    await prisma.checklistTemplate.createMany({
      data: [
        { name: "Opening Duties", frequency: "DAILY", items: ["Unlock front door & disable alarm","Turn on lights and HVAC","Start POS system and verify printer","Check refrigerator and freezer temperatures","Restock condiments and napkins on tables","Sweep and mop entrance area"], locationId: null, autoGenerateHour: 6, priority: "HIGH", department: "Operations", proofRequired: false, active: true, createdById: mgrDowntown.id },
        { name: "Closing Duties", frequency: "DAILY", items: ["Turn off all kitchen equipment","Clean and sanitize all prep surfaces","Empty and clean grease traps","Secure cash and close out POS","Lock all doors and enable alarm"], locationId: null, autoGenerateHour: 18, priority: "HIGH", department: "Operations", proofRequired: false, active: true, createdById: mgrDowntown.id },
        { name: "Kitchen Deep Clean", frequency: "WEEKLY", weekDay: 1, items: ["Degrease exhaust hood and filters","Clean oven interior and burner grates","Scrub walk-in refrigerator shelves","Descale coffee equipment","Sanitize floor drains"], locationId: null, autoGenerateHour: 7, priority: "CRITICAL", department: "Kitchen", proofRequired: true, active: true, createdById: mgrDowntown.id },
        { name: "Monthly Stock Audit", frequency: "MONTHLY", monthDay: 1, items: ["Count dry goods inventory","Count beverage inventory","Count packaging supplies","Reconcile against POS usage report","Flag and dispose expired items"], locationId: mississauga.id, autoGenerateHour: 8, priority: "MEDIUM", department: "Inventory", proofRequired: false, active: true, createdById: mgrMiss.id },
      ],
    });

    // Notifications
    const notifRows = [
      { userId: emp1.id, type: NotificationType.TASK_ASSIGNED, title: "New task assigned to you", body: '"Sanitize restrooms" — due tomorrow.', entityType: "Task", entityId: null as string | null, read: false },
      { userId: emp2.id, type: NotificationType.TASK_OVERDUE, title: "Your task is overdue", body: '"Clean exhaust hood" at Mississauga is past its due date.', entityType: "Task", entityId: null as string | null, read: false },
      { userId: mgrMiss.id, type: NotificationType.ESCALATION, title: "Task overdue: Clean exhaust hood", body: '"Clean exhaust hood" at Mississauga passed its deadline.', entityType: "Task", entityId: null as string | null, read: false },
      { userId: mgrDowntown.id, type: NotificationType.CHECKLIST_GENERATED, title: "Checklist generated: Opening Duties", body: "6 task(s) created for Downtown.", entityType: "ChecklistTemplate", entityId: null as string | null, read: true },
      { userId: emp1.id, type: NotificationType.TASK_NEAR_DUE, title: "Task due soon", body: '"Count fridge stock" is due within 2 hours.', entityType: "Task", entityId: null as string | null, read: true },
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

    void owner;
    return NextResponse.json({ ok: true, counts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
