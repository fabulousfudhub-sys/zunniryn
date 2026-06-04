import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DashboardStats {
  students: number;
  staff: number;
  classes: number;
  subjects: number;
  currentSession: string | null;
  currentTerm: string | null;
  newAdmissions: number;
  pendingResults: number;
  publishedResults: number;
  approvalQueue: number;
  attendanceToday: { present: number; absent: number; late: number; excused: number };
  announcements: number;
  scratchCardsActive: number;
  genderDistribution: { male: number; female: number; unknown: number };
  sectionDistribution: { NUR: number; PRI: number; SEC: number };
  classStats: { class_name: string; section: string; count: number }[];
  performance: { avg: number; pass: number; fail: number };
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStats> => {
    const { supabase } = context;

    const { data: session } = await supabase
      .from("academic_sessions").select("id, name").eq("is_current", true).maybeSingle();
    const { data: term } = await supabase
      .from("terms").select("id, name").eq("is_current", true).maybeSingle();

    const today = new Date().toISOString().slice(0, 10);

    const [
      { count: students },
      { count: staff },
      { count: classes },
      { count: subjects },
      { count: newAdmissions },
      { count: pendingResults },
      { count: approvalQueue },
      { count: publishedResults },
      { data: attRows },
      { count: announcements },
      { count: scratchCardsActive },
      { data: studentRows },
      { data: rsRows },
    ] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("staff").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      session
        ? supabase.from("students").select("id", { count: "exact", head: true }).eq("admission_session_id", session.id)
        : Promise.resolve({ count: 0 } as any),
      term
        ? supabase.from("result_sheets").select("id", { count: "exact", head: true }).eq("term_id", term.id).in("status", ["draft", "submitted"])
        : Promise.resolve({ count: 0 } as any),
      term
        ? supabase.from("result_sheets").select("id", { count: "exact", head: true }).eq("term_id", term.id).eq("status", "submitted")
        : Promise.resolve({ count: 0 } as any),
      term
        ? supabase.from("result_sheets").select("id", { count: "exact", head: true }).eq("term_id", term.id).eq("status", "published")
        : Promise.resolve({ count: 0 } as any),
      supabase.from("attendance").select("status").eq("date", today),
      supabase.from("announcements").select("id", { count: "exact", head: true }).eq("published", true),
      supabase.from("scratch_cards").select("id", { count: "exact", head: true }).eq("status", "unused"),
      supabase.from("students").select("gender, classes:current_class_id(name,section)").eq("is_active", true),
      term
        ? supabase.from("result_sheets").select("average").eq("term_id", term.id)
        : Promise.resolve({ data: [] } as any),
    ]);

    const attendanceToday = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of attRows ?? []) {
      const s = r.status as keyof typeof attendanceToday;
      if (s in attendanceToday) attendanceToday[s]++;
    }

    const genderDistribution = { male: 0, female: 0, unknown: 0 };
    const sectionDistribution = { NUR: 0, PRI: 0, SEC: 0 };
    const classMap = new Map<string, { class_name: string; section: string; count: number }>();
    for (const s of (studentRows ?? []) as any[]) {
      if (s.gender === "Male") genderDistribution.male++;
      else if (s.gender === "Female") genderDistribution.female++;
      else genderDistribution.unknown++;
      const sec = s.classes?.section as "NUR" | "PRI" | "SEC" | undefined;
      if (sec && sec in sectionDistribution) sectionDistribution[sec]++;
      const cname = s.classes?.name as string | undefined;
      if (cname) {
        const k = `${sec}|${cname}`;
        const e = classMap.get(k);
        if (e) e.count++;
        else classMap.set(k, { class_name: cname, section: sec ?? "—", count: 1 });
      }
    }
    const classStats = Array.from(classMap.values()).sort((a, b) => b.count - a.count);

    let avg = 0, pass = 0, fail = 0;
    const arr = (rsRows ?? []) as { average: number | null }[];
    if (arr.length) {
      for (const r of arr) {
        const v = Number(r.average ?? 0);
        if (v >= 40) pass++; else fail++;
        avg += v;
      }
      avg = avg / arr.length;
    }

    return {
      students: students ?? 0,
      staff: staff ?? 0,
      classes: classes ?? 0,
      subjects: subjects ?? 0,
      currentSession: session?.name ?? null,
      currentTerm: term?.name ?? null,
      newAdmissions: newAdmissions ?? 0,
      pendingResults: pendingResults ?? 0,
      approvalQueue: approvalQueue ?? 0,
      publishedResults: publishedResults ?? 0,
      attendanceToday,
      announcements: announcements ?? 0,
      scratchCardsActive: scratchCardsActive ?? 0,
      genderDistribution,
      sectionDistribution,
      classStats,
      performance: { avg: Math.round(avg * 10) / 10, pass, fail },
    };
  });
