// Monthly financial-close checklist — modeled from Hang's Monthly Checklist.
// Categories group recurring close tasks; each item has a due day-of-month.
// "amount" categories capture a dollar figure instead of a status (cash-flow view).

export type CategoryKind = "status" | "amount";

export type ChecklistItem = {
  id: string;
  label: string;
  due?: number; // day of the selected month
};

export type ChecklistCategory = {
  id: string;
  n: number;
  title: string;
  freq?: string;
  emoji: string;
  color: string;
  kind: CategoryKind;
  items: ChecklistItem[];
};

export const MONTHLY_CHECKLIST: ChecklistCategory[] = [
  {
    id: "payroll", n: 1, title: "Payroll", freq: "Semi-Monthly", emoji: "👥", color: "#00c875", kind: "status",
    items: [
      { id: "payroll-1", label: "Process Payroll #1 (1st – 15th)", due: 22 },
      { id: "payroll-2", label: "Process Payroll #2 (16th – End)", due: 7 },
      { id: "payroll-3", label: "Payroll audit completed", due: 30 },
      { id: "payroll-4", label: "Missing punches reviewed", due: 30 },
      { id: "payroll-5", label: "Payroll adjustments completed", due: 30 },
      { id: "payroll-6", label: "Final review & approval", due: 30 },
    ],
  },
  {
    id: "tipouts", n: 2, title: "Tip Outs", freq: "Monthly", emoji: "💵", color: "#a25ddc", kind: "status",
    items: [
      { id: "tip-1", label: "FOH tip-out calculated", due: 30 },
      { id: "tip-2", label: "BOH tip-out calculated", due: 30 },
      { id: "tip-3", label: "Manager tip allocation", due: 30 },
      { id: "tip-4", label: "Tip reconciliation", due: 30 },
      { id: "tip-5", label: "Final review & approval", due: 30 },
    ],
  },
  {
    id: "vendors", n: 3, title: "Vendor Payments", freq: "Before 10th", emoji: "🛒", color: "#fdab3d", kind: "status",
    items: [
      { id: "vendor-1", label: "Review vendor bills", due: 9 },
      { id: "vendor-2", label: "Approve payments", due: 9 },
      { id: "vendor-3", label: "Pay vendors", due: 10 },
      { id: "vendor-4", label: "Confirm all payments processed", due: 10 },
    ],
  },
  {
    id: "reconciliation", n: 4, title: "Reconciliation / Balance", emoji: "⚖️", color: "#0073ea", kind: "status",
    items: [
      { id: "recon-1", label: "Bank reconciliation", due: 5 },
      { id: "recon-2", label: "Credit card reconciliation", due: 5 },
      { id: "recon-3", label: "Cash deposits verified", due: 5 },
      { id: "recon-4", label: "POS sales vs bank deposits", due: 5 },
      { id: "recon-5", label: "3rd party deposits matched", due: 5 },
    ],
  },
  {
    id: "bonus", n: 5, title: "Manager Bonus", emoji: "🎁", color: "#00c875", kind: "status",
    items: [
      { id: "bonus-1", label: "Review performance vs targets", due: 12 },
      { id: "bonus-2", label: "Calculate bonus", due: 12 },
      { id: "bonus-3", label: "Manager bonus approval", due: 15 },
      { id: "bonus-4", label: "Bonus payment processed", due: 20 },
    ],
  },
  {
    id: "ar", n: 6, title: "Accounts Receivable", emoji: "🧾", color: "#1dba87", kind: "status",
    items: [
      { id: "ar-1", label: "Catering invoices follow up", due: 10 },
      { id: "ar-2", label: "Corporate accounts follow up", due: 10 },
      { id: "ar-3", label: "Record payments received", due: 15 },
      { id: "ar-4", label: "Reconcile A/R", due: 15 },
    ],
  },
  {
    id: "reporting", n: 7, title: "Month-End Reporting", emoji: "📊", color: "#e2445c", kind: "status",
    items: [
      { id: "report-1", label: "Sales summary", due: 3 },
      { id: "report-2", label: "Labour summary", due: 3 },
      { id: "report-3", label: "Food cost summary", due: 3 },
      { id: "report-4", label: "P&L review", due: 3 },
      { id: "report-5", label: "Finalize month-end package", due: 5 },
    ],
  },
  {
    id: "compliance", n: 8, title: "Compliance & Government", emoji: "🛡️", color: "#fdab3d", kind: "status",
    items: [
      { id: "comp-1", label: "Payroll remittances", due: 15 },
      { id: "comp-2", label: "HST tracking", due: 15 },
      { id: "comp-3", label: "WSIB payment", due: 15 },
      { id: "comp-4", label: "EHT review", due: 15 },
      { id: "comp-5", label: "Review CRA notices", due: 15 },
    ],
  },
  {
    id: "cashflow", n: 9, title: "Cash Flow Check", freq: "Weekly", emoji: "💲", color: "#00c875", kind: "amount",
    items: [
      { id: "cash-1", label: "Bank Balance", due: 3 },
      { id: "cash-2", label: "Upcoming Payroll", due: 3 },
      { id: "cash-3", label: "Upcoming Vendor Payments", due: 3 },
      { id: "cash-4", label: "Rent / Lease", due: 3 },
      { id: "cash-5", label: "Available Cash After Obligations", due: 3 },
    ],
  },
  {
    id: "approvals", n: 10, title: "Approvals Needed", emoji: "✅", color: "#0073ea", kind: "status",
    items: [
      { id: "appr-1", label: "Manager Bonus Approval", due: 15 },
      { id: "appr-2", label: "Large Vendor Payments", due: 10 },
      { id: "appr-3", label: "New Vendor Setup", due: 10 },
      { id: "appr-4", label: "Credit Applications", due: 10 },
      { id: "appr-5", label: "Capital Purchases", due: 10 },
    ],
  },
];

export const CHECKLIST_DOCUMENTS = [
  "Payroll Templates",
  "Tip Out Template",
  "Vendor List",
  "Bank Reconciliation Template",
  "Month End Reporting Pack",
];
