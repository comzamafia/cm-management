"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importReservationCsv } from "@/lib/reservations";

export function ReservationUpload({ locationId }: { locationId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function handleFile(file: File) {
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        const res = await importReservationCsv(text, locationId, file.name);
        if (!res.ok) {
          setMessage({ ok: false, text: res.error ?? "Import failed" });
          return;
        }
        setMessage({ ok: true, text: `Imported ${res.rowCount} rows for ${res.businessDate}.` });
        router.refresh();
      });
    };
    reader.onerror = () => setMessage({ ok: false, text: "Couldn't read that file" });
    reader.readAsText(file);
  }

  return (
    <div className="m-card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <h3 className="text-sm font-bold text-[#140516]">Upload Reservation CSV</h3>
        <p className="text-xs text-[#726973]">Upload today&apos;s reservation export to refresh the dashboard.</p>
      </div>
      <div className="flex items-center gap-3">
        {message && (
          <span className={`text-xs font-medium ${message.ok ? "text-[#1DBA87]" : "text-[#e2445c]"}`}>
            {message.text}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="m-btn disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload CSV"}
        </button>
      </div>
    </div>
  );
}
