"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LessonType, TrainingCategory } from "@prisma/client";
import {
  addLesson,
  updateLesson,
  deleteLesson,
  updateCourse,
  reorderLessons,
} from "@/lib/courses";
import {
  TRAINING_CATEGORY_LABEL,
  TRAINING_CATEGORY_COLOR,
  LESSON_TYPE_LABEL,
  LESSON_TYPE_ICON,
} from "@/lib/training-meta";

const LESSON_TYPES = Object.keys(LESSON_TYPE_LABEL) as LessonType[];

type Lesson = {
  id: string;
  title: string;
  content: string | null;
  contentUrl: string | null;
  type: LessonType;
  duration: number | null;
  position: number;
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: TrainingCategory;
  published: boolean;
  createdBy: { id: string; name: string };
  location: { name: string } | null;
  lessons: Lesson[];
};

type Props = {
  course: Course;
  canEdit: boolean;
};

export function CourseDetailClient({ course, canEdit }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeLesson, setActiveLesson] = useState<string | null>(
    course.lessons[0]?.id ?? null,
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const color = TRAINING_CATEGORY_COLOR[course.category];
  const current = course.lessons.find((l) => l.id === activeLesson) ?? null;
  const currentIdx = course.lessons.findIndex((l) => l.id === activeLesson);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      setErr(null);
      try { await fn(); router.refresh(); }
      catch { setErr("Something went wrong"); }
    });

  const goNext = () => {
    if (currentIdx < course.lessons.length - 1) setActiveLesson(course.lessons[currentIdx + 1].id);
  };
  const goPrev = () => {
    if (currentIdx > 0) setActiveLesson(course.lessons[currentIdx - 1].id);
  };

  const moveLesson = (idx: number, dir: -1 | 1) => {
    const ids = course.lessons.map((l) => l.id);
    const target = idx + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    run(() => reorderLessons(course.id, ids));
  };

  return (
    <div className="space-y-4">
      {/* Course header */}
      <div className="m-card overflow-hidden">
        <div className="h-2" style={{ backgroundColor: color }} />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {TRAINING_CATEGORY_LABEL[course.category]}
                </span>
                <span className="text-xs text-[#A19BA2]">
                  {course.location?.name ?? "Company-wide"}
                </span>
                {!course.published && (
                  <span className="rounded-full bg-[#fdf2f3] px-2.5 py-0.5 text-xs font-semibold text-[#e2445c]">
                    Draft
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-[#140516]">{course.title}</h1>
              {course.description && (
                <p className="mt-1 text-sm text-[#726973]">{course.description}</p>
              )}
              <p className="mt-2 text-xs text-[#A19BA2]">
                Created by {course.createdBy.name} · {course.lessons.length} {course.lessons.length === 1 ? "lesson" : "lessons"}
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => run(() => updateCourse(course.id, { published: !course.published }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    course.published
                      ? "border-[#E4DDE4] text-[#726973] hover:bg-[#FAF6FA]"
                      : "border-[#1DBA87] text-[#1DBA87] hover:bg-[#f0fdf4]"
                  }`}
                >
                  {course.published ? "Unpublish" : "Publish"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-lg bg-[#fdf2f3] px-4 py-2 text-sm font-medium text-[#e2445c]">{err}</div>
      )}

      {/* Main layout: sidebar + content */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Lesson sidebar */}
        <div className="m-card p-3 lg:sticky lg:top-4 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Lessons</h2>
            {canEdit && (
              <button
                onClick={() => setShowAddForm(true)}
                className="rounded-md p-1 text-[#440E48] hover:bg-[#FAF6FA]"
                title="Add lesson"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>

          {course.lessons.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#A19BA2]">
              No lessons yet.{canEdit ? " Click + to add one." : ""}
            </p>
          ) : (
            <ul className="space-y-1">
              {course.lessons.map((lesson, idx) => {
                const isActive = lesson.id === activeLesson;
                return (
                  <li key={lesson.id}>
                    <button
                      onClick={() => setActiveLesson(lesson.id)}
                      className={`group flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-[#440E48]/10 font-semibold text-[#440E48]"
                          : "text-[#433745] hover:bg-[#FAF6FA]"
                      }`}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: isActive ? color : "#F0EBF0",
                          color: isActive ? "#fff" : "#726973",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{LESSON_TYPE_ICON[lesson.type]}</span>
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        {lesson.duration != null && (
                          <span className="text-xs text-[#A19BA2]">{lesson.duration} min</span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                          {idx > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); moveLesson(idx, -1); }}
                              className="rounded p-0.5 hover:bg-[#E4DDE4]" title="Move up">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                          )}
                          {idx < course.lessons.length - 1 && (
                            <button onClick={(e) => { e.stopPropagation(); moveLesson(idx, 1); }}
                              className="rounded p-0.5 hover:bg-[#E4DDE4]" title="Move down">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Content area */}
        <div className="min-w-0">
          {showAddForm && canEdit ? (
            <AddLessonForm
              courseId={course.id}
              onDone={() => { setShowAddForm(false); router.refresh(); }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : editingId && current && canEdit ? (
            <EditLessonForm
              lesson={current}
              onDone={() => { setEditingId(null); router.refresh(); }}
              onCancel={() => setEditingId(null)}
            />
          ) : current ? (
            <LessonViewer
              lesson={current}
              lessonNumber={currentIdx + 1}
              totalLessons={course.lessons.length}
              canEdit={canEdit}
              color={color}
              onEdit={() => setEditingId(current.id)}
              onDelete={() => run(async () => {
                await deleteLesson(current.id);
                setActiveLesson(course.lessons[0]?.id ?? null);
              })}
              onNext={currentIdx < course.lessons.length - 1 ? goNext : undefined}
              onPrev={currentIdx > 0 ? goPrev : undefined}
            />
          ) : (
            <div className="m-card flex flex-col items-center justify-center p-12 text-center text-[#A19BA2]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-[#E4DDE4]">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <p className="font-medium">
                {course.lessons.length === 0
                  ? "This course has no lessons yet."
                  : "Select a lesson from the sidebar."}
              </p>
              {canEdit && course.lessons.length === 0 && (
                <button onClick={() => setShowAddForm(true)} className="m-btn mt-3">
                  Add First Lesson
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lesson Viewer ────────────────────────────────────────────────────────────

function LessonViewer({
  lesson,
  lessonNumber,
  totalLessons,
  canEdit,
  color,
  onEdit,
  onDelete,
  onNext,
  onPrev,
}: {
  lesson: Lesson;
  lessonNumber: number;
  totalLessons: number;
  canEdit: boolean;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  return (
    <div className="m-card overflow-hidden">
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-5 sm:p-6">
        {/* Lesson header */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs text-[#A19BA2]">
              <span className="font-semibold">Lesson {lessonNumber} of {totalLessons}</span>
              <span className="rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: color + "18", color }}>
                {LESSON_TYPE_ICON[lesson.type]} {LESSON_TYPE_LABEL[lesson.type]}
              </span>
              {lesson.duration != null && <span>{lesson.duration} min</span>}
            </div>
            <h2 className="text-lg font-bold text-[#140516]">{lesson.title}</h2>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1.5">
              <button onClick={onEdit} className="rounded-md px-2.5 py-1 text-xs font-semibold text-[#440E48] hover:bg-[#FAF6FA]">
                Edit
              </button>
              <button
                onClick={() => { if (confirm(`Delete lesson "${lesson.title}"?`)) onDelete(); }}
                className="rounded-md p-1.5 text-[#A19BA2] hover:bg-[#fdf2f3] hover:text-[#e2445c]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* External resource link */}
        {lesson.contentUrl && (
          <a
            href={lesson.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-2 rounded-lg border border-[#E4DDE4] bg-[#FAF6FA] p-3 text-sm font-medium text-[#440E48] hover:border-[#440E48]"
          >
            {lesson.type === "VIDEO" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            )}
            {lesson.type === "VIDEO" ? "Watch Video" : "Open Resource"}
            <span className="ml-auto text-xs text-[#A19BA2]">↗</span>
          </a>
        )}

        {/* Video embed */}
        {lesson.type === "VIDEO" && lesson.contentUrl && isEmbeddable(lesson.contentUrl) && (
          <div className="mb-4 aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              src={toEmbedUrl(lesson.contentUrl)}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Inline content */}
        {lesson.content && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-[#433745]">
            {lesson.content}
          </div>
        )}

        {!lesson.content && !lesson.contentUrl && (
          <p className="py-6 text-center text-sm text-[#A19BA2] italic">No content added to this lesson yet.</p>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-[#F0EBF0] pt-4">
          {onPrev ? (
            <button onClick={onPrev} className="flex items-center gap-1.5 text-sm font-medium text-[#726973] hover:text-[#440E48]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>
          ) : <div />}
          {onNext ? (
            <button onClick={onNext} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: color }}>
              Next Lesson
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : (
            <span className="rounded-lg bg-[#1DBA87]/10 px-4 py-2 text-sm font-semibold text-[#1DBA87]">
              Last Lesson
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Lesson Forms ──────────────────────────────────────────────────

function AddLessonForm({
  courseId,
  onDone,
  onCancel,
}: {
  courseId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [type, setType] = useState<LessonType>("ARTICLE");
  const [duration, setDuration] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const field = "w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]";

  const submit = () =>
    startTransition(async () => {
      const res = await addLesson(courseId, {
        title,
        content,
        contentUrl,
        type,
        duration: duration ? parseInt(duration, 10) : null,
      });
      if (!res.ok) { setErr(res.error ?? "Failed"); return; }
      onDone();
    });

  return (
    <div className="m-card p-5 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Add new lesson</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="Lesson title *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex gap-2">
          <select className={field} value={type} onChange={(e) => setType(e.target.value as LessonType)}>
            {LESSON_TYPES.map((t) => (
              <option key={t} value={t}>{LESSON_TYPE_ICON[t]} {LESSON_TYPE_LABEL[t]}</option>
            ))}
          </select>
          <input className={`${field} w-24`} type="number" min={1} placeholder="Min" value={duration}
            onChange={(e) => setDuration(e.target.value)} title="Duration in minutes" />
        </div>
      </div>
      <input className={field} placeholder="Link / URL (video, Google Drive, etc.)" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
      <textarea
        className={`${field} min-h-[120px] resize-y`}
        placeholder="Lesson content / notes…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={pending || !title.trim()} className="m-btn disabled:opacity-60">
          {pending ? "Adding…" : "Add Lesson"}
        </button>
        <button onClick={onCancel} className="text-sm text-[#726973] hover:text-[#140516]">Cancel</button>
        {err && <span className="text-sm font-medium text-[#e2445c]">{err}</span>}
      </div>
    </div>
  );
}

function EditLessonForm({
  lesson,
  onDone,
  onCancel,
}: {
  lesson: Lesson;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(lesson.title);
  const [content, setContent] = useState(lesson.content ?? "");
  const [contentUrl, setContentUrl] = useState(lesson.contentUrl ?? "");
  const [type, setType] = useState(lesson.type);
  const [duration, setDuration] = useState(lesson.duration?.toString() ?? "");
  const [err, setErr] = useState<string | null>(null);

  const field = "w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]";

  const submit = () =>
    startTransition(async () => {
      const res = await updateLesson(lesson.id, {
        title,
        content,
        contentUrl,
        type,
        duration: duration ? parseInt(duration, 10) : null,
      });
      if (!res.ok) { setErr(res.error ?? "Failed"); return; }
      onDone();
    });

  return (
    <div className="m-card p-5 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Edit lesson</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder="Lesson title *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex gap-2">
          <select className={field} value={type} onChange={(e) => setType(e.target.value as LessonType)}>
            {LESSON_TYPES.map((t) => (
              <option key={t} value={t}>{LESSON_TYPE_ICON[t]} {LESSON_TYPE_LABEL[t]}</option>
            ))}
          </select>
          <input className={`${field} w-24`} type="number" min={1} placeholder="Min" value={duration}
            onChange={(e) => setDuration(e.target.value)} title="Duration in minutes" />
        </div>
      </div>
      <input className={field} placeholder="Link / URL" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
      <textarea
        className={`${field} min-h-[120px] resize-y`}
        placeholder="Lesson content / notes…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={pending || !title.trim()} className="m-btn disabled:opacity-60">
          {pending ? "Saving…" : "Save Changes"}
        </button>
        <button onClick={onCancel} className="text-sm text-[#726973] hover:text-[#140516]">Cancel</button>
        {err && <span className="text-sm font-medium text-[#e2445c]">{err}</span>}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isEmbeddable(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|vimeo\.com\//.test(url);
}

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}
