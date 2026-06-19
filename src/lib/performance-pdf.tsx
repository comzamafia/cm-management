import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { BohServerPerformance } from "./boh-api";
import { money0, money2, pct, int, fmtGenerated, scoreFormula } from "./perf-format";

const NAVY = "#1F2A37";
const BLUE = "#5B9BD5";
const GRAY = "#9CA3AF";
const DARK = "#1F2937";
const MID = "#4B5563";
const CREAM = "#FDF7E3";
const STRIPE = "#F7F9FC";
const ROW_BORDER = "#EEF1F4";
const TILE_BORDER = "#E5E7EB";

// Column layout — flex widths + alignment shared by header and body rows.
type Align = "left" | "center" | "right";
const COLS: { key: string; label: string; flex: number; align: Align }[] = [
  { key: "rank", label: "#", flex: 0.5, align: "center" },
  { key: "server", label: "Server", flex: 2.4, align: "left" },
  { key: "score", label: "Score", flex: 0.9, align: "center" },
  { key: "net", label: "Net Sales", flex: 1.3, align: "right" },
  { key: "sph", label: "Sales/hr", flex: 1.1, align: "right" },
  { key: "guests", label: "Guests", flex: 0.9, align: "right" },
  { key: "apg", label: "Avg/Guest", flex: 1.1, align: "right" },
  { key: "drink", label: "Drink %", flex: 1.0, align: "right" },
  { key: "dessert", label: "Dessert /100", flex: 1.2, align: "right" },
  { key: "disc", label: "Disc %", flex: 0.9, align: "right" },
];

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, paddingBottom: 28 },

  header: { backgroundColor: NAVY, paddingVertical: 18, paddingHorizontal: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  hTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: "Helvetica-Bold" },
  hCaption: { color: BLUE, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, marginTop: 4 },
  hRange: { color: GRAY, fontSize: 10, marginTop: 4 },
  hBranch: { color: "#FFFFFF", fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  hGen: { color: GRAY, fontSize: 9, marginTop: 4, textAlign: "right" },

  body: { paddingHorizontal: 28, paddingTop: 16 },

  tiles: { flexDirection: "row", gap: 8, marginBottom: 18 },
  tile: { flex: 1, borderWidth: 1, borderColor: TILE_BORDER, borderRadius: 6, backgroundColor: "#FBFBFC", paddingVertical: 9, paddingHorizontal: 10 },
  tileLabel: { color: GRAY, fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  tileValue: { color: DARK, fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 3 },

  lbTitle: { color: DARK, fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6 },

  thead: { flexDirection: "row", backgroundColor: NAVY },
  th: { color: "#FFFFFF", fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.4, textTransform: "uppercase", paddingVertical: 6, paddingHorizontal: 5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: ROW_BORDER },
  cell: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 5 },

  footer: { color: GRAY, fontSize: 8, marginTop: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: TILE_BORDER, lineHeight: 1.4 },
});

function cellText(colKey: string, v: BohServerPerformance["servers"][number], rank: number): string {
  switch (colKey) {
    case "rank": return String(rank);
    case "server": return v.name;
    case "score": return v.score.toFixed(1);
    case "net": return money2(v.netSales);
    case "sph": return money2(v.salesPerHour);
    case "guests": return int(v.guests);
    case "apg": return money2(v.avgPerGuest);
    case "drink": return pct(v.drinkPct);
    case "dessert": return int(v.dessertPer100);
    case "disc": return pct(v.discountPct);
    default: return "";
  }
}

function PerformancePdf({ data }: { data: BohServerPerformance }) {
  const { branch, range, generatedAt, team, servers, weights } = data;
  const ranked = servers.filter((x) => !x.isStation).sort((a, b) => b.score - a.score);

  const tiles = [
    { label: "Team Net Sales", value: money0(team.netSales) },
    { label: "Guests Served", value: int(team.guests) },
    { label: "Avg / Guest", value: money2(team.avgPerGuest) },
    { label: "Drink Mix", value: pct(team.avgDrinkPct) },
    { label: "Servers Ranked", value: int(ranked.length) },
  ];

  return (
    <Document title={`Server Performance — ${branch.name}`} author="CM Operations">
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Navy header band */}
        <View style={s.header} fixed>
          <View>
            <Text style={s.hTitle}>Server Performance Report</Text>
            <Text style={s.hCaption}>PERFORMANCE SCORE LEADERBOARD</Text>
            <Text style={s.hRange}>{range.from}  to  {range.to}</Text>
          </View>
          <View>
            <Text style={s.hBranch}>{branch.name}</Text>
            <Text style={s.hGen}>Generated {fmtGenerated(generatedAt)}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Stat tiles */}
          <View style={s.tiles}>
            {tiles.map((t) => (
              <View key={t.label} style={s.tile}>
                <Text style={s.tileLabel}>{t.label}</Text>
                <Text style={s.tileValue}>{t.value}</Text>
              </View>
            ))}
          </View>

          {/* Leaderboard */}
          <Text style={s.lbTitle}>Performance Leaderboard</Text>

          {/* Table header (repeats on each page) */}
          <View style={s.thead} fixed>
            {COLS.map((c) => (
              <Text key={c.key} style={[s.th, { flex: c.flex, textAlign: c.align }]}>{c.label}</Text>
            ))}
          </View>

          {/* Rows */}
          {ranked.map((v, i) => {
            const bg = i === 0 ? CREAM : i % 2 === 0 ? STRIPE : "#FFFFFF";
            return (
              <View key={`${v.name}-${i}`} style={[s.row, { backgroundColor: bg }]} wrap={false}>
                {COLS.map((c) => {
                  const isName = c.key === "server";
                  const isStrong = c.key === "server" || c.key === "score" || c.key === "net";
                  const color = c.key === "rank" ? GRAY : isStrong ? DARK : MID;
                  return (
                    <Text
                      key={c.key}
                      style={[s.cell, {
                        flex: c.flex,
                        textAlign: c.align,
                        color,
                        fontFamily: isName || c.key === "score" ? "Helvetica-Bold" : "Helvetica",
                      }]}
                    >
                      {cellText(c.key, v, i + 1)}
                    </Text>
                  );
                })}
              </View>
            );
          })}

          {/* Footer formula */}
          <Text style={s.footer}>{scoreFormula(weights)}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Render the report to a PDF buffer for a route handler response. */
export function renderPerformancePdf(data: BohServerPerformance): Promise<Buffer> {
  return renderToBuffer(<PerformancePdf data={data} />);
}
