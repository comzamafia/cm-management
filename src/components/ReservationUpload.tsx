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
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
      style={{ background: "var(--rv-card)", borderColor: "var(--rv-border)" }}
    >
      <div>
        <h3 className="text-sm font-bold" style={{ color: "var(--rv-navy)" }}>Upload Reservation CSV</h3>
        <p className="text-xs" style={{ color: "var(--rv-text-soft)" }}>Upload today&apos;s reservation export to refresh the dashboard.</p>
      </div>
      <div className="flex items-center gap-3">
        {message && (
          <span className="text-xs font-semibold" style={{ color: message.ok ? "var(--rv-green)" : "var(--rv-red)" }}>
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
          className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: "var(--rv-blue)" }}
        >
          {busy ? "Uploading…" : "Upload CSV"}
        </button>
      </div>
    </div>
  );
}
