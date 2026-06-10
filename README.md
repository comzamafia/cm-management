# CM Operations — Operational Task Management System

A multi-location operations platform that answers, for management, one question:
**Who did What, Where, and When.** It replaces scattered WhatsApp groups with a single
accountable system. Derived from `Todo.md` (Thai requirements / proposal).

## Status
**Phase 1 — Task Management Core** is implemented. The architecture is scaffolded for the
later phases (Recurring Checklists, Executive Dashboard drill-downs, Communication/Training Hub,
Pilot/Rollout, Extension Modules) but those are not built yet.

## Analysis & Design summary

### Requirements (from `Todo.md`)
Central task management across branches; manager → employee assignment; notifications +
close-out; attachments / photo proof; recurring checklists; completion tracking + overdue
alerts; announcements; onboarding/training; reduced WhatsApp use; immutable audit trail;
executive multi-branch visibility.

### Roles (RBAC, scope-based)
`OWNER` (all locations) → `AREA_MANAGER` (assigned) → `STORE_MANAGER` (own) →
`SHIFT_LEAD` (own/shift) → `EMPLOYEE` (self) → `NEW_HIRE` (onboarding). Scope is enforced
**server-side** on every read and mutation.

### Core design principle
Every state-changing action writes an immutable `ActivityLog` row (user + action + entity +
location + timestamp) **in the same transaction** as the mutation. The dashboard is a read
over this log plus entity state.

### Phase 1 data model (`prisma/schema.prisma`)
`Location`, `User`, `Task`, `TaskCompletion`, `Attachment`, `ActivityLog`.
Status flow: `PENDING → IN_PROGRESS → DONE → VERIFIED`; `OVERDUE` is derived from `dueAt`.
Rules: photo-proof tasks can't reach `DONE` without a photo; only managers can `VERIFY`;
illegal transitions are rejected server-side.

## Tech stack
Next.js (App Router) + TypeScript · Prisma + SQLite (dev) · Tailwind CSS v4.

## What's built
- **Dashboard** (`/dashboard`) — Company Overview: KPI strip, completion rate by location,
  overdue tasks, live activity feed (Who/What/Where/When).
- **Tasks** (`/tasks`) — scoped, filterable list; detail view with status actions, photo proof,
  attachments, completion history; create/assign form for managers & shift leads.
- **Lightweight session** — a user switcher (top-right) stands in for login; cookie holds the
  current user id. Clean seam in `src/lib/auth.ts` to swap for real auth later.

## Run it
```bash
npm install
npm run db:reset   # create schema + seed demo data (3 locations, 8 users, sample tasks)
npm run dev        # http://localhost:3000
```
Pick a user from the top-right switcher (e.g. *Olivia Owner* for the full view, or
*Emma Employee* to see the scoped, employee experience).

Scripts: `db:push` (sync schema) · `db:seed` (seed only) · `db:reset` (reset + seed) ·
`build` · `start`.

## Project conventions
See `.claude/skills/cm-management/SKILL.md` — the engineering contract (data model,
RBAC, status rules, where things live, definition of done). Read it before extending.

## Known Phase-1 simplifications
- Photo proof accepts pasted image **URLs** (no file-upload/storage yet).
- `AREA_MANAGER` scope is simplified to "all locations" (multi-location join is modeled
  but not yet wired to a subset).
- No real authentication — the user switcher is a stand-in.
