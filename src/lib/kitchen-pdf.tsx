import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { KitchenPrep } from "./reservation-data";

const NAVY = "#10213F";
const NAVY_SOFT = "#1E3A63";
const RED = "#DC2626";
const RED_BG = "#FEE2E2";
const GREEN = "#16A34A";
const GREEN_BG = "#DCFCE7";
const AMBER = "#D97706";
const AMBER_BG = "#FEF3C7";
const GRAY = "#6B7280";
const GRAY_SOFT = "#9CA3AF";
const BORDER = "#E4E7EC";
const STRIPE = "#F7F8FB";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: NAVY, paddingBottom: 30 },

  // ── Header band ──
  header: { backgroundColor: NAVY, paddingVertical: 15, paddingHorizontal: 30, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerAccent: { height: 3, backgroundColor: AMBER },
  hTitle: { fontSize: 19, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.3 },
  hCaption: { color: "#F5B84B", fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 2, marginTop: 4 },
  hRightBold: { color: "#FFFFFF", fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  hRight: { color: "#9BB0D0", fontSize: 8, textAlign: "right", marginTop: 3 },

  body: { paddingHorizontal: 30, paddingTop: 16 },

  // ── KPI tiles ──
  tiles: { flexDirection: "row", gap: 10, marginBottom: 16 },
  tile: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 7, backgroundColor: "#FFFFFF", overflow: "hidden" },
  tileAccent: { height: 3 },
  tileInner: { paddingVertical: 9, paddingHorizontal: 11 },
  tileLabel: { color: GRAY, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  tileValue: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 4 },
  tileSub: { color: GRAY_SOFT, fontSize: 6.5, marginTop: 2 },

  // ── Section header ──
  secHead: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  secDot: { width: 4, height: 12, borderRadius: 2 },
  secTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: NAVY },

  row2: { flexDirection: "row", gap: 12, marginBottom: 14 },
  col: { flex: 1 },

  // ── Table ──
  thead: { flexDirection: "row", backgroundColor: NAVY, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  th: { color: "#FFFFFF", fontSize: 6.8, fontFamily: "Helvetica-Bold", letterSpacing: 0.4, textTransform: "uppercase", paddingVertical: 5, paddingHorizontal: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER, alignItems: "center" },
  td: { fontSize: 8.5, paddingVertical: 4.5, paddingHorizontal: 6 },
  pill: { fontSize: 6.8, fontFamily: "Helvetica-Bold", paddingVertical: 2, paddingHorizontal: 5, borderRadius: 8, alignSelf: "flex-start" },

  // ── Timeline blocks ──
  block: { flexDirection: "row", borderRadius: 6, borderWidth: 1, marginBottom: 6, overflow: "hidden" },
  blockBar: { width: 5 },
  blockBody: { flex: 1, paddingVertical: 7, paddingHorizontal: 9 },
  blockTime: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: NAVY },
  blockMeta: { fontSize: 7, color: GRAY, marginTop: 1 },
  blockAction: { fontSize: 7.5, color: NAVY_SOFT, marginTop: 3, lineHeight: 1.3 },
  blockBadge: { fontSize: 6.8, fontFamily: "Helvetica-Bold", paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, alignSelf: "flex-start", marginBottom: 3 },

  // ── Bullet cards ──
  // No flex here: these cards sit inside a column container (s.col), not a
  // flexDirection:"row" parent. Baking flex:1 in corrupts Yoga's height calc
  // and collapses every bullet row on top of each other (same react-pdf gotcha
  // documented in reservation-pdf.tsx). The parent s.col already gives equal
  // width; the card just sizes to its content height.
  card: { borderWidth: 1, borderColor: BORDER, borderRadius: 7, padding: 10, backgroundColor: "#FFFFFF" },
  bulletRow: { flexDirection: "row", marginBottom: 4, alignItems: "flex-start" },
  bulletDot: { fontSize: 8, marginRight: 5, lineHeight: 1.3 },
  bulletText: { flex: 1, fontSize: 8, color: NAVY, lineHeight: 1.35 },
  emptyText: { fontSize: 8, color: GRAY_SOFT, fontStyle: "italic" },

  footer: { color: GRAY_SOFT, fontSize: 7, position: "absolute", bottom: 15, left: 30, right: 30, paddingTop: 6, borderTopWidth: 1, borderTopColor: BORDER, flexDirection: "row", justifyContent: "space-between" },
});

function fmtDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

// Rush-level pill colors, matched to the on-screen dashboard's palette.
function rushPill(level: string): { bg: string; text: string } {
  if (level === "FULL RUSH" || level === "HIGH PRESSURE") return { bg: RED_BG, text: RED };
  return { bg: AMBER_BG, text: "#B45309" };
}

function bandStyle(band: "BUSY" | "QUIET"): { bar: string; border: string; badgeBg: string; badgeText: string; label: string; action: string } {
  return band === "BUSY"
    ? { bar: RED, border: "#F5C4C4", badgeBg: RED_BG, badgeText: RED, label: "ALL HANDS ON STANDBY", action: "Every station manned — hold breaks, runners ready, expo on the pass." }
    : { bar: GREEN, border: "#BBE8C8", badgeBg: GREEN_BG, badgeText: GREEN, label: "GOOD BREAK WINDOW", action: "Safe to rotate staff breaks and get ahead on mise en place / restock." };
}

function SecHead({ color, title }: { color: string; title: string }) {
  return (
    <View style={s.secHead}>
      <View style={[s.secDot, { backgroundColor: color }]} />
      <Text style={s.secTitle}>{title}</Text>
    </View>
  );
}

function Tile({ label, value, sub, accent, valueColor }: { label: string; value: string | number; sub?: string; accent: string; valueColor?: string }) {
  return (
    <View style={s.tile}>
      <View style={[s.tileAccent, { backgroundColor: accent }]} />
      <View style={s.tileInner}>
        <Text style={s.tileLabel}>{label}</Text>
        <Text style={[s.tileValue, { color: valueColor ?? NAVY }]}>{value}</Text>
        {sub ? <Text style={s.tileSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function KitchenPdf({ locationName, day, generatedAt, prep }: {
  locationName: string; day: string; generatedAt: Date; prep: KitchenPrep;
}) {
  return (
    <Document title="Kitchen Prep Sheet" author="CM Operations">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header} fixed>
          <View>
            <Text style={s.hTitle}>{locationName.toUpperCase()}</Text>
            <Text style={s.hCaption}>KITCHEN PREP SHEET</Text>
          </View>
          <View>
            <Text style={s.hRightBold}>{fmtDate(day)}</Text>
            <Text style={s.hRight}>Generated {generatedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</Text>
          </View>
        </View>
        <View style={s.headerAccent} fixed />

        <View style={s.body}>
          {/* KPI tiles */}
          <View style={s.tiles}>
            <Tile label="Total Covers" value={prep.totalCovers} sub="guests booked" accent={AMBER} />
            <Tile label="Reservations" value={prep.totalReservations} sub="active bookings" accent={NAVY} />
            <Tile label="Peak Time" value={prep.peakLabel ?? "—"} sub="heaviest wave" accent={RED} valueColor={RED} />
            <Tile label="Peak Covers" value={prep.peakCovers} sub="at the busiest slot" accent={RED} valueColor={RED} />
          </View>

          {/* Hourly Overview + Prep Timeline */}
          <View style={s.row2}>
            {/* Hourly Overview */}
            <View style={[s.col, { flex: 1.25 }]}>
              <SecHead color={AMBER} title="Hourly Overview" />
              <View style={s.thead}>
                <Text style={[s.th, { flex: 1.1 }]}>Time</Text>
                <Text style={[s.th, { flex: 0.7, textAlign: "right" }]}>Res.</Text>
                <Text style={[s.th, { flex: 0.7, textAlign: "right" }]}>Covers</Text>
                <Text style={[s.th, { flex: 1.4 }]}>Status</Text>
              </View>
              {prep.hourly.map((h, i) => {
                const p = rushPill(h.rushLevel);
                return (
                  <View key={i} style={[s.tr, { backgroundColor: i % 2 === 0 ? STRIPE : "#FFFFFF" }]} wrap={false}>
                    <Text style={[s.td, { flex: 1.1, fontFamily: "Helvetica-Bold" }]}>{h.timeLabel}</Text>
                    <Text style={[s.td, { flex: 0.7, color: GRAY, textAlign: "right" }]}>{h.reservations}</Text>
                    <Text style={[s.td, { flex: 0.7, color: NAVY, fontFamily: "Helvetica-Bold", textAlign: "right" }]}>{h.covers}</Text>
                    <View style={[s.td, { flex: 1.4 }]}>
                      <Text style={[s.pill, { backgroundColor: p.bg, color: p.text }]}>{h.rushLevel}</Text>
                    </View>
                  </View>
                );
              })}
              {/* Total row */}
              <View style={[s.tr, { backgroundColor: NAVY, borderBottomWidth: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }]}>
                <Text style={[s.td, { flex: 1.1, color: "#FFFFFF", fontFamily: "Helvetica-Bold" }]}>TOTAL</Text>
                <Text style={[s.td, { flex: 0.7, color: "#FFFFFF", fontFamily: "Helvetica-Bold", textAlign: "right" }]}>{prep.totalReservations}</Text>
                <Text style={[s.td, { flex: 0.7, color: "#FFFFFF", fontFamily: "Helvetica-Bold", textAlign: "right" }]}>{prep.totalCovers}</Text>
                <Text style={[s.td, { flex: 1.4 }]} />
              </View>
              {prep.hourly.length === 0 && <Text style={[s.emptyText, { marginTop: 6 }]}>No active reservations tonight.</Text>}
            </View>

            {/* Prep Timeline */}
            <View style={s.col}>
              <SecHead color={GREEN} title="Prep Timeline" />
              {prep.windows.map((w, i) => {
                const bs = bandStyle(w.band);
                return (
                  <View key={i} style={[s.block, { borderColor: bs.border }]} wrap={false}>
                    <View style={[s.blockBar, { backgroundColor: bs.bar }]} />
                    <View style={s.blockBody}>
                      <Text style={[s.blockBadge, { backgroundColor: bs.badgeBg, color: bs.badgeText }]}>{bs.label}</Text>
                      <Text style={s.blockTime}>{w.startLabel} – {w.endLabel}</Text>
                      <Text style={s.blockMeta}>{w.totalCovers} covers · {w.totalReservations} reservations</Text>
                      <Text style={s.blockAction}>{bs.action}</Text>
                    </View>
                  </View>
                );
              })}
              {prep.windows.length === 0 && <Text style={s.emptyText}>No active reservations tonight.</Text>}
            </View>
          </View>

          {/* Prep Alerts + Manager Summary */}
          <View style={s.row2}>
            <View style={s.col}>
              <SecHead color={RED} title="Large Party & Birthday Prep" />
              <View style={s.card} wrap={false}>
                {prep.largePartyAlerts.length === 0 ? (
                  <Text style={s.emptyText}>No large parties flagged tonight.</Text>
                ) : (
                  prep.largePartyAlerts.map((a, i) => (
                    <View key={i} style={s.bulletRow}>
                      <Text style={[s.bulletDot, { color: RED }]}>•</Text>
                      <Text style={s.bulletText}>
                        <Text style={{ fontFamily: "Helvetica-Bold" }}>{a.timeLabel}</Text>{"  "}{a.note}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            <View style={s.col}>
              <SecHead color={NAVY} title="Manager Summary" />
              <View style={s.card} wrap={false}>
                {prep.summary.length === 0 ? (
                  <Text style={s.emptyText}>Nothing flagged — steady night.</Text>
                ) : (
                  prep.summary.map((line, i) => (
                    <View key={i} style={s.bulletRow}>
                      <Text style={[s.bulletDot, { color: AMBER }]}>•</Text>
                      <Text style={s.bulletText}>{line}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Kitchen Prep Sheet · {locationName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderKitchenPrepPdf(
  locationName: string, day: string, generatedAt: Date, prep: KitchenPrep,
): Promise<Buffer> {
  return renderToBuffer(<KitchenPdf locationName={locationName} day={day} generatedAt={generatedAt} prep={prep} />);
}
