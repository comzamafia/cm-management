import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const PURPLE = "#440E48";
const GOLD = "#F4A626";
const DARK = "#1F2937";
const GRAY = "#9CA3AF";
const RED = "#DC2626";
const AMBER = "#B45309";
const TILE_BORDER = "#E5E7EB";
const STRIPE = "#FBFBFC";

// Local shape (mirrors getSyncedRollup) so this file needn't import the
// "use server" module.
type Post = { id: string; message: string; writerName: string; severity: string | null; riskScore: number | null; followUp: boolean };
type Category = { name: string; posts: Post[] };
type Location = { name: string; recordCount: number; followUps: number; categories: Category[] };

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK, paddingBottom: 32 },
  header: { backgroundColor: PURPLE, paddingVertical: 16, paddingHorizontal: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  hTitle: { color: "#FFFFFF", fontSize: 18, fontFamily: "Helvetica-Bold" },
  hCaption: { color: GOLD, fontSize: 8, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, marginTop: 4 },
  hRight: { color: GRAY, fontSize: 9, textAlign: "right" },
  hRightBold: { color: "#FFFFFF", fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  body: { paddingHorizontal: 28, paddingTop: 14 },
  locBlock: { borderWidth: 1, borderColor: TILE_BORDER, borderRadius: 6, marginBottom: 10, backgroundColor: STRIPE },
  locHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: PURPLE, paddingVertical: 5, paddingHorizontal: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  locName: { color: "#FFFFFF", fontSize: 10, fontFamily: "Helvetica-Bold" },
  locMeta: { color: GOLD, fontSize: 8, fontFamily: "Helvetica-Bold" },
  catBlock: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2 },
  catTitle: { color: PURPLE, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  item: { fontSize: 8, color: DARK, marginBottom: 2.5, lineHeight: 1.3 },
  meta: { fontSize: 6.5, color: GRAY },
  metaRed: { fontSize: 6.5, color: RED, fontFamily: "Helvetica-Bold" },
  metaAmber: { fontSize: 6.5, color: AMBER, fontFamily: "Helvetica-Bold" },
  empty: { fontSize: 8, color: GRAY, fontStyle: "italic" },
  footer: { color: GRAY, fontSize: 7, position: "absolute", bottom: 16, left: 28, right: 28, paddingTop: 6, borderTopWidth: 1, borderTopColor: TILE_BORDER },
});

function fmtDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const isHigh = (sev: string | null) => sev === "High" || sev === "Critical" || sev === "Severe";

function PostLine({ p }: { p: Post }) {
  const metaStyle = p.followUp || isHigh(p.severity) ? s.metaRed : p.severity === "Medium" ? s.metaAmber : s.meta;
  const bits = [
    `— ${p.writerName}`,
    p.severity ? `${p.severity}${p.riskScore != null ? ` (risk ${p.riskScore})` : ""}` : "",
    p.followUp ? "FOLLOW-UP" : "",
  ].filter(Boolean).join(" · ");
  return (
    <Text style={s.item}>
      {p.message}{"  "}<Text style={metaStyle}>{bits}</Text>
    </Text>
  );
}

function LocationBlock({ loc }: { loc: Location }) {
  return (
    <View style={s.locBlock} wrap={false}>
      <View style={s.locHeader}>
        <Text style={s.locName}>{loc.name}</Text>
        <Text style={s.locMeta}>{loc.recordCount} record{loc.recordCount !== 1 ? "s" : ""}{loc.followUps > 0 ? ` · ${loc.followUps} follow-up` : ""}</Text>
      </View>
      {loc.categories.map((cat) => (
        <View key={cat.name} style={s.catBlock}>
          <Text style={s.catTitle}>{cat.name} ({cat.posts.length})</Text>
          {cat.posts.map((p) => <PostLine key={p.id} p={p} />)}
        </View>
      ))}
      {loc.categories.length === 0 && <View style={s.catBlock}><Text style={s.empty}>No records.</Text></View>}
    </View>
  );
}

function OpsRollupPdf({ day, locations }: { day: string; locations: Location[] }) {
  const total = locations.reduce((n, l) => n + l.recordCount, 0);
  return (
    <Document title="Logbook Daily Report" author="CM Operations">
      <Page size="A4" style={s.page} wrap>
        <View style={s.header} fixed>
          <View>
            <Text style={s.hTitle}>CHIANG MAI</Text>
            <Text style={s.hCaption}>DAILY OPERATIONS BRIEF · 7SHIFTS</Text>
          </View>
          <View>
            <Text style={s.hRightBold}>{fmtDate(day)}</Text>
            <Text style={s.hRight}>{locations.length} locations · {total} records</Text>
          </View>
        </View>
        <View style={s.body}>
          {locations.map((loc) => <LocationBlock key={loc.name} loc={loc} />)}
          {locations.length === 0 && <Text style={s.empty}>No synced records for this day.</Text>}
        </View>
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Management summary | Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}

export function renderOpsRollupPdf(day: string, locations: Location[]): Promise<Buffer> {
  return renderToBuffer(<OpsRollupPdf day={day} locations={locations} />);
}
