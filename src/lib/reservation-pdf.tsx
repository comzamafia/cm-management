import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Dashboard } from "./reservation-data";

const NAVY = "#10213F";
const BLUE = "#2F6FED";
const RED = "#DC2626";
const AMBER = "#D97706";
const GREEN = "#16A34A";
const TEAL = "#0D9488";
const GRAY = "#6B7280";
const BORDER = "#E4E7EC";
const STRIPE = "#F7F8FB";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: NAVY, paddingBottom: 32 },
  header: { paddingVertical: 16, paddingHorizontal: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: NAVY },
  hTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY },
  hCaption: { color: BLUE, fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginTop: 3 },
  hRight: { color: GRAY, fontSize: 8, textAlign: "right" },
  hRightBold: { color: NAVY, fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right" },
  body: { paddingHorizontal: 28, paddingTop: 14 },
  row2: { flexDirection: "row", gap: 10 },
  // No flex here — flex:1 only makes sense for a card that's a direct child of a
  // flexDirection:row container (s.row2). Baking it into the base style broke
  // every top-level card (Large Party Tracker, Floor Pressure Map, Communication
  // Plan, Quick Notes) and cascaded into overlapping layout for everything after
  // the first one on the page.
  card: { borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 8, marginBottom: 10 },
  cardInRow: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 8, marginBottom: 10 },
  cardTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 5 },
  thead: { flexDirection: "row", backgroundColor: NAVY },
  th: { color: "#FFFFFF", fontSize: 6.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.4, textTransform: "uppercase", paddingVertical: 4, paddingHorizontal: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  td: { fontSize: 7.5, paddingVertical: 3, paddingHorizontal: 4 },
  snapRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  snapLabel: { fontSize: 8, color: NAVY },
  snapValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  phaseTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", marginBottom: 2, marginTop: 5, textTransform: "uppercase" },
  bullet: { fontSize: 7.5, color: NAVY, marginBottom: 1.5 },
  footer: { color: GRAY, fontSize: 7, position: "absolute", bottom: 16, left: 28, right: 28, paddingTop: 6, borderTopWidth: 1, borderTopColor: BORDER },
});

function fmtDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function rushColor(level: string): string {
  return level === "FULL RUSH" || level === "HIGH PRESSURE" ? RED : AMBER;
}
function pressureColor(level: string): string {
  if (level === "CRITICAL" || level === "HEAVY") return RED;
  if (level === "MODERATE") return AMBER;
  return GREEN;
}
function phaseColor(i: number): string {
  return i === 0 ? RED : i === 1 ? AMBER : GREEN;
}

function ReservationPdf({ locationName, day, uploadedAt, uploadedByName, dashboard }: {
  locationName: string; day: string; uploadedAt: Date; uploadedByName: string; dashboard: Dashboard;
}) {
  return (
    <Document title="Reservation Host Dashboard" author="CM Operations">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            <Text style={s.hTitle}>CHIANG MAI — {locationName.toUpperCase()}</Text>
            <Text style={s.hCaption}>HOST DASHBOARD</Text>
          </View>
          <View>
            <Text style={s.hRightBold}>{fmtDate(day)}</Text>
            <Text style={s.hRight}>Uploaded by {uploadedByName} · {uploadedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.row2}>
            {/* Hourly Overview */}
            <View style={[s.cardInRow, { flex: 1.3 }]}>
              <Text style={s.cardTitle}>Hourly Overview</Text>
              <View style={s.thead}>
                <Text style={[s.th, { flex: 1 }]}>Time</Text>
                <Text style={[s.th, { flex: 0.7 }]}>Res.</Text>
                <Text style={[s.th, { flex: 0.7 }]}>Covers</Text>
                <Text style={[s.th, { flex: 1.2 }]}>Status</Text>
              </View>
              {dashboard.hourly.map((h, i) => (
                <View key={i} style={[s.tr, { backgroundColor: i % 2 === 0 ? STRIPE : "#FFFFFF" }]}>
                  <Text style={[s.td, { flex: 1, fontFamily: "Helvetica-Bold" }]}>{h.timeLabel}</Text>
                  <Text style={[s.td, { flex: 0.7, color: GRAY }]}>{h.reservations}</Text>
                  <Text style={[s.td, { flex: 0.7, color: GRAY }]}>{h.covers}</Text>
                  <Text style={[s.td, { flex: 1.2, color: rushColor(h.rushLevel), fontFamily: "Helvetica-Bold" }]}>{h.rushLevel}</Text>
                </View>
              ))}
              <View style={[s.tr, { backgroundColor: NAVY }]}>
                <Text style={[s.td, { flex: 1, color: "#FFFFFF", fontFamily: "Helvetica-Bold" }]}>TOTAL</Text>
                <Text style={[s.td, { flex: 0.7, color: "#FFFFFF", fontFamily: "Helvetica-Bold" }]}>{dashboard.snapshot.totalActiveReservations}</Text>
                <Text style={[s.td, { flex: 0.7, color: "#FFFFFF", fontFamily: "Helvetica-Bold" }]}>{dashboard.snapshot.totalCovers}</Text>
                <Text style={[s.td, { flex: 1.2 }]} />
              </View>
            </View>

            {/* Total Night Snapshot */}
            <View style={s.cardInRow}>
              <Text style={s.cardTitle}>Total Night Snapshot</Text>
              <Snap label="Total Active Reservations" value={dashboard.snapshot.totalActiveReservations} color={BLUE} />
              <Snap label="Total Covers" value={dashboard.snapshot.totalCovers} color={TEAL} />
              <Snap label="Large Parties (6+)" value={dashboard.snapshot.largePartyCount} color={GREEN} />
              <Snap label="Birthday Tables" value={dashboard.snapshot.birthdayCount} color="#8B5CF6" />
              <Snap label="Missing Tables" value={dashboard.snapshot.missingTableCount} color={RED} />
              <Snap label="Cancelled Reservations" value={dashboard.snapshot.cancelledCount} color={RED} />
            </View>
          </View>

          {/* Large Party Tracker */}
          <View style={s.card} wrap={false}>
            <Text style={s.cardTitle}>Large Party Tracker</Text>
            <View style={s.thead}>
              <Text style={[s.th, { flex: 0.8 }]}>Time</Text>
              <Text style={[s.th, { flex: 1.5 }]}>Name</Text>
              <Text style={[s.th, { flex: 0.6 }]}>Guests</Text>
              <Text style={[s.th, { flex: 3 }]}>Notes</Text>
            </View>
            {dashboard.largeParties.map((p, i) => (
              <View key={i} style={[s.tr, { backgroundColor: i % 2 === 0 ? STRIPE : "#FFFFFF" }]}>
                <Text style={[s.td, { flex: 0.8, color: GRAY }]}>{p.timeLabel}</Text>
                <Text style={[s.td, { flex: 1.5, fontFamily: "Helvetica-Bold" }]}>{p.name}</Text>
                <Text style={[s.td, { flex: 0.6, color: RED, fontFamily: "Helvetica-Bold" }]}>{p.guests}</Text>
                <Text style={[s.td, { flex: 3, color: GRAY }]}>{p.notes || "—"}</Text>
              </View>
            ))}
            {dashboard.largeParties.length === 0 && <Text style={{ fontSize: 8, color: GRAY, padding: 4 }}>No large parties tonight.</Text>}
          </View>

          {dashboard.floorZones.length > 0 && (
            <View style={s.card} wrap={false}>
              <Text style={s.cardTitle}>Floor Pressure Map</Text>
              <View style={{ flexDirection: "row", gap: 14 }}>
                {dashboard.floorZones.map((z, i) => (
                  <View key={i} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: NAVY }}>{z.name}</Text>
                    <Text style={{ fontSize: 8, color: pressureColor(z.pressureLevel), fontFamily: "Helvetica-Bold", marginTop: 2 }}>
                      {z.pressureLevel}
                    </Text>
                    <Text style={{ fontSize: 7, color: GRAY }}>{z.reservationCount}/{z.tableCount} tables · {z.covers} covers</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={s.row2}>
            {/* Host Action Items */}
            <View style={s.cardInRow}>
              <Text style={s.cardTitle}>Host Action Items</Text>
              {dashboard.actionItems.map((p, i) => (
                <View key={i}>
                  <Text style={[s.phaseTitle, { color: phaseColor(i) }]}>{p.phase}</Text>
                  {p.bullets.map((b, j) => <Text key={j} style={s.bullet}>• {b}</Text>)}
                </View>
              ))}
            </View>

            {/* Table Issues */}
            <View style={s.cardInRow} wrap={false}>
              <Text style={s.cardTitle}>Table Issues</Text>
              {dashboard.tableIssues.length === 0 ? (
                <Text style={{ fontSize: 8, color: GRAY }}>No issues flagged.</Text>
              ) : (
                <>
                  <View style={s.thead}>
                    <Text style={[s.th, { flex: 1.3 }]}>Issue</Text>
                    <Text style={[s.th, { flex: 2 }]}>Action</Text>
                  </View>
                  {dashboard.tableIssues.map((t, i) => (
                    <View key={i} style={[s.tr, { backgroundColor: i % 2 === 0 ? STRIPE : "#FFFFFF" }]}>
                      <Text style={[s.td, { flex: 1.3, fontFamily: "Helvetica-Bold" }]}>{t.issue}</Text>
                      <Text style={[s.td, { flex: 2, color: RED }]}>{t.action}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>

          {/* Host Communication Plan */}
          <View style={s.card} wrap={false}>
            <Text style={s.cardTitle}>Host Communication Plan</Text>
            <View style={{ flexDirection: "row", gap: 14 }}>
              {dashboard.communicationPlan.map((p, i) => (
                <View key={i} style={{ flex: 1 }}>
                  <Text style={[s.phaseTitle, { color: phaseColor(i) }]}>{p.phase}</Text>
                  {p.bullets.map((b, j) => <Text key={j} style={s.bullet}>✓ {b}</Text>)}
                </View>
              ))}
            </View>
          </View>

          {/* Quick Notes */}
          <View style={[s.card]} wrap={false}>
            <Text style={s.cardTitle}>Quick Notes</Text>
            <Text style={{ fontSize: 7.5, color: GRAY, lineHeight: 1.6 }}>
              {dashboard.quickNotes.join("   •   ")}
            </Text>
          </View>
        </View>

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Host Dashboard | Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}

function Snap({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.snapRow}>
      <Text style={s.snapLabel}>{label}</Text>
      <Text style={[s.snapValue, { color }]}>{value}</Text>
    </View>
  );
}

export function renderReservationPdf(
  locationName: string, day: string, uploadedAt: Date, uploadedByName: string, dashboard: Dashboard,
): Promise<Buffer> {
  return renderToBuffer(
    <ReservationPdf locationName={locationName} day={day} uploadedAt={uploadedAt} uploadedByName={uploadedByName} dashboard={dashboard} />,
  );
}
