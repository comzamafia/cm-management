import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { RollupLocation, RollupItem } from "./logbook";

const PURPLE = "#440E48";
const GOLD = "#F4A626";
const DARK = "#1F2937";
const MID = "#4B5563";
const GRAY = "#9CA3AF";
const RED = "#DC2626";
const TILE_BORDER = "#E5E7EB";
const STRIPE = "#FBFBFC";

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
  locCount: { color: GOLD, fontSize: 8, fontFamily: "Helvetica-Bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 6 },
  col: { width: "48%" },
  colTitle: { color: PURPLE, fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  item: { fontSize: 8, color: DARK, marginBottom: 2, lineHeight: 1.3 },
  itemMeta: { fontSize: 6.5, color: GRAY },
  empty: { fontSize: 8, color: GRAY, fontStyle: "italic" },
  riskHigh: { color: RED, fontFamily: "Helvetica-Bold" },
  footer: { color: GRAY, fontSize: 7, marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: TILE_BORDER, position: "absolute", bottom: 16, left: 28, right: 28 },
});

function fmtDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function Column({ title, items, emptyLabel }: { title: string; items: RollupItem[]; emptyLabel: string }) {
  return (
    <View style={s.col}>
      <Text style={s.colTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={s.empty}>{emptyLabel}</Text>
      ) : (
        items.map((it) => (
          <Text key={it.id} style={s.item}>
            {it.itemTag ? `[${it.itemTag}] ` : ""}{it.body}
            {"  "}<Text style={s.itemMeta}>— {it.authorName} ({it.department})</Text>
          </Text>
        ))
      )}
    </View>
  );
}

function LocationBlock({ loc }: { loc: RollupLocation }) {
  return (
    <View style={s.locBlock} wrap={false}>
      <View style={s.locHeader}>
        <Text style={s.locName}>{loc.name}</Text>
        <Text style={s.locCount}>{loc.recordCount} record{loc.recordCount !== 1 ? "s" : ""}</Text>
      </View>
      <View style={s.grid}>
        <Column title="Operations" items={loc.operations} emptyLabel="No operational update" />
        <Column title="Sales / Metrics" items={loc.salesMetrics} emptyLabel="Not entered" />
        <Column title="Customer Complaints" items={loc.complaints} emptyLabel="None logged" />
        <Column title="Action Needed" items={loc.actionNeeded} emptyLabel="None" />
      </View>
    </View>
  );
}

function LogbookPdf({ day, locations }: { day: string; locations: RollupLocation[] }) {
  const totalRecords = locations.reduce((sum, l) => sum + l.recordCount, 0);

  return (
    <Document title="Logbook Daily Report" author="CM Operations">
      <Page size="A4" style={s.page} wrap>
        <View style={s.header} fixed>
          <View>
            <Text style={s.hTitle}>CHIANG MAI</Text>
            <Text style={s.hCaption}>DAILY OPERATIONS BRIEF</Text>
          </View>
          <View>
            <Text style={s.hRightBold}>{fmtDate(day)}</Text>
            <Text style={s.hRight}>{locations.length} locations · {totalRecords} source records</Text>
          </View>
        </View>
        <View style={s.body}>
          {locations.map((loc) => <LocationBlock key={loc.id} loc={loc} />)}
          {locations.length === 0 && <Text style={s.empty}>No locations in scope.</Text>}
        </View>
        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `Management summary | Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}

export function renderLogbookPdf(day: string, locations: RollupLocation[]): Promise<Buffer> {
  return renderToBuffer(<LogbookPdf day={day} locations={locations} />);
}
