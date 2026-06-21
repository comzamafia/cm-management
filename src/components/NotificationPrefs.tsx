"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyPushPrefs } from "@/lib/push-actions";
import { PUSH_CATEGORY_LABEL, type PushCategory } from "@/lib/push-meta";

const CATEGORIES = Object.keys(PUSH_CATEGORY_LABEL) as PushCategory[];

export function NotificationPrefs({ muted }: { muted: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [set, setSet] = useState<Set<string>>(new Set(muted));
  const [saved, setSaved] = useState(false);

  const toggle = (c: PushCategory) => {
    const next = new Set(set);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setSet(next);
    setSaved(false);
    startTransition(async () => {
      await updateMyPushPrefs([...next]);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-[#E4DDE4] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-[#140516]">What to notify me about</div>
          <div className="text-xs text-[#726973]">Turn off push for categories you don&apos;t need. (In-app notifications still appear.)</div>
        </div>
        {saved && <span className="text-xs font-medium text-[#1DBA87]">Saved</span>}
      </div>
      <div className="divide-y divide-[#F0EBF0]">
        {CATEGORIES.map((c) => {
          const on = !set.has(c); // muted = off
          return (
            <div key={c} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-[#433745]">{PUSH_CATEGORY_LABEL[c]}</span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={pending}
                onClick={() => toggle(c)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[#440E48]" : "bg-[#D8D2D8]"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
