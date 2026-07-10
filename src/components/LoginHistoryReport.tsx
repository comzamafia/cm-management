import type { LoginHistoryDay } from "@/lib/login-history";

const ACTION_STYLE: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  "user.login": { label: "Login", bg: "bg-[#1DBA871a]", text: "text-[#1DBA87]", icon: "↓" },
  "user.logout": { label: "Logout", bg: "bg-[#A19BA21a]", text: "text-[#726973]", icon: "↑" },
};

export function LoginHistoryReport({ days, showUser }: { days: LoginHistoryDay[]; showUser: boolean }) {
  return (
    <div className="m-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-base font-bold text-[#140516]">Login / Logout History</h2>
        <span className="text-xs text-[#A19BA2]">Last 30 days</span>
      </div>
      <p className="mb-3 text-xs text-[#726973]">
        {showUser ? "Team sign-in activity within your scope." : "Your sign-in activity."}
      </p>

      {days.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#A19BA2]">No login activity in the last 30 days.</p>
      ) : (
        <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
          {days.map((day) => (
            <div key={day.dateISO}>
              <div className="sticky top-0 mb-1.5 bg-white/95 py-1 text-[11px] font-bold uppercase tracking-wider text-[#A19BA2] backdrop-blur-sm">
                {day.dateLabel}
              </div>
              <ul className="divide-y divide-[#f3eef3]">
                {day.events.map((e) => {
                  const s = ACTION_STYLE[e.action];
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                          {s.icon}
                        </span>
                        {showUser && <span className="truncate font-medium text-[#140516]">{e.userName}</span>}
                        <span className={`shrink-0 text-xs font-semibold ${s.text}`}>{s.label}</span>
                        {showUser && e.locationName && (
                          <span className="hidden truncate text-xs text-[#A19BA2] sm:inline">· {e.locationName}</span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-[#A19BA2]">
                        {e.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
