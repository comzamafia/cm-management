import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import {
  WEEKLY_TASKS, MONTHLY_TASKS, VENDORS, RESTAURANTS, DAYS,
  keys, nextDue, deadline, weekdayOf, weeklyStats, monthlyStats,
  overall, vendorsPaid, type Entries,
} from "./action-plan-data";

const PURPLE = "#440E48";
const GOLD = "#F4A626";
const DARK = "#1F2937";
const MID = "#4B5563";
const GRAY = "#9CA3AF";
const CREAM = "#FDF7E3";
const STRIPE = "#F7F9FC";
const GREEN = "#15803D";
const RED = "#DC2626";
const TILE_BORDER = "#E5E7EB";
const ROW_BORDER = "#EEF1F4";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, paddingBottom: 28 },
  header: { backgroundColor: PURPLE, paddingVertical: 16, paddingHorizontal: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  hTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Helvetica-Bold" },
  hCaption: { color: GOLD, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, marginTop: 4 },
  hRight: { color: GRAY, fontSize: 9, textAlign: "right" },
  hRightBold: { color: "#FFFFFF", fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  body: { paddingHorizontal: 28, paddingTop: 14 },
  tiles: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tile: { flex: 1, borderWidth: 1, borderColor: TILE_BORDER, borderRadius: 6, backgroundColor: "#FBFBFC", paddingVertical: 8, paddingHorizontal: 10 },
  tileLabel: { color: GRAY, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  tileValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  sectionTitle: { color: DARK, fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  thead: { flexDirection: "row", backgroundColor: PURPLE },
  th: { color: "#FFFFFF", fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.4, textTransform: "uppercase", paddingVertical: 5, paddingHorizontal: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: ROW_BORDER },
  cell: { fontSize: 8, paddingVertical: 4, paddingHorizontal: 4 },
  check: { fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center" },
  footer: { color: GRAY, fontSize: 7, marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: TILE_BORDER },
});

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-CA", { month: "short", day: "2-digit", year: "numeric" });
}

function ActionPlanPdf({ entries, todayISO, week, month }: {
  entries: Entries; todayISO: string; week: string; month: string;
}) {
  const [y, mo, d] = todayISO.split("-").map(Number);
  const today = new Date(y, mo - 1, d);
  const o = overall(entries, today);
  const wd = weekdayOf(today);
  const paid = vendorsPaid(entries);

  return (
    <Document title="Area Manager Action Plan" author="CM Operations">
      {/* Page 1: Weekly */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.hTitle}>Area Manager Action Plan</Text>
            <Text style={s.hCaption}>WEEKLY TASKS — {week}</Text>
          </View>
          <View>
            <Text style={s.hRightBold}>Completion: {o.pct}%</Text>
            <Text style={s.hRight}>{fmtDate(today)} · {o.done}/{o.total} done · {o.overdue} overdue</Text>
          </View>
        </View>
        <View style={s.body}>
          <View style={s.tiles}>
            <Tile label="Completed" value={String(o.done)} color={GREEN} />
            <Tile label="Total" value={String(o.total)} color={PURPLE} />
            <Tile label="Overdue" value={String(o.overdue)} color={RED} />
            <Tile label="Vendor Payments" value={`${paid}/${VENDORS.length}`} color={GOLD} />
          </View>

          <Text style={s.sectionTitle}>Weekly Tasks (Mon–Fri)</Text>
          <View style={s.thead} fixed>
            <Text style={[s.th, { flex: 3 }]}>Task</Text>
            <Text style={[s.th, { flex: 1.2 }]}>Category</Text>
            <Text style={[s.th, { flex: 0.8 }]}>Location</Text>
            {DAYS.map((d) => <Text key={d} style={[s.th, { flex: 0.5, textAlign: "center" }]}>{d}</Text>)}
            <Text style={[s.th, { flex: 0.6, textAlign: "center" }]}>Done</Text>
          </View>
          {WEEKLY_TASKS.map((t, i) => {
            const st = weeklyStats(t, entries, today);
            const bg = i % 2 === 0 ? STRIPE : "#FFFFFF";
            return (
              <View key={t.id} style={[s.row, { backgroundColor: bg }]} wrap={false}>
                <Text style={[s.cell, { flex: 3, fontFamily: "Helvetica-Bold" }]}>{t.task}</Text>
                <Text style={[s.cell, { flex: 1.2, color: MID }]}>{t.category}</Text>
                <Text style={[s.cell, { flex: 0.8, color: MID }]}>{t.location}</Text>
                {[1, 2, 3, 4, 5].map((day) => {
                  if (!t.days.includes(day)) return <Text key={day} style={[s.check, { flex: 0.5, color: "#cbd5e1" }]}>—</Text>;
                  const done = entries[keys.weekly(t.id, day)] === "1";
                  const color = done ? GREEN : (day <= wd && wd <= 5 ? RED : GRAY);
                  return <Text key={day} style={[s.check, { flex: 0.5, color }]}>{done ? "✓" : "□"}</Text>;
                })}
                <Text style={[s.check, { flex: 0.6, color: st.done === st.due ? GREEN : DARK }]}>{st.done}/{st.due}</Text>
              </View>
            );
          })}
          <Text style={s.footer}>Generated from CM Operations · {fmtDate(today)}</Text>
        </View>
      </Page>

      {/* Page 2: Monthly */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.hTitle}>Area Manager Action Plan</Text>
            <Text style={s.hCaption}>MONTHLY ACTION ITEMS — {month}</Text>
          </View>
          <View>
            <Text style={s.hRightBold}>Completion: {o.pct}%</Text>
            <Text style={s.hRight}>{fmtDate(today)}</Text>
          </View>
        </View>
        <View style={s.body}>
          <View style={s.thead} fixed>
            <Text style={[s.th, { flex: 2.5 }]}>Task</Text>
            <Text style={[s.th, { flex: 0.9, textAlign: "center" }]}>Due</Text>
            <Text style={[s.th, { flex: 0.9, textAlign: "center" }]}>Deadline</Text>
            {RESTAURANTS.map((r) => <Text key={r} style={[s.th, { flex: 0.55, textAlign: "center" }]}>{r}</Text>)}
            <Text style={[s.th, { flex: 0.5, textAlign: "center" }]}>Done</Text>
          </View>
          {MONTHLY_TASKS.map((t, i) => {
            const st = monthlyStats(t, entries, today);
            const bg = i % 2 === 0 ? STRIPE : "#FFFFFF";
            const past = today >= deadline(t, today);
            return (
              <View key={t.id} style={[s.row, { backgroundColor: bg }]} wrap={false}>
                <Text style={[s.cell, { flex: 2.5, fontFamily: "Helvetica-Bold" }]}>{t.task}</Text>
                <Text style={[s.cell, { flex: 0.9, textAlign: "center", color: MID }]}>{fmtDate(nextDue(t.dueDay, today))}</Text>
                <Text style={[s.cell, { flex: 0.9, textAlign: "center", color: MID }]}>{fmtDate(deadline(t, today))}</Text>
                {t.mode === "all" ? (
                  <>
                    <Text style={[s.check, { flex: RESTAURANTS.length * 0.55, color: entries[keys.monthlyAll(t.id)] === "1" ? GREEN : past ? RED : GRAY }]}>
                      {entries[keys.monthlyAll(t.id)] === "1" ? "✓" : "□"}
                    </Text>
                  </>
                ) : (
                  RESTAURANTS.map((loc) => {
                    if (!(t.applicable ?? []).includes(loc)) return <Text key={loc} style={[s.check, { flex: 0.55, color: "#cbd5e1" }]}>—</Text>;
                    const done = entries[keys.monthlyGrid(t.id, loc)] === "1";
                    return <Text key={loc} style={[s.check, { flex: 0.55, color: done ? GREEN : past ? RED : GRAY }]}>{done ? "✓" : "□"}</Text>;
                  })
                )}
                <Text style={[s.check, { flex: 0.5, color: st.done === st.due ? GREEN : DARK }]}>{st.done}/{st.due}</Text>
              </View>
            );
          })}

          {/* Vendors */}
          <Text style={s.sectionTitle}>Vendor Review Checklist</Text>
          <View style={s.thead}>
            <Text style={[s.th, { flex: 2 }]}>Vendor</Text>
            <Text style={[s.th, { flex: 1, textAlign: "center" }]}>Reviewed</Text>
            <Text style={[s.th, { flex: 1.5 }]}>Payment Date</Text>
            <Text style={[s.th, { flex: 2 }]}>Notes</Text>
          </View>
          {VENDORS.map((v, i) => {
            const reviewed = entries[keys.vendor(v, "reviewed")] === "1";
            const payDate = entries[keys.vendor(v, "payDate")] ?? "";
            const note = entries[keys.vendor(v, "note")] ?? "";
            const bg = i % 2 === 0 ? STRIPE : "#FFFFFF";
            return (
              <View key={v} style={[s.row, { backgroundColor: bg }]} wrap={false}>
                <Text style={[s.cell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{v}</Text>
                <Text style={[s.check, { flex: 1, color: reviewed ? GREEN : GRAY }]}>{reviewed ? "✓" : "□"}</Text>
                <Text style={[s.cell, { flex: 1.5, color: payDate ? GREEN : MID }]}>{payDate || "—"}</Text>
                <Text style={[s.cell, { flex: 2, color: MID }]}>{note || "—"}</Text>
              </View>
            );
          })}

          <Text style={s.footer}>Generated from CM Operations · {fmtDate(today)}</Text>
        </View>
      </Page>
    </Document>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={[s.tileValue, { color }]}>{value}</Text>
    </View>
  );
}

export function renderActionPlanPdf(
  entries: Entries, todayISO: string, week: string, month: string,
): Promise<Buffer> {
  return renderToBuffer(
    <ActionPlanPdf entries={entries} todayISO={todayISO} week={week} month={month} />,
  );
}
