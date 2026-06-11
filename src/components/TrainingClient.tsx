"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTrainingMaterial, deleteTrainingMaterial } from "@/lib/training";
import {
  TRAINING_CATEGORY_LABEL,
  TRAINING_CATEGORY_COLOR,
  type TrainingMaterialItem,
} from "@/lib/training-meta";
import { TrainingCategory } from "@prisma/client";

const CATEGORIES = Object.keys(TRAINING_CATEGORY_LABEL) as TrainingCategory[];

type Props = {
  materials: TrainingMaterialItem[];
  canCreate: boolean;
  isAdmin: boolean;
  locations: { id: string; name: string }[];
};

export function TrainingClient({ materials, canCreate, isAdmin, locations }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TrainingCategory | "ALL">("ALL");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TrainingCategory>("SOP");
  const [contentUrl, setContentUrl] = useState("");
  const [content, setContent] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const submit = () =>
    startTransition(async () => {
      if (!title.trim()) return;
      const res = await createTrainingMaterial({ title, description, category, contentUrl, content, locationId });
      if (!res.ok) { setErr(res.error ?? "Failed"); return; }
      setTitle(""); setDescription(""); setContentUrl(""); setContent("");
      setErr(null); setShowForm(false); router.refresh();
    });

  const handleDelete = (id: string) =>
    startTransition(async () => {
      await deleteTrainingMaterial(id);
      router.refresh();
    });

  const filtered = activeCategory === "ALL" ? materials : materials.filter((m) => m.category === activeCategory);

  // Group by category for display
  const grouped: Record<string, TrainingMaterialItem[]> = {};
  for (const m of filtered) {
    const key = TRAINING_CATEGORY_LABEL[m.category];
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  const field = "w-full rounded-md border border-[#e6e9ef] px-3 py-2 text-sm outline-none focus:border-[#0073ea]";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#323338]">Training Hub</h1>
          <p className="mt-0.5 text-sm text-[#676879]">SOPs, guides, and resources for your team</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm((v) => !v)} className="m-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Material
          </button>
        )}
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["ALL", ...CATEGORIES] as const).map((cat) => {
          const active = activeCategory === cat;
          const color = cat !== "ALL" ? TRAINING_CATEGORY_COLOR[cat] : "#0073ea";
          const count = cat === "ALL" ? materials.length : materials.filter((m) => m.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "text-white shadow-sm" : "bg-white text-[#676879] ring-1 ring-inset ring-[#e6e9ef] hover:bg-[#f5f6f8]"
              }`}
              style={active ? { backgroundColor: color } : {}}
            >
              {cat === "ALL" ? "All" : TRAINING_CATEGORY_LABEL[cat]} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="m-card p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#676879]">Add training material</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
            <select className={field} value={category} onChange={(e) => setCategory(e.target.value as TrainingCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{TRAINING_CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <input className={field} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className={field} placeholder="Link / URL (e.g. Google Drive, YouTube)" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
          <textarea
            className={`${field} min-h-[80px] resize-y`}
            placeholder="Or write inline content / notes here…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {isAdmin && (
            <select className={`${field} w-auto`} value={locationId ?? ""} onChange={(e) => setLocationId(e.target.value || null)}>
              <option value="">Company-wide</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          <div className="flex items-center gap-3">
            <button onClick={submit} disabled={pending || !title.trim()} className="m-btn disabled:opacity-60">
              {pending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-[#676879] hover:text-[#323338]">Cancel</button>
            {err && <span className="text-sm font-medium text-[#e2445c]">{err}</span>}
          </div>
        </div>
      )}

      {/* Materials grouped by category */}
      {Object.entries(grouped).map(([catLabel, items]) => (
        <div key={catLabel} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9699a6]">{catLabel}</p>
          <div className="space-y-2">
            {items.map((m) => (
              <MaterialCard
                key={m.id}
                material={m}
                isAdmin={isAdmin}
                expanded={expandedId === m.id}
                onExpand={() => setExpandedId(expandedId === m.id ? null : m.id)}
                onDelete={() => handleDelete(m.id)}
              />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="m-card p-12 text-center text-[#9699a6]">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">No training materials yet.</p>
          {canCreate && <p className="text-sm mt-1">Click "Add Material" to create the first one.</p>}
        </div>
      )}
    </div>
  );
}

function MaterialCard({
  material: m,
  isAdmin,
  expanded,
  onExpand,
  onDelete,
}: {
  material: TrainingMaterialItem;
  isAdmin: boolean;
  expanded: boolean;
  onExpand: () => void;
  onDelete: () => void;
}) {
  const color = TRAINING_CATEGORY_COLOR[m.category];
  const hasContent = m.contentUrl || m.content;
  const isLong = (m.content ?? "").length > 200;

  return (
    <div className="m-card p-4 sm:p-5 flex gap-3">
      {/* Category color dot */}
      <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold text-[#323338]">{m.title}</p>
            {m.description && (
              <p className="mt-0.5 text-sm text-[#676879]">{m.description}</p>
            )}
            <p className="mt-0.5 text-xs text-[#9699a6]">
              {m.createdByName} · {m.locationName ?? "Company-wide"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {TRAINING_CATEGORY_LABEL[m.category]}
            </span>
            {isAdmin && (
              <button onClick={onDelete} title="Delete" className="text-[#9699a6] hover:text-[#e2445c]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Link */}
        {m.contentUrl && (
          <a
            href={m.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#0073ea] hover:underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open resource
          </a>
        )}

        {/* Inline content */}
        {m.content && (
          <div>
            <div className={`mt-2 text-sm text-[#323338] whitespace-pre-wrap leading-relaxed ${!expanded && isLong ? "line-clamp-3" : ""}`}>
              {m.content}
            </div>
            {isLong && (
              <button onClick={onExpand} className="mt-1 text-xs text-[#0073ea] hover:underline">
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {!hasContent && (
          <p className="mt-1 text-xs text-[#9699a6] italic">No content attached.</p>
        )}
      </div>
    </div>
  );
}
