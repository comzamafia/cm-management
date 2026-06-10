---
name: cm-management
description: Domain model, architecture, and conventions for the CM Operational Task Management System — a multi-location task/checklist/communication platform. Use when building, extending, or reviewing any feature in C:\cm_management (tasks, checklists, dashboard, roles, activity log, attachments).
---

# CM Operational Task Management System

A multi-location operations platform that answers one question for management:
**Who did What, Where, and When.** Built for a multi-branch business (stores/branches)
to replace scattered WhatsApp groups with a single accountable system.

Source requirements: `Todo.md` (Thai). This skill is the English engineering contract derived from it.

## Locked decisions
- **Stack:** Next.js (App Router) + TypeScript + Prisma + SQLite (dev). Tailwind for UI.
- **UI language:** English only.
- **Current milestone:** Phase 1 — Task Management Core. Architecture is scaffolded for all phases,
  but only Phase 1 is implemented. Do not build later-phase features unless asked.
- **Mobile-first** for employee task views; **web dashboard** for managers/owners.

## Core principle (never violate)
Every state-changing action MUST write an immutable `ActivityLog` row capturing
**user + action + entity + location + timestamp**. This is the heart of the system —
the dashboard and audit trail are reads over this log plus entity state. Log writes
happen server-side in the same operation as the mutation, never client-trusted.

## Roles & data scope (RBAC)
Authorization is **scope-based**: a user sees/acts on data within their location scope.
| Role | Scope | Can |
|---|---|---|
| `OWNER` | all locations | view everything, company announcements, all reports |
| `AREA_MANAGER` | assigned locations | assign cross-location, approve, track overdue |
| `STORE_MANAGER` | own location | create/assign/verify tasks, store announcements |
| `SHIFT_LEAD` | own location (shift) | assign in-shift, check checklists |
| `EMPLOYEE` | self | accept/complete tasks, attach proof, view SOP |
| `NEW_HIRE` | onboarding only | onboarding hub + assigned training |

Always enforce scope on the **server** (API/route handler), never only in the UI.
A `User` has one primary `location_id`; managers may cover multiple via a join.

## Data model (Phase 1 entities — Prisma)
Keep these field names stable; the dashboard and logs depend on them.
- **Location** — `id, name, address, region, managerId`
- **User** — `id, name, email, role, locationId, phone, status`
- **Task** — `id, title, description, type(ONE_OFF|RECURRING), priority(LOW|MEDIUM|HIGH|CRITICAL),
  locationId, assigneeId, assignerId, department, dueAt,
  status(PENDING|IN_PROGRESS|DONE|VERIFIED|OVERDUE), proofRequired(bool)`
- **TaskCompletion** — `id, taskId, completedById, completedAt, photoUrls[], locationStamp, verifiedById, verifiedAt`
- **Attachment** — `id, taskId, type(PHOTO|DOC|SOP|VIDEO), url`
- **ActivityLog** — `id, userId, action, entity, entityId, locationId, timestamp, meta`

Later phases (do NOT implement now): Announcement, TrainingMaterial.

**Phase 2 entities (implemented):**
- **ChecklistTemplate** — `id, name, frequency(DAILY/WEEKLY/MONTHLY), items(Json string[]),
  locationId(null=company-wide), autoGenerateHour, weekDay, monthDay, priority, department,
  proofRequired, active, createdById`
- **ChecklistGeneration** — idempotency record per template+location+day, prevents duplicate task creation
- **Notification** — `id, userId, type(TASK_ASSIGNED|TASK_NEAR_DUE|TASK_OVERDUE|ESCALATION|
  CHECKLIST_GENERATED), title, body, entityId, entityType, read`

## Status flow rules
`PENDING → IN_PROGRESS → DONE → VERIFIED`. `OVERDUE` is derived/auto-set when `dueAt < now`
and status not in (DONE, VERIFIED). Rules:
- A task with `proofRequired = true` cannot move to `DONE` without ≥1 photo in TaskCompletion.
- Only `STORE_MANAGER`+ (manager and above for that location) can set `VERIFIED`.
- Status transitions are validated server-side; reject illegal jumps.

## Conventions
- **Enums** are Prisma enums, SCREAMING_SNAKE_CASE in DB, mapped to readable labels in UI.
- **Server actions / route handlers** own all mutations + the matching ActivityLog write.
  Wrap mutation + log in a single `prisma.$transaction`.
- **Auth (Phase 1):** lightweight — seeded users, a simple session/cookie picking a current user.
  Do not build full auth (OAuth, password reset) unless asked; leave a clean seam (`lib/auth.ts`).
- **Dates:** store UTC, render local. "Overdue" computed against `dueAt`.
- **Seed data:** `prisma/seed.ts` creates ~2-3 locations, users across all roles, sample tasks
  in each status so the dashboard is never empty.
- Prefer server components for reads; client components only where interactivity is needed.

## Where things live
- `prisma/schema.prisma` — data model (source of truth for entities)
- `prisma/seed.ts` — demo data
- `src/lib/prisma.ts` — Prisma singleton
- `src/lib/auth.ts` — current-user + scope helpers (`requireRole`, `scopedLocations`)
- `src/lib/activity.ts` — `logActivity()` helper, always called inside the mutation txn
- `src/app/tasks/**` — task list, detail, create/assign (mobile-first)
- `src/app/dashboard/**` — manager/owner overview (Who/What/Where/When)
- `src/app/checklists/**` — checklist template list + create form
- `src/app/notifications/**` — notification history page
- `src/app/api/cron/generate-checklists/route.ts` — run due templates, create tasks + notify managers
- `src/app/api/cron/check-overdue/route.ts` — mark overdue tasks, escalate to managers, near-due alerts
- `src/lib/checklists.ts` — template CRUD + `generateDueChecklists()` core logic
- `src/lib/notifications.ts` — `createNotification()` (use inside transactions) + mark-read actions
- `src/components/NotificationBell.tsx` — header bell with unread count + dropdown
- `src/components/ChecklistActions.tsx` — ToggleTemplateButton, GenerateNowButton (client)

## Definition of done for a feature
1. Server enforces role + location scope.
2. Every mutation writes an ActivityLog row in the same transaction.
3. Illegal status transitions and missing required proof are rejected server-side.
4. Seed data exercises the new path.
5. `npm run build` passes and the page renders against seeded data.
