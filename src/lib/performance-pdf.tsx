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
const PURPLE = "#440E48";
const GOLD = "#F4A626";

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

export type PerformanceView = "score" | "upsell";

function PerformancePdf({ data, view }: { data: BohServerPerformance; view: PerformanceView }) {
  const { branch } = data;
  return (
    <Document title={`Server Performance — ${branch.name}`} author="CM Operations">
      {view === "upsell" ? <UpsellPage data={data} /> : <ScorePage data={data} />}
    </Document>
  );
}

function ScorePage({ data }: { data: BohServerPerformance }) {
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
  );
}

// ── Upsell Columns ────────────────────────────────────────────────────────────

const UCOLS: { key: string; label: string; flex: number; align: Align }[] = [
  { key: "rank", label: "#", flex: 0.4, align: "center" },
  { key: "server", label: "Server", flex: 2.2, align: "left" },
  { key: "apg", label: "Avg/Guest", flex: 1.2, align: "right" },
  { key: "liq$", label: "Liquor $", flex: 1.0, align: "right" },
  { key: "liq%", label: "Liquor %", flex: 0.8, align: "right" },
  { key: "bev$", label: "Bev $", flex: 1.0, align: "right" },
  { key: "bev%", label: "Bev %", flex: 0.8, align: "right" },
  { key: "drink%", label: "Liq+Bev %", flex: 0.9, align: "right" },
  { key: "des$", label: "Dessert $", flex: 1.0, align: "right" },
  { key: "des%", label: "Dessert %", flex: 0.9, align: "right" },
];

function upsellText(key: string, v: BohServerPerformance["servers"][number], rank: number): string {
  switch (key) {
    case "rank": return String(rank);
    case "server": return v.name;
    case "apg": return money2(v.avgPerGuest);
    case "liq$": return money2(v.alcoholSales);
    case "liq%": return pct(v.alcoholPct);
    case "bev$": return money2(v.beverageSales);
    case "bev%": return pct(v.beveragePct);
    case "drink%": return pct(v.drinkPct);
    case "des$": return money2(v.dessertSales);
    case "des%": return pct(v.dessertPct);
    default: return "";
  }
}

function UpsellPage({ data }: { data: BohServerPerformance }) {
  const { branch, range, generatedAt, team, servers } = data;
  const ranked = servers.filter((x) => !x.isStation).sort((a, b) => b.drinkPct - a.drinkPct);

  const tiles = [
    { label: "Liquor + Bev %", value: pct(team.avgDrinkPct) },
    { label: "Liquor %", value: pct(team.liquorPct) },
    { label: "Beverage %", value: pct(team.beveragePct) },
    { label: "Dessert %", value: pct(team.dessertPct) },
  ];

  const maxDrink = Math.max(...ranked.map((x) => x.drinkPct), 1);
  const maxDessert = Math.max(...ranked.map((x) => x.dessertPct), 1);
  const byDrink = [...ranked].sort((a, b) => b.drinkPct - a.drinkPct);
  const byDessert = [...ranked].sort((a, b) => b.dessertPct - a.dessertPct);

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      {/* Header */}
      <View style={s.header} fixed>
        <View>
          <Text style={s.hTitle}>Beverage, Liquor & Dessert</Text>
          <Text style={s.hCaption}>UPSELL % BREAKDOWN</Text>
          <Text style={s.hRange}>{range.from}  to  {range.to}</Text>
        </View>
        <View>
          <Text style={s.hBranch}>{branch.name}</Text>
          <Text style={s.hGen}>Generated {fmtGenerated(generatedAt)}</Text>
        </View>
      </View>

      <View style={s.body}>
        {/* Tiles */}
        <View style={s.tiles}>
          {tiles.map((t) => (
            <View key={t.label} style={s.tile}>
              <Text style={s.tileLabel}>{t.label}</Text>
              <Text style={s.tileValue}>{t.value}</Text>
            </View>
          ))}
        </View>

        {/* Table */}
        <Text style={s.lbTitle}>Beverage, Liquor & Dessert Breakdown</Text>

        <View style={s.thead} fixed>
          {UCOLS.map((c) => (
            <Text key={c.key} style={[s.th, { flex: c.flex, textAlign: c.align }]}>{c.label}</Text>
          ))}
        </View>

        {ranked.map((v, i) => {
          const bg = i === 0 ? CREAM : i % 2 === 0 ? STRIPE : "#FFFFFF";
          return (
            <View key={`u-${v.name}-${i}`} style={[s.row, { backgroundColor: bg }]} wrap={false}>
              {UCOLS.map((c) => {
                const isName = c.key === "server";
                const isStrong = c.key === "server" || c.key === "drink%";
                const color = c.key === "rank" ? GRAY : isStrong ? DARK : MID;
                return (
                  <Text key={c.key} style={[s.cell, {
                    flex: c.flex,
                    textAlign: c.align,
                    color,
                    fontFamily: isName || c.key === "drink%" ? "Helvetica-Bold" : "Helvetica",
                  }]}>
                    {upsellText(c.key, v, i + 1)}
                  </Text>
                );
              })}
            </View>
          );
        })}

        {/* Bar charts — side by side */}
        <View style={{ flexDirection: "row", gap: 16, marginTop: 18 }} wrap={false}>
          {/* Liquor + Beverage stacked */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 6 }}>Liquor + Beverage % (stacked)</Text>
            {byDrink.slice(0, 20).map((v) => (
              <View key={v.name} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <Text style={{ width: 75, fontSize: 7, color: MID }}>{v.name}</Text>
                <View style={{ flex: 1, height: 8, backgroundColor: "#F0EBF0", borderRadius: 2, flexDirection: "row" }}>
                  <View style={{ width: `${(v.alcoholPct / maxDrink) * 100}%`, height: 8, backgroundColor: PURPLE, borderTopLeftRadius: 2, borderBottomLeftRadius: 2 }} />
                  <View style={{ width: `${(v.beveragePct / maxDrink) * 100}%`, height: 8, backgroundColor: BLUE }} />
                </View>
                <Text style={{ width: 32, fontSize: 7, fontFamily: "Helvetica-Bold", color: PURPLE, textAlign: "right" }}>{pct(v.drinkPct)}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <View style={{ width: 8, height: 8, backgroundColor: PURPLE, borderRadius: 2 }} />
                <Text style={{ fontSize: 7, color: GRAY }}>Liquor</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <View style={{ width: 8, height: 8, backgroundColor: BLUE, borderRadius: 2 }} />
                <Text style={{ fontSize: 7, color: GRAY }}>Beverage</Text>
              </View>
            </View>
          </View>

          {/* Dessert % */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: DARK, marginBottom: 6 }}>Dessert % (attach)</Text>
            {byDessert.slice(0, 20).map((v) => (
              <View key={v.name} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                <Text style={{ width: 75, fontSize: 7, color: MID }}>{v.name}</Text>
                <View style={{ flex: 1, height: 8, backgroundColor: "#FFF9ED", borderRadius: 2 }}>
                  <View style={{ width: `${(v.dessertPct / maxDessert) * 100}%`, height: 8, backgroundColor: GOLD, borderRadius: 2 }} />
                </View>
                <Text style={{ width: 32, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#92680E", textAlign: "right" }}>{pct(v.dessertPct)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.footer}>Note: station logins (host) are excluded from ranking. Percentages are share of each server's net sales.</Text>
      </View>
    </Page>
  );
}

/** Render the selected view (score leaderboard OR upsell breakdown) to a PDF buffer. */
export function renderPerformancePdf(
  data: BohServerPerformance,
  view: PerformanceView = "score",
): Promise<Buffer> {
  return renderToBuffer(<PerformancePdf data={data} view={view} />);
}
