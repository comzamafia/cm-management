"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "logbookTheme";

export function LogbookThemeToggle({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") setTheme(stored);
    setReady(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div className={`logbook-root -m-4 lg:-m-8 p-4 pb-24 lg:p-8 ${ready ? (theme === "dark" ? "logbook-dark" : "logbook-light") : "logbook-dark"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--lb-text)" }}>Logbook</h1>
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--lb-border)", color: "var(--lb-text-soft)" }}
          >
            {theme === "dark" ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                Light mode
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                Dark mode
              </>
            )}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
