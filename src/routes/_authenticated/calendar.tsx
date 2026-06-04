import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus, CalendarDays } from "lucide-react";
import { getCalendar, type CalendarEvent } from "@/lib/calendar.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const calQO = queryOptions({ queryKey: ["calendar"], queryFn: () => getCalendar() });

export const Route = createFileRoute("/_authenticated/calendar")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(calQO),
  component: CalendarPage,
});

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const KIND_STYLES: Record<CalendarEvent["kind"], string> = {
  term: "bg-emerald-100 text-emerald-800",
  holiday: "bg-red-100 text-red-700",
  meeting: "bg-primary/10 text-primary",
  exam: "bg-amber-100 text-amber-800",
  announcement: "bg-blue-100 text-blue-700",
};

function CalendarPage() {
  const { data } = useSuspenseQuery(calQO);
  const [tab, setTab] = useState<"calendar" | "timetables">("calendar");
  const first = data.events[0]?.date ? new Date(data.events[0].date) : new Date();
  const [cursor, setCursor] = useState(() => new Date(first.getFullYear(), first.getMonth(), 1));

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of data.events) {
      const arr = m.get(e.date) ?? [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [data.events]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const upcoming = useMemo(() => {
    const today = new Date();
    return [...data.events]
      .filter((e) => new Date(e.date) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [data.events]);

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <header className="mb-4 flex items-center gap-2">
        <h1 className="font-display text-xl font-semibold text-primary">Academic Calendar &amp; Scheduling</h1>
      </header>

      <div className="mb-6 border-b">
        <div className="flex gap-6">
          {(["calendar", "timetables"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "calendar" ? "Academic Calendar" : "Class Timetables"}
            </button>
          ))}
        </div>
      </div>

      {tab === "timetables" ? (
        <Card className="grid place-items-center p-16 text-center text-muted-foreground">
          <div>
            <CalendarDays className="mx-auto mb-3 h-10 w-10 opacity-40" />
            Class timetables are configured per class &amp; arm. Coming soon.
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-primary">
                Term Planning: {data.currentSessionName ?? "Current"} Session
              </h2>
              <p className="text-sm text-muted-foreground">View and manage terms, mid-terms, and official holidays.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export PDF</Button>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground">
                <div className="flex items-center gap-3">
                  <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded p-1 hover:bg-white/10" aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
                  <span className="font-display text-lg font-semibold">{MONTHS[month]} {year}</span>
                  <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded p-1 hover:bg-white/10" aria-label="Next month"><ChevronRight className="h-5 w-5" /></button>
                </div>
                <div className="rounded-full bg-white/15 p-0.5 text-xs">
                  <span className="rounded-full bg-white/90 px-3 py-1 font-medium text-primary">Month</span>
                  <span className="px-3 py-1 text-white/80">Week</span>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const iso = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                  const evs = day ? eventsByDay.get(iso) ?? [] : [];
                  const hasHoliday = evs.some((e) => e.kind === "holiday");
                  return (
                    <div key={i} className={`min-h-[96px] border-b border-r p-1.5 ${hasHoliday ? "bg-red-50/60" : ""}`}>
                      {day && (
                        <>
                          <div className={`text-sm font-medium ${hasHoliday ? "text-red-600" : ""}`}>{day}</div>
                          <div className="mt-1 space-y-1">
                            {evs.slice(0, 2).map((e) => (
                              <div key={e.id} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_STYLES[e.kind]}`}>{e.title}</div>
                            ))}
                            {evs.length > 2 && <div className="px-1 text-[10px] text-muted-foreground">+{evs.length - 2} more</div>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="p-5">
                <h3 className="mb-3 font-display text-lg font-semibold text-primary">Quick Summary</h3>
                <div className="space-y-2.5">
                  <SummaryRow label="Term Duration" value={data.termDurationWeeks ? `${data.termDurationWeeks} Weeks` : "—"} />
                  <SummaryRow label="Total Events" value={String(data.eventCount)} />
                  <SummaryRow label="Current Term" value={data.currentTermName ?? "—"} />
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 font-display text-lg font-semibold text-primary">Upcoming Deadlines</h3>
                {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events.</p>}
                <div className="space-y-3">
                  {upcoming.map((e) => (
                    <div key={e.id} className="border-l-2 border-primary pl-3">
                      <div className="text-sm font-semibold">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display font-bold text-primary">{value}</span>
    </div>
  );
}
