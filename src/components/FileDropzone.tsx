"use client";

import { useRef, useState } from "react";
import { uploadFile } from "@/lib/upload-client";

// One unified uploader used everywhere (tasks, maintenance, projects, courses).
// - drag & drop or tap to browse (mobile shows camera for images)
// - image thumbnails, or file chips with a type badge + size
// - per-upload spinner + clear error messages
// Keeps a simple { value: string[]; onChange } API so callers stay tiny.

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  kind?: "image" | "file"; // image → thumbnails + camera; file → chips
  multiple?: boolean;
  disabled?: boolean;
  compact?: boolean;
  // When set, each uploaded file is reported individually and the dropzone does
  // NOT render its own previews (the caller persists + lists files itself).
  onUploaded?: (url: string, fileName: string) => void;
};

const IMAGE_ACCEPT = "image/*";
const FILE_ACCEPT = "image/*,.pdf,.doc,.docx,.xlsx,.pptx,.txt";

export function FileDropzone({
  value,
  onChange,
  folder = "uploads",
  kind = "file",
  multiple = true,
  disabled = false,
  compact = false,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || disabled) return;
    setErr(null);
    setBusy(true);
    try {
      const list = multiple ? Array.from(files) : [files[0]];
      if (onUploaded) {
        for (const f of list) onUploaded(await uploadFile(f, folder), f.name);
      } else {
        const urls: string[] = [];
        for (const f of list) urls.push(await uploadFile(f, folder));
        onChange(multiple ? [...value, ...urls] : urls);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const open = () => !disabled && !busy && inputRef.current?.click();

  return (
    <div className="space-y-2">
      {/* Previews */}
      {value.length > 0 && (
        kind === "image" ? (
          <div className="flex flex-wrap gap-2">
            {value.map((url, i) => (
              <div key={url + i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#E4DDE4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`upload ${i + 1}`} className="h-full w-full object-cover" />
                {!disabled && (
                  <button type="button" onClick={() => remove(i)} aria-label="Remove"
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {value.map((url, i) => (
              <div key={url + i} className="flex items-center gap-2 rounded-lg border border-[#E4DDE4] px-2.5 py-2 text-sm">
                <FileBadge url={url} />
                <a href={url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-[#440E48] hover:underline" title={decodeFileName(url)}>
                  {decodeFileName(url)}
                </a>
                {!disabled && (
                  <button type="button" onClick={() => remove(i)} aria-label="Remove" className="shrink-0 text-[#A19BA2] hover:text-[#e2445c]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Drop zone */}
      {!disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={kind === "image" ? IMAGE_ACCEPT : FILE_ACCEPT}
            {...(kind === "image" ? { capture: "environment" as const } : {})}
            multiple={multiple}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={open}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
            className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors ${
              compact ? "px-3 py-3" : "px-4 py-6"
            } ${drag ? "border-[#440E48] bg-[#FAF6FA]" : "border-[#E4DDE4] hover:border-[#440E48] hover:bg-[#FAF6FA]"} ${busy ? "opacity-70" : ""}`}
          >
            {busy ? (
              <span className="flex items-center gap-2 text-sm font-medium text-[#440E48]">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" /></svg>
                Uploading…
              </span>
            ) : (
              <>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3eef3] text-[#440E48]">
                  {kind === "image" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  )}
                </span>
                <span className="text-sm font-semibold text-[#440E48]">
                  {kind === "image" ? "Add photo" : "Upload file"}
                </span>
                {!compact && (
                  <span className="text-xs text-[#A19BA2]">
                    Tap to browse or drag &amp; drop{kind === "image" ? " · camera on mobile" : " · PDF, images, docs"}
                  </span>
                )}
              </>
            )}
          </button>
          {err && <p className="text-xs font-medium text-[#e2445c]">{err}</p>}
        </>
      )}
    </div>
  );
}

function decodeFileName(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").pop() ?? "file";
    return decodeURIComponent(last).replace(/^\d+-[a-f0-9]+\./, (m) => "." + m.split(".").pop());
  } catch {
    return url.split("/").pop() ?? "file";
  }
}

function FileBadge({ url }: { url: string }) {
  const ext = (decodeFileName(url).split(".").pop() ?? "").toLowerCase();
  const colors: Record<string, string> = {
    pdf: "#e2445c", doc: "#0073ea", docx: "#0073ea", xlsx: "#00c875",
    pptx: "#fdab3d", txt: "#726973", jpg: "#7C3AED", jpeg: "#7C3AED", png: "#7C3AED", webp: "#7C3AED",
  };
  const c = colors[ext] ?? "#726973";
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[9px] font-bold text-white" style={{ backgroundColor: c }}>
      {(ext || "file").toUpperCase().slice(0, 4)}
    </span>
  );
}
