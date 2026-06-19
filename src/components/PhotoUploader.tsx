"use client";

import { useRef, useState } from "react";
import { uploadFiles } from "@/lib/upload-client";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

export function PhotoUploader({ value, onChange, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteUrl, setPasteUrl] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setBusy(true);
    try {
      const urls = await uploadFiles(Array.from(files), "photos");
      onChange([...value, ...urls]);
    } catch (e) {
      setErr(`Upload failed: ${(e as Error).message}`);
      setShowPaste(true);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addPasted() {
    const u = pasteUrl.trim();
    if (!u) return;
    onChange([...value, u]);
    setPasteUrl("");
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={url + i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#e6e9ef]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`proof ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || busy}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || busy}
          className="inline-flex items-center gap-2 rounded-md border border-[#0073ea] px-3 py-2 text-sm font-medium text-[#0073ea] hover:bg-[#e6f1fd] disabled:opacity-60"
        >
          {busy ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take / upload photo
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowPaste((v) => !v)}
          className="text-xs text-[#676879] hover:text-[#0073ea]"
        >
          or paste a URL
        </button>
      </div>

      {showPaste && (
        <div className="flex gap-2">
          <input
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder="https://…/proof.jpg"
            className="flex-1 rounded-md border border-[#e6e9ef] px-3 py-2 text-sm outline-none focus:border-[#0073ea]"
          />
          <button
            type="button"
            onClick={addPasted}
            className="rounded-md bg-[#0073ea] px-3 py-2 text-sm font-medium text-white hover:bg-[#0060b9]"
          >
            Add
          </button>
        </div>
      )}

      {err && <p className="text-sm font-medium text-[#e2445c]">{err}</p>}
    </div>
  );
}
