import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date (yyyy-mm-dd)
  kind: "term" | "holiday" | "meeting" | "exam" | "announcement";
}

export const getCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [{ data: sessions }, { data: terms }, { data: anns }] = await Promise.all([
      supabase.from("academic_sessions").select("id,name,is_current,start_date,end_date").order("start_date", { ascending: false }),
      supabase.from("terms").select("id,name,session_id,is_current,start_date,end_date").order("start_date", { ascending: true }),
      supabase.from("announcements").select("id,title,created_at,published").eq("published", true).order("created_at", { ascending: false }).limit(20),
    ]);

    const currentSession = (sessions ?? []).find((s: any) => s.is_current) ?? (sessions ?? [])[0] ?? null;
    const currentTerm = (terms ?? []).find((t: any) => t.is_current) ?? null;

    const events: CalendarEvent[] = [];
    for (const t of terms ?? []) {
      const tt = t as any;
      if (tt.start_date) events.push({ id: `${tt.id}-s`, title: `${tt.name} begins`, date: tt.start_date, kind: "term" });
      if (tt.end_date) events.push({ id: `${tt.id}-e`, title: `${tt.name} ends`, date: tt.end_date, kind: "holiday" });
    }
    for (const a of anns ?? []) {
      const aa = a as any;
      events.push({ id: aa.id, title: aa.title, date: String(aa.created_at).slice(0, 10), kind: "announcement" });
    }

    const termDuration = currentTerm?.start_date && currentTerm?.end_date
      ? Math.max(1, Math.round((new Date(currentTerm.end_date).getTime() - new Date(currentTerm.start_date).getTime()) / (1000 * 60 * 60 * 24 * 7)))
      : null;

    return {
      currentSessionName: (currentSession as any)?.name ?? null,
      currentTermName: (currentTerm as any)?.name ?? null,
      termDurationWeeks: termDuration,
      eventCount: events.length,
      announcementCount: (anns ?? []).length,
      events,
    };
  });
