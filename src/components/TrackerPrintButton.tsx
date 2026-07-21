"use client";

// Lightweight "Export PDF" — triggers the browser's print dialog (Save as PDF).
// The sidebar and other chrome already carry `print:hidden`, so the printed
// output is just the tracker card.
export function TrackerPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-[#440E48] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5a1560] print:hidden"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
      </svg>
      Export PDF
    </button>
  );
}
