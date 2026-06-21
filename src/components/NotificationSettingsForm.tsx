"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNotificationSettings, type NotificationSettingsValues } from "@/lib/settings";

export function NotificationSettingsForm({ initial }: { initial: NotificationSettingsValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nearDueEnabled, setNearDueEnabled] = useState(initial.nearDueEnabled);
  const [nearDueHours, setNearDueHours] = useState(String(initial.nearDueHours));
  const [complianceEnabled, setComplianceEnabled] = useState(initial.complianceRemindersEnabled);
  const [thresholds, setThresholds] = useState(initial.complianceThresholds.join(", "));
  const [pushEnabled, setPushEnabled] = useState(initial.pushEnabled);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const save = () =>
    startTransition(async () => {
      setMsg(null);
      const parsed = thresholds
        .split(/[\s,]+/)
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n));
      const res = await updateNotificationSettings({
        nearDueEnabled,
        nearDueHours: parseInt(nearDueHours, 10) || 2,
        complianceRemindersEnabled: complianceEnabled,
        complianceThresholds: parsed,
        pushEnabled,
      });
      if (!res.ok) { setMsg({ kind: "err", text: res.error ?? "Failed" }); return; }
      setMsg({ kind: "ok", text: "Saved." });
      router.refresh();
    });

  return (
    <div className="space-y-4">
      {/* Master push toggle */}
      <Card>
        <Row
          title="Push notifications for reminders"
          desc="Master switch — send the daily reminders as push to devices that opted in."
        >
          <Toggle on={pushEnabled} onChange={setPushEnabled} />
        </Row>
      </Card>

      {/* Task near-due */}
      <Card>
        <Row title="Task “due soon” reminder" desc="Remind the assignee before a task's due time.">
          <Toggle on={nearDueEnabled} onChange={setNearDueEnabled} />
        </Row>
        {nearDueEnabled && (
          <div className="mt-3 flex items-center gap-2 border-t border-[#F0EBF0] pt-3">
            <span className="text-sm text-[#433745]">Send</span>
            <input
              type="number" min={1} max={72} value={nearDueHours}
              onChange={(e) => setNearDueHours(e.target.value)}
              className="w-20 rounded-lg border border-[#E4DDE4] px-3 py-1.5 text-sm outline-none focus:border-[#440E48]"
            />
            <span className="text-sm text-[#433745]">hour(s) before the due time (1–72).</span>
          </div>
        )}
      </Card>

      {/* Compliance */}
      <Card>
        <Row title="Compliance advance reminders" desc="Remind owner & manager before a compliance task is due.">
          <Toggle on={complianceEnabled} onChange={setComplianceEnabled} />
        </Row>
        {complianceEnabled && (
          <div className="mt-3 border-t border-[#F0EBF0] pt-3">
            <label className="mb-1 block text-sm text-[#433745]">Days before due to remind</label>
            <input
              type="text" value={thresholds}
              onChange={(e) => setThresholds(e.target.value)}
              placeholder="14, 7, 3, 1"
              className="w-full rounded-lg border border-[#E4DDE4] px-3 py-2 text-sm outline-none focus:border-[#440E48]"
            />
            <p className="mt-1 text-xs text-[#A19BA2]">Comma-separated days (e.g. 14, 7, 3, 1). One reminder per threshold crossed.</p>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending}
          className="rounded-lg bg-[#440E48] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
        {msg && (
          <span className={`text-sm font-medium ${msg.kind === "ok" ? "text-[#1DBA87]" : "text-[#e2445c]"}`}>{msg.text}</span>
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#E4DDE4] bg-white p-4">{children}</div>;
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-bold text-[#140516]">{title}</div>
        <div className="text-xs text-[#726973]">{desc}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-[#440E48]" : "bg-[#D8D2D8]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
