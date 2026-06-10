import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { locationScopeWhere } from "./auth";
import { isOverdue } from "./labels";

type ScopeUser = { role: Role; locationId: string | null };

/** Everything the board needs: categories (groups), their tasks, assignable users, KPIs. */
export async function getBoard(user: ScopeUser) {
  const scope = await locationScopeWhere(user);

  const [categories, tasks, users] = await Promise.all([
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    prisma.task.findMany({
      where: { ...scope, categoryId: { not: null } },
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: [{ position: "asc" }, { dueAt: "asc" }],
    }),
    prisma.user.findMany({
      where: { ...scope, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const withDerived = tasks.map((t) => ({
    ...t,
    derivedStatus: isOverdue(t.dueAt, t.status) ? ("OVERDUE" as TaskStatus) : t.status,
  }));

  const groups = categories.map((c) => ({
    category: c,
    tasks: withDerived.filter((t) => t.categoryId === c.id),
  }));

  const totals = {
    total: withDerived.length,
    pending: withDerived.filter((t) => t.derivedStatus === "PENDING").length,
    inProgress: withDerived.filter((t) => t.derivedStatus === "IN_PROGRESS").length,
    done: withDerived.filter((t) => t.derivedStatus === "DONE").length,
    verified: withDerived.filter((t) => t.derivedStatus === "VERIFIED").length,
    overdue: withDerived.filter((t) => t.derivedStatus === "OVERDUE").length,
  };

  return { groups, users, totals };
}
