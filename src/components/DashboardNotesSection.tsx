import { getNotesForDay } from "@/lib/notes";
import { APP_TZ } from "@/lib/time";
import { DashboardNotes } from "./DashboardNotes";

/** Toronto calendar date (YYYY-MM-DD) for an instant. */
function ymd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

export async function DashboardNotesSection({
  userId,
  noteDate,
}: {
  userId: string;
  noteDate?: string;
}) {
  const todayStr = ymd(new Date());
  const day = noteDate && /^\d{4}-\d{2}-\d{2}$/.test(noteDate) ? noteDate : todayStr;
  const isToday = day === todayStr;

  const notes = await getNotesForDay(userId, day);

  // Anchor at noon UTC of the chosen day so ±1 day math stays on the right date.
  const anchor = new Date(`${day}T12:00:00.000Z`);
  const prevDay = ymd(new Date(anchor.getTime() - 86400000));
  const nextRaw = ymd(new Date(anchor.getTime() + 86400000));
  const nextDay = nextRaw > todayStr ? null : nextRaw;

  const dayLabel = anchor.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  const noteItems = notes.map((n) => ({
    id: n.id,
    body: n.body,
    time: n.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TZ }),
  }));

  return (
    <DashboardNotes
      day={day}
      today={todayStr}
      dayLabel={dayLabel}
      isToday={isToday}
      prevDay={prevDay}
      nextDay={nextDay}
      notes={noteItems}
    />
  );
}
