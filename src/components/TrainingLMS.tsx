"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrainingCategory } from "@prisma/client";
import { createCourse, deleteCourse } from "@/lib/courses";
import {
  TRAINING_CATEGORY_LABEL,
  TRAINING_CATEGORY_COLOR,
} from "@/lib/training-meta";

const CATEGORIES = Object.keys(TRAINING_CATEGORY_LABEL) as TrainingCategory[];

const CATEGORY_ICON: Record<TrainingCategory, string> = {
  SOP: "📋",
  SAFETY: "🛡️",
  SERVICE: "🤝",
  PRODUCT: "📦",
  COMPLIANCE: "✅",
  OTHER: "📁",
};

type CourseItem = {
  id: string;
  title: string;
  description: string | null;
  category: TrainingCategory;
  thumbnail: string | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { name: string };
  location: { name: string } | null;
  _count: { lessons: number };
};

type Props = {
  courses: CourseItem[];
  canCreate: boolean;
  locations: { id: string; name: string }[];
};

export function TrainingLMS({ courses, canCreate, locations }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TrainingCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TrainingCategory>("SOP");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = () =>
    startTransition(async () => {
      if (!title.trim()) return;
      const res = await createCourse({ title, description, category, locationId });
      if (!res.ok) { setErr(res.error ?? "Failed"); return; }
      setTitle(""); setDescription(""); setErr(null); setShowForm(false);
      router.push(`/training/${res.id}`);
    });

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete course "${name}"? All lessons will be removed.`)) return;
    startTransition(async () => {
      await deleteCourse(id);
      router.refresh();
    });
  };

  let filtered = activeCategory === "ALL"
    ? courses
    : courses.filter((c) => c.category === activeCategory);

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
    );
  }

  const categoryCounts = CATEGORIES.map((cat) => ({
    cat,
    count: courses.filter((c) => c.category === cat).length,
  }));

  const field = "w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#140516]">Training & Courses</h1>
          <p className="mt-0.5 text-sm text-[#726973]">
            {courses.length} {courses.length === 1 ? "course" : "courses"} available
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm((v) => !v)} className="m-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Course
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A19BA2]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-[#E4DDE4] bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#440E48]"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === "ALL"
              ? "bg-[#440E48] text-white shadow-sm"
              : "bg-white text-[#726973] ring-1 ring-inset ring-[#E4DDE4] hover:bg-[#FAF6FA]"
          }`}
        >
          All ({courses.length})
        </button>
        {categoryCounts.map(({ cat, count }) => {
          const active = activeCategory === cat;
          const color = TRAINING_CATEGORY_COLOR[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "text-white shadow-sm"
                  : "bg-white text-[#726973] ring-1 ring-inset ring-[#E4DDE4] hover:bg-[#FAF6FA]"
              }`}
              style={active ? { backgroundColor: color } : {}}
            >
              {TRAINING_CATEGORY_LABEL[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Create course form */}
      {showForm && (
        <div className="m-card p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Create new course</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="Course title *" value={title} onChange={(e) => setTitle(e.target.value)} />
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value as TrainingCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{TRAINING_CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <textarea
            className={`${field} min-h-[60px] resize-y`}
            placeholder="Course description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {locations.length > 1 && (
            <select className={`${field} w-auto`} value={locationId ?? ""} onChange={(e) => setLocationId(e.target.value || null)}>
              <option value="">Company-wide</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={pending || !title.trim()} className="m-btn disabled:opacity-60">
              {pending ? "Creating…" : "Create & Add Lessons"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-[#726973] hover:text-[#140516]">Cancel</button>
            {err && <span className="text-sm font-medium text-[#e2445c]">{err}</span>}
          </div>
        </div>
      )}

      {/* Course grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} canCreate={canCreate} onDelete={() => handleDelete(c.id, c.title)} />
          ))}
        </div>
      ) : (
        <div className="m-card p-12 text-center text-[#A19BA2]">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">
            {search ? "No courses match your search." : "No courses yet."}
          </p>
          {canCreate && !search && (
            <p className="text-sm mt-1">Click &quot;New Course&quot; to create the first one.</p>
          )}
        </div>
      )}
    </div>
  );
}

function CourseCard({
  course: c,
  canCreate,
  onDelete,
}: {
  course: CourseItem;
  canCreate: boolean;
  onDelete: () => void;
}) {
  const color = TRAINING_CATEGORY_COLOR[c.category];
  const icon = CATEGORY_ICON[c.category];

  return (
    <div className="m-card flex flex-col overflow-hidden">
      {/* Colored header bar */}
      <div className="h-2" style={{ backgroundColor: color }} />

      <div className="flex flex-1 flex-col p-4">
        {/* Category + scope */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {TRAINING_CATEGORY_LABEL[c.category]}
          </span>
          <span className="text-xs text-[#A19BA2]">
            {c.location?.name ?? "Company-wide"}
          </span>
        </div>

        {/* Icon + title */}
        <div className="mb-2 flex items-start gap-3">
          <span className="mt-0.5 text-2xl">{icon}</span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/training/${c.id}`}
              className="block font-semibold text-[#140516] hover:text-[#440E48]"
            >
              {c.title}
            </Link>
            {c.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-[#726973]">{c.description}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-[#F0EBF0] pt-3">
          <div className="flex items-center gap-3 text-xs text-[#A19BA2]">
            <span className="inline-flex items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              {c._count.lessons} {c._count.lessons === 1 ? "lesson" : "lessons"}
            </span>
            <span>{c.createdBy.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/training/${c.id}`}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-[#440E48] hover:bg-[#FAF6FA]"
            >
              View →
            </Link>
            {canCreate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Delete course"
                className="rounded-md p-1.5 text-[#A19BA2] hover:bg-[#fdf2f3] hover:text-[#e2445c]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
