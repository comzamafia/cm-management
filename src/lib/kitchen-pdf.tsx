import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { KitchenPrep } from "./reservation-data";

const NAVY = "#10213F";
const RED = "#DC2626";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const GRAY = "#6B7280";
const BORDER = "#E4E7EC";
const STRIPE = "#FFF8EE";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: NAVY, padding: 28 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: AMBER, paddingBottom: 10, marginBottom: 12 },
  hTitle: { fontSize: 19, fontFamily: "Helvetica-Bold", color: NAVY },
  hCaption: { color: AMBER, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, marginTop: 3 },
  hRight: { color: GRAY, fontSize: 8, textAlign: "right" },
  hRightBold: { color: NAVY, fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },

  tiles: { flexDirection: "row", gap: 8, marginBottom: 14 },
  tile: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 6, backgroundColor: "#FBFBFC", paddingVertical: 8, paddingHorizontal: 9 },
  tileLabel: { color: GRAY, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textTransform: "uppercase" },
  tileValue: { color: NAVY, fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 3 },

  sectionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6 },

  thead: { flexDirection: "row", backgroundColor: NAVY, borderRadius: 3 },
  th: { color: "#FFFFFF", fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.4, textTransform: "uppercase", paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  td: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 5 },

  badge: { fontSize: 7.5, fontFamily: "Helvetica-Bold", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 9, alignSelf: "flex-start" },

  row2: { flexDirection: "row", gap: 12, marginTop: 14 },
  card: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 9 },
  bullet: { fontSize: 8, color: NAVY, marginBottom: 3, lineHeight: 1.3 },

  footer: { color: GRAY, fontSize: 7, position: "absolute", bottom: 16, left: 28, right: 28, paddingTop: 6, borderTopWidth: 1, borderTopColor: BORDER },
});

function fmtDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function bandStyle(band: "BUSY" | "QUIET"): { bg: string; text: string; label: string; action: string } {
  return band === "BUSY"
    ? { bg: "#FEE2E2", text: RED, label: "ALL HANDS", action: "All stations manned — hold breaks, prep runners on standby." }
    : { bg: "#DCFCE7", text: GREEN, label: "GOOD BREAK WINDOW", action: "Safe to rotate staff breaks or get ahead on mise en place." };
}

function KitchenPdf({ locationName, day, generatedAt, prep }: {
  locationName: string; day: string; generatedAt: Date; prep: KitchenPrep;
}) {
  return (
    <Document title="Kitchen Prep Sheet" author="CM Operations">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.hTitle}>{locationName.toUpperCase()}</Text>
            <Text style={s.hCaption}>KITCHEN PREP SHEET</Text>
          </View>
          <View>
            <Text style={s.hRightBold}>{fmtDate(day)}</Text>
            <Text style={s.hRight}>Generated {generatedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</Text>
          </View>
        </View>

        {/* KPI tiles */}
        <View style={s.tiles}>
          <View style={s.tile}>
            <Text style={s.tileLabel}>Total Covers</Text>
            <Text style={s.tileValue}>{prep.totalCovers}</Text>
          </View>
          <View style={s.tile}>
            <Text style={s.tileLabel}>Reservations</Text>
            <Text style={s.tileValue}>{prep.totalReservations}</Text>
          </View>
          <View style={s.tile}>
            <Text style={s.tileLabel}>Peak Time</Text>
            <Text style={[s.tileValue, { color: RED }]}>{prep.peakLabel ?? "—"}</Text>
          </View>
          <View style={s.tile}>
            <Text style={s.tileLabel}>Peak Covers</Text>
            <Text style={[s.tileValue, { color: RED }]}>{prep.peakCovers}</Text>
          </View>
        </View>

        {/* Timeline */}
        <Text style={s.sectionTitle}>Tonight&apos;s Timeline — When To Prep vs. When To Push</Text>
        <View style={s.thead}>
          <Text style={[s.th, { flex: 1.3 }]}>Window</Text>
          <Text style={[s.th, { flex: 1 }]}>Covers</Text>
          <Text style={[s.th, { flex: 1.4 }]}>Status</Text>
          <Text style={[s.th, { flex: 3.3 }]}>Kitchen Action</Text>
        </View>
        {prep.windows.map((w, i) => {
          const bs = bandStyle(w.band);
          return (
            <View key={i} style={[s.tr, { backgroundColor: i % 2 === 0 ? STRIPE : "#FFFFFF" }]} wrap={false}>
              <Text style={[s.td, { flex: 1.3, fontFamily: "Helvetica-Bold" }]}>{w.startLabel} – {w.endLabel}</Text>
              <Text style={[s.td, { flex: 1, color: GRAY }]}>{w.totalCovers} covers / {w.totalReservations} res.</Text>
              <View style={[s.td, { flex: 1.4 }]}>
                <Text style={[s.badge, { backgroundColor: bs.bg, color: bs.text }]}>{bs.label}</Text>
              </View>
              <Text style={[s.td, { flex: 3.3, color: GRAY }]}>{bs.action}</Text>
            </View>
          );
        })}
        {prep.windows.length === 0 && <Text style={{ fontSize: 8, color: GRAY, marginTop: 6 }}>No active reservations tonight.</Text>}

        {/* Alerts + Summary */}
        <View style={s.row2}>
          <View style={s.card} wrap={false}>
            <Text style={[s.sectionTitle, { fontSize: 9.5 }]}>Large Party / Birthday Prep Alerts</Text>
            {prep.largePartyAlerts.length === 0 ? (
              <Text style={{ fontSize: 8, color: GRAY }}>No large parties flagged tonight.</Text>
            ) : (
              prep.largePartyAlerts.map((a, i) => (
                <Text key={i} style={s.bullet}>• {a.timeLabel} — {a.note}</Text>
              ))
            )}
          </View>

          <View style={s.card} wrap={false}>
            <Text style={[s.sectionTitle, { fontSize: 9.5 }]}>Manager Summary</Text>
            {prep.summary.length === 0 ? (
              <Text style={{ fontSize: 8, color: GRAY }}>Nothing flagged — steady night.</Text>
            ) : (
              prep.summary.map((line, i) => <Text key={i} style={s.bullet}>• {line}</Text>)
            )}
          </View>
        </View>

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Kitchen Prep Sheet | Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}

export function renderKitchenPrepPdf(
  locationName: string, day: string, generatedAt: Date, prep: KitchenPrep,
): Promise<Buffer> {
  return renderToBuffer(<KitchenPdf locationName={locationName} day={day} generatedAt={generatedAt} prep={prep} />);
}
