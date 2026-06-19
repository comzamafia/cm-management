"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { LessonType, TrainingCategory } from "@prisma/client";
import { upload } from "@vercel/blob/client";
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
  imageUrls: string[];
  fileUrls: string[];
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
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: color }}>
                  {TRAINING_CATEGORY_LABEL[course.category]}
                </span>
                <span className="text-xs text-[#A19BA2]">{course.location?.name ?? "Company-wide"}</span>
                {!course.published && (
                  <span className="rounded-full bg-[#fdf2f3] px-2.5 py-0.5 text-xs font-semibold text-[#e2445c]">Draft</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-[#140516]">{course.title}</h1>
              {course.description && <p className="mt-1 text-sm text-[#726973]">{course.description}</p>}
              <p className="mt-2 text-xs text-[#A19BA2]">
                Created by {course.createdBy.name} · {course.lessons.length} {course.lessons.length === 1 ? "lesson" : "lessons"}
              </p>
            </div>
            {canEdit && (
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
            )}
          </div>
        </div>
      </div>

      {err && <div className="rounded-lg bg-[#fdf2f3] px-4 py-2 text-sm font-medium text-[#e2445c]">{err}</div>}

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Lesson sidebar */}
        <div className="m-card p-3 lg:sticky lg:top-4 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">Lessons</h2>
            {canEdit && (
              <button onClick={() => setShowAddForm(true)} className="rounded-md p-1 text-[#440E48] hover:bg-[#FAF6FA]" title="Add lesson">
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
                        isActive ? "bg-[#440E48]/10 font-semibold text-[#440E48]" : "text-[#433745] hover:bg-[#FAF6FA]"
                      }`}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: isActive ? color : "#F0EBF0", color: isActive ? "#fff" : "#726973" }}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{LESSON_TYPE_ICON[lesson.type]}</span>
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        {lesson.duration != null && <span className="text-xs text-[#A19BA2]">{lesson.duration} min</span>}
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
            <LessonForm
              mode="add"
              courseId={course.id}
              onDone={() => { setShowAddForm(false); router.refresh(); }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : editingId && current && canEdit ? (
            <LessonForm
              mode="edit"
              courseId={course.id}
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
                {course.lessons.length === 0 ? "This course has no lessons yet." : "Select a lesson from the sidebar."}
              </p>
              {canEdit && course.lessons.length === 0 && (
                <button onClick={() => setShowAddForm(true)} className="m-btn mt-3">Add First Lesson</button>
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
  const youtubeId = lesson.contentUrl ? extractYouTubeId(lesson.contentUrl) : null;
  const vimeoId = lesson.contentUrl ? extractVimeoId(lesson.contentUrl) : null;
  const isEmbedVideo = !!(youtubeId || vimeoId);

  return (
    <div className="m-card overflow-hidden">
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-[#A19BA2]">
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
              <button onClick={onEdit} className="rounded-md px-2.5 py-1 text-xs font-semibold text-[#440E48] hover:bg-[#FAF6FA]">Edit</button>
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

        {/* YouTube / Vimeo embed */}
        {isEmbedVideo && (
          <div className="mb-5 aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg">
            <iframe
              src={youtubeId
                ? `https://www.youtube-nocookie.com/embed/${youtubeId}`
                : `https://player.vimeo.com/video/${vimeoId}`
              }
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* External link (non-embeddable) */}
        {lesson.contentUrl && !isEmbedVideo && (
          <a
            href={lesson.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-2 rounded-lg border border-[#E4DDE4] bg-[#FAF6FA] p-3 text-sm font-medium text-[#440E48] hover:border-[#440E48]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open Resource
            <span className="ml-auto text-xs text-[#A19BA2]">↗</span>
          </a>
        )}

        {/* Uploaded images */}
        {lesson.imageUrls.length > 0 && (
          <div className="mb-5 space-y-3">
            {lesson.imageUrls.map((url, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-[#E4DDE4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${lesson.title} image ${i + 1}`} className="w-full object-contain" />
              </div>
            ))}
          </div>
        )}

        {/* Inline content */}
        {lesson.content && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#433745]">
            {lesson.content}
          </div>
        )}

        {/* Attached files */}
        {lesson.fileUrls.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#A19BA2]">Attachments</p>
            {lesson.fileUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-[#E4DDE4] p-3 text-sm hover:bg-[#FAF6FA]"
              >
                <FileIcon url={url} />
                <span className="min-w-0 flex-1 truncate font-medium text-[#433745]">
                  {decodeFileName(url)}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A19BA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </a>
            ))}
          </div>
        )}

        {!lesson.content && !lesson.contentUrl && lesson.imageUrls.length === 0 && lesson.fileUrls.length === 0 && (
          <p className="py-6 text-center text-sm text-[#A19BA2] italic">No content added to this lesson yet.</p>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-[#F0EBF0] pt-4">
          {onPrev ? (
            <button onClick={onPrev} className="flex items-center gap-1.5 text-sm font-medium text-[#726973] hover:text-[#440E48]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Previous
            </button>
          ) : <div />}
          {onNext ? (
            <button onClick={onNext} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: color }}>
              Next Lesson
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          ) : (
            <span className="rounded-lg bg-[#1DBA87]/10 px-4 py-2 text-sm font-semibold text-[#1DBA87]">Last Lesson</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Unified Lesson Form (Add / Edit) ─────────────────────────────────────────

function LessonForm({
  mode,
  courseId,
  lesson,
  onDone,
  onCancel,
}: {
  mode: "add" | "edit";
  courseId: string;
  lesson?: Lesson;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [content, setContent] = useState(lesson?.content ?? "");
  const [contentUrl, setContentUrl] = useState(lesson?.contentUrl ?? "");
  const [type, setType] = useState<LessonType>(lesson?.type ?? "ARTICLE");
  const [duration, setDuration] = useState(lesson?.duration?.toString() ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(lesson?.imageUrls ?? []);
  const [fileUrls, setFileUrls] = useState<string[]>(lesson?.fileUrls ?? []);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const field = "w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]";

  async function handleUpload(files: FileList | null, kind: "image" | "file") {
    if (!files || files.length === 0) return;
    setErr(null);
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        urls.push(blob.url);
      }
      if (kind === "image") setImageUrls((prev) => [...prev, ...urls]);
      else setFileUrls((prev) => [...prev, ...urls]);
    } catch (e) {
      setErr(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
      if (imgRef.current) imgRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const submit = () =>
    startTransition(async () => {
      const payload = {
        title,
        content,
        contentUrl,
        type,
        duration: duration ? parseInt(duration, 10) : null,
        imageUrls,
        fileUrls,
      };
      const res = mode === "add"
        ? await addLesson(courseId, payload)
        : await updateLesson(lesson!.id, payload);
      if (!res.ok) { setErr(res.error ?? "Failed"); return; }
      onDone();
    });

  const ytPreview = contentUrl ? extractYouTubeId(contentUrl) : null;

  return (
    <div className="m-card p-5 space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#726973]">
        {mode === "add" ? "Add new lesson" : "Edit lesson"}
      </h2>

      {/* Title + type + duration */}
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

      {/* Link / URL */}
      <div>
        <input className={field} placeholder="Link / URL (YouTube, Google Drive, etc.)" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
        {/* YouTube preview */}
        {ytPreview && (
          <div className="mt-2 aspect-video w-full max-w-md overflow-hidden rounded-lg bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytPreview}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Content text */}
      <textarea
        className={`${field} min-h-[100px] resize-y`}
        placeholder="Lesson content / notes…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {/* Image upload */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#726973]">Images</p>
        {imageUrls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border border-[#E4DDE4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`upload ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files, "image")} />
        <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-2 rounded-md border border-[#440E48] px-3 py-1.5 text-xs font-medium text-[#440E48] hover:bg-[#FAF6FA] disabled:opacity-60">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          {uploading ? "Uploading…" : "Upload Images"}
        </button>
      </div>

      {/* File upload */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#726973]">Files</p>
        {fileUrls.length > 0 && (
          <div className="mb-2 space-y-1">
            {fileUrls.map((url, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm">
                <FileIcon url={url} />
                <span className="min-w-0 flex-1 truncate text-[#433745]">{decodeFileName(url)}</span>
                <button type="button" onClick={() => setFileUrls((prev) => prev.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-[#A19BA2] hover:text-[#e2445c]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.pptx,.txt" multiple className="hidden" onChange={(e) => handleUpload(e.target.files, "file")} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-2 rounded-md border border-[#440E48] px-3 py-1.5 text-xs font-medium text-[#440E48] hover:bg-[#FAF6FA] disabled:opacity-60">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          {uploading ? "Uploading…" : "Upload Files (PDF, Doc, etc.)"}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-[#F0EBF0] pt-3">
        <button onClick={submit} disabled={pending || uploading || !title.trim()} className="m-btn disabled:opacity-60">
          {pending ? "Saving…" : mode === "add" ? "Add Lesson" : "Save Changes"}
        </button>
        <button onClick={onCancel} className="text-sm text-[#726973] hover:text-[#140516]">Cancel</button>
        {err && <span className="text-sm font-medium text-[#e2445c]">{err}</span>}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ?? null;
}

function decodeFileName(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    const last = parts[parts.length - 1] ?? "file";
    return decodeURIComponent(last).replace(/^[a-zA-Z0-9]+-/, "");
  } catch {
    return url.split("/").pop() ?? "file";
  }
}

function FileIcon({ url }: { url: string }) {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  const colors: Record<string, string> = {
    pdf: "#e2445c",
    doc: "#0073ea",
    docx: "#0073ea",
    xlsx: "#00c875",
    pptx: "#fdab3d",
    txt: "#726973",
  };
  const c = colors[ext] ?? "#726973";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: c }}>
      {ext.toUpperCase().slice(0, 4)}
    </div>
  );
}
