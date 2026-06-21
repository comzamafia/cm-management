// Client-safe push constants and types (no web-push / Node imports). Both the
// server sender (push.ts) and client components import from here.

export type PushCategory = "tasks" | "mentions" | "maintenance" | "compliance";

export const PUSH_CATEGORY_LABEL: Record<PushCategory, string> = {
  tasks: "Tasks (assigned, due, overdue)",
  mentions: "Channel @mentions",
  maintenance: "Maintenance",
  compliance: "Compliance",
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string; // path to open on click, e.g. /tasks/123
  tag?: string; // collapse key
  category?: PushCategory; // for per-user mute checks
};
