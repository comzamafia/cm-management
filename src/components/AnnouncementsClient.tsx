"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAnnouncement,
  markAnnouncementRead,
  togglePin,
  deleteAnnouncement,
  type AnnouncementWithMeta,
} from "@/lib/announcements";

type Props = {
  announcements: AnnouncementWithMeta[];
  canCreate: boolean;
  isAdmin: boolean;
  locations: { id: string; name: string }[];
};

function timeAgo(date: Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AnnouncementsClient({ announcements, canCreate, isAdmin, locations }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const submit = () =>
    startTransition(async () => {
      if (!title.trim() || !body.trim()) return;
      const res = await createAnnouncement({ title, body, pinned, locationId });
      if (!res.ok) { setErr(res.error ?? "Failed"); return; }
      setTitle(""); setBody(""); setPinned(false); setLocationId(null);
      setErr(null); setShowForm(false); router.refresh();
    });

  const markRead = (id: string) =>
    startTransition(async () => {
      await markAnnouncementRead(id);
      router.refresh();
    });

  const handlePin = (id: string, currentPinned: boolean) =>
    startTransition(async () => {
      await togglePin(id, !currentPinned);
      router.refresh();
    });

  const handleDelete = (id: string) =>
    startTransition(async () => {
      await deleteAnnouncement(id);
      router.refresh();
    });

  const field = "w-full rounded-md border border-[#e6e9ef] px-3 py-2 text-sm outline-none focus:border-[#0073ea]";

  const pinned_items = announcements.filter((a) => a.pinned);
  const regular = announcements.filter((a) => !a.pinned);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#323338]">Announcements</h1>
          <p className="mt-0.5 text-sm text-[#676879]">
            {announcements.length} post{announcements.length !== 1 ? "s" : ""} · {announcements.filter((a) => !a.readByMe).length} unread
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm((v) => !v)} className="m-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Announcement
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="m-card p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#676879]">Post announcement</h2>
          <input
            className={field}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={`${field} min-h-[100px] resize-y`}
            placeholder="Write your announcement here…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex flex-wrap gap-3 items-center">
            {isAdmin && (
              <select
                className={`${field} w-auto`}
                value={locationId ?? ""}
                onChange={(e) => setLocationId(e.target.value || null)}
              >
                <option value="">Company-wide</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-[#323338] cursor-pointer">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-[#0073ea]" />
              Pin to top
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={pending || !title.trim() || !body.trim()}
              className="m-btn disabled:opacity-60"
            >
              {pending ? "Posting…" : "Post"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-[#676879] hover:text-[#323338]">Cancel</button>
            {err && <span className="text-sm font-medium text-[#e2445c]">{err}</span>}
          </div>
        </div>
      )}

      {/* Pinned section */}
      {pinned_items.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#fdab3d] flex items-center gap-1.5">
            <PinIcon filled={true} /> Pinned
          </p>
          {pinned_items.map((a) => (
            <AnnouncementCard
              key={a.id}
              ann={a}
              isAdmin={isAdmin}
              expanded={expandedId === a.id}
              onExpand={() => setExpandedId(expandedId === a.id ? null : a.id)}
              onMarkRead={() => markRead(a.id)}
              onPin={() => handlePin(a.id, a.pinned)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}

      {/* Regular section */}
      {regular.length > 0 && (
        <div className="space-y-3">
          {pinned_items.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9699a6]">All posts</p>
          )}
          {regular.map((a) => (
            <AnnouncementCard
              key={a.id}
              ann={a}
              isAdmin={isAdmin}
              expanded={expandedId === a.id}
              onExpand={() => setExpandedId(expandedId === a.id ? null : a.id)}
              onMarkRead={() => markRead(a.id)}
              onPin={() => handlePin(a.id, a.pinned)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}

      {announcements.length === 0 && (
        <div className="m-card p-12 text-center text-[#9699a6]">
          <p className="text-4xl mb-3">📢</p>
          <p className="font-medium">No announcements yet.</p>
          {canCreate && <p className="text-sm mt-1">Click "New Announcement" to post the first one.</p>}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({
  ann,
  isAdmin,
  expanded,
  onExpand,
  onMarkRead,
  onPin,
  onDelete,
}: {
  ann: AnnouncementWithMeta;
  isAdmin: boolean;
  expanded: boolean;
  onExpand: () => void;
  onMarkRead: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const isLong = ann.body.length > 240;
  return (
    <div className={`m-card p-4 sm:p-5 transition-all ${!ann.readByMe ? "border-l-4 border-l-[#0073ea]" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6f1fd] text-[11px] font-bold text-[#0073ea]">
          {ann.authorName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-[#323338] leading-snug">
                {!ann.readByMe && (
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#0073ea] align-middle" />
                )}
                {ann.title}
              </p>
              <p className="mt-0.5 text-xs text-[#9699a6]">
                {ann.authorName} · {timeAgo(ann.createdAt)}
                {ann.locationName ? ` · ${ann.locationName}` : " · Company-wide"}
                {ann.readCount > 0 && ` · ${ann.readCount} read`}
              </p>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {ann.pinned && (
                <span className="text-[#fdab3d]"><PinIcon filled={true} /></span>
              )}
              {!ann.readByMe && (
                <button onClick={onMarkRead} className="text-xs text-[#0073ea] font-medium hover:underline">
                  Mark read
                </button>
              )}
              {isAdmin && (
                <>
                  <button
                    onClick={onPin}
                    title={ann.pinned ? "Unpin" : "Pin"}
                    className="text-[#9699a6] hover:text-[#fdab3d]"
                  >
                    <PinIcon filled={ann.pinned} />
                  </button>
                  <button
                    onClick={onDelete}
                    title="Delete"
                    className="text-[#9699a6] hover:text-[#e2445c]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Body */}
          <div className={`mt-2 text-sm text-[#323338] whitespace-pre-wrap leading-relaxed ${!expanded && isLong ? "line-clamp-3" : ""}`}>
            {ann.body}
          </div>
          {isLong && (
            <button onClick={onExpand} className="mt-1 text-xs text-[#0073ea] hover:underline">
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  );
}
