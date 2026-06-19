"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCurrentUser, atLeast, locationScopeWhere } from "./auth";
import { Role, TrainingCategory, LessonType } from "@prisma/client";

export type ActionResult = { ok: boolean; error?: string };

export async function getCourses(category?: TrainingCategory) {
  const user = await getCurrentUser();
  if (!user) return [];

  const locationFilter =
    user.role === Role.OWNER || user.role === Role.AREA_MANAGER
      ? {}
      : {
          OR: [
            { locationId: null },
            { locationId: user.locationId ?? "" },
          ],
        };

  return prisma.course.findMany({
    where: {
      ...locationFilter,
      ...(category ? { category } : {}),
      published: true,
    },
    orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
    include: {
      createdBy: { select: { name: true } },
      location: { select: { name: true } },
      _count: { select: { lessons: true } },
    },
  });
}

export async function getCourseDetail(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const locationFilter =
    user.role === Role.OWNER || user.role === Role.AREA_MANAGER
      ? {}
      : {
          OR: [
            { locationId: null },
            { locationId: user.locationId ?? "" },
          ],
        };

  return prisma.course.findFirst({
    where: { id, ...locationFilter },
    include: {
      createdBy: { select: { id: true, name: true } },
      location: { select: { name: true } },
      lessons: { orderBy: { position: "asc" } },
    },
  });
}

export async function createCourse(input: {
  title: string;
  description: string;
  category: TrainingCategory;
  locationId: string | null;
}): Promise<ActionResult & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };
  if (!input.title.trim()) return { ok: false, error: "Title is required" };

  const locationId = atLeast(user.role, Role.AREA_MANAGER)
    ? input.locationId
    : user.locationId;

  const course = await prisma.$transaction(async (tx) => {
    const c = await tx.course.create({
      data: {
        title: input.title.trim(),
        description: input.description.trim() || null,
        category: input.category,
        locationId,
        createdById: user.id,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "course.created",
        entity: "Course",
        entityId: c.id,
        locationId: locationId ?? null,
        meta: { title: c.title, category: c.category },
      },
    });
    return c;
  });

  revalidatePath("/training");
  return { ok: true, id: course.id };
}

export async function updateCourse(
  id: string,
  input: {
    title?: string;
    description?: string;
    category?: TrainingCategory;
    published?: boolean;
    locationId?: string | null;
  },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return { ok: false, error: "Course not found" };

  await prisma.$transaction(async (tx) => {
    await tx.course.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description.trim() || null }
          : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.published !== undefined ? { published: input.published } : {}),
        ...(input.locationId !== undefined
          ? { locationId: input.locationId }
          : {}),
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "course.updated",
        entity: "Course",
        entityId: id,
        locationId: course.locationId,
        meta: { changes: Object.keys(input) },
      },
    });
  });

  revalidatePath("/training");
  revalidatePath(`/training/${id}`);
  return { ok: true };
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) return { ok: false, error: "Course not found" };

  await prisma.$transaction(async (tx) => {
    await tx.course.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "course.deleted",
        entity: "Course",
        entityId: id,
        locationId: course.locationId,
        meta: { title: course.title },
      },
    });
  });

  revalidatePath("/training");
  return { ok: true };
}

export async function addLesson(
  courseId: string,
  input: {
    title: string;
    content?: string;
    contentUrl?: string;
    type: LessonType;
    duration?: number | null;
  },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };
  if (!input.title.trim()) return { ok: false, error: "Title is required" };

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { ok: false, error: "Course not found" };

  const maxPos = await prisma.lesson.aggregate({
    where: { courseId },
    _max: { position: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.lesson.create({
      data: {
        courseId,
        title: input.title.trim(),
        content: input.content?.trim() || null,
        contentUrl: input.contentUrl?.trim() || null,
        type: input.type,
        duration: input.duration ?? null,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "lesson.added",
        entity: "Course",
        entityId: courseId,
        locationId: course.locationId,
        meta: { lessonTitle: input.title },
      },
    });
  });

  revalidatePath(`/training/${courseId}`);
  return { ok: true };
}

export async function updateLesson(
  lessonId: string,
  input: {
    title?: string;
    content?: string;
    contentUrl?: string;
    type?: LessonType;
    duration?: number | null;
  },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { id: true, locationId: true } } },
  });
  if (!lesson) return { ok: false, error: "Lesson not found" };

  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({
      where: { id: lessonId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.content !== undefined
          ? { content: input.content.trim() || null }
          : {}),
        ...(input.contentUrl !== undefined
          ? { contentUrl: input.contentUrl.trim() || null }
          : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.duration !== undefined ? { duration: input.duration } : {}),
      },
    });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "lesson.updated",
        entity: "Course",
        entityId: lesson.course.id,
        locationId: lesson.course.locationId,
        meta: { lessonId, lessonTitle: input.title ?? lesson.title },
      },
    });
  });

  revalidatePath(`/training/${lesson.course.id}`);
  return { ok: true };
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { id: true, locationId: true } } },
  });
  if (!lesson) return { ok: false, error: "Lesson not found" };

  await prisma.$transaction(async (tx) => {
    await tx.lesson.delete({ where: { id: lessonId } });
    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "lesson.deleted",
        entity: "Course",
        entityId: lesson.course.id,
        locationId: lesson.course.locationId,
        meta: { lessonTitle: lesson.title },
      },
    });
  });

  revalidatePath(`/training/${lesson.course.id}`);
  return { ok: true };
}

export async function reorderLessons(
  courseId: string,
  lessonIds: string[],
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!atLeast(user.role, Role.STORE_MANAGER))
    return { ok: false, error: "Managers only" };

  await prisma.$transaction(
    lessonIds.map((id, i) =>
      prisma.lesson.update({ where: { id }, data: { position: i } }),
    ),
  );

  revalidatePath(`/training/${courseId}`);
  return { ok: true };
}
