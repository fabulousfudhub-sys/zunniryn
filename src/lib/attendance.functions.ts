import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getAttendanceGrid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    classId: z.string().uuid(),
    armId: z.string().uuid(),
    termId: z.string().uuid(),
    date: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: students }, { data: marks }] = await Promise.all([
      supabase.from("students").select("id,admission_no,full_name")
        .eq("current_class_id", data.classId).eq("current_arm_id", data.armId).eq("is_active", true).order("full_name"),
      supabase.from("attendance").select("id,student_id,status,note")
        .eq("class_id", data.classId).eq("arm_id", data.armId).eq("date", data.date),
    ]);
    const map = new Map((marks ?? []).map((m) => [m.student_id, m]));
    return {
      rows: (students ?? []).map((s) => ({
        ...s,
        status: map.get(s.id)?.status ?? "present",
        note: map.get(s.id)?.note ?? "",
      })),
    };
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    classId: z.string().uuid(),
    armId: z.string().uuid(),
    termId: z.string().uuid(),
    date: z.string(),
    entries: z.array(z.object({
      studentId: z.string().uuid(),
      status: z.enum(["present","absent","late","excused"]),
      note: z.string().max(200).optional(),
    })).max(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: term } = await supabase.from("terms").select("session_id").eq("id", data.termId).single();
    if (!term) throw new Error("Invalid term");
    const rows = data.entries.map((e) => ({
      student_id: e.studentId,
      class_id: data.classId,
      arm_id: data.armId,
      session_id: term.session_id,
      term_id: data.termId,
      date: data.date,
      status: e.status,
      note: e.note ?? null,
      recorded_by: userId,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
    if (error) throw new Error(error.message);
    return { saved: rows.length };
  });

export const getStudentAttendanceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid(), termId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.from("attendance")
      .select("status,date").eq("student_id", data.studentId).eq("term_id", data.termId);
    const counts = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    (rows ?? []).forEach((r: any) => { counts[r.status as keyof typeof counts]++; counts.total++; });
    return { counts, rows: rows ?? [] };
  });
