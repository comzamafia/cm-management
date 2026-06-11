"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AttachmentType } from "@prisma/client";
import { addAttachment, deleteAttachment } from "@/lib/attachments";
import { PhotoUploader } from "./PhotoUploader";

type Attachment = { id: string; type: AttachmentType; url: string };

const TYPE_LABEL: Record<AttachmentType, string> = {
  PHOTO: "Photo",
  DOC: "Document",
  SOP: "SOP",
  VIDEO: "Video",
};

export function TaskAttachmentsManager({
  taskId,
  attachments,
  canManage,
}: {
  taskId: string;
  attachments: Attachment[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<AttachmentType>("SOP");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(t: AttachmentType, u: string) {
    if (!u.trim()) return;
    setError(null);
    start(async () => {
      const res = await addAttachment({ taskId, type: t, url: u });
      if (!res.ok) return setError(res.error ?? "Failed");
      setUrl("");
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => {
      await deleteAttachment(id);
      router.refresh();
    });
  }

  if (!canManage && attachments.length === 0) return null;

  return (
    <div className="m-card p-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#726973]">Attachments & SOPs</h2>

      {attachments.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="group flex items-center gap-2 text-sm">
              <span className="rounded bg-[#F0EBF0] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#440E48]">
                {TYPE_LABEL[a.type]}
              </span>
              <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-[#440E48] hover:underline">
                {a.url}
              </a>
              {canManage && (
                <button
                  onClick={() => remove(a.id)}
                  disabled={pending}
                  aria-label="Remove attachment"
                  className="opacity-0 transition group-hover:opacity-100 text-[#A19BA2] hover:text-[#943B13]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="space-y-3 border-t border-[#F0EBF0] pt-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AttachmentType)}
              className="rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48]"
            >
              {(Object.keys(TYPE_LABEL) as AttachmentType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a link (SOP, doc, video…)"
              className="flex-1 rounded-lg border border-[#E4DDE4] bg-white px-3 py-2 text-sm outline-none focus:border-[#440E48]"
            />
            <button
              onClick={() => add(type, url)}
              disabled={pending || !url.trim()}
              className="rounded-lg bg-[#F0EBF0] px-4 py-2 text-sm font-semibold text-[#440E48] hover:bg-[#E4DDE4] disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div>
            <p className="mb-1 text-xs text-[#A19BA2]">or upload a photo:</p>
            <PhotoUploader
              value={[]}
              onChange={(urls) => {
                const last = urls[urls.length - 1];
                if (last) add("PHOTO", last);
              }}
              disabled={pending}
            />
          </div>
          {error && <p className="text-sm font-medium text-[#943B13]">{error}</p>}
        </div>
      )}
    </div>
  );
}
