import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SCHOOL = {
  name: "Zinnuryn Academy",
  location: "Bauchi, Nigeria",
  acronym: "ZAB",
  motto: "Discipline · Character · Excellence",
};

async function buildReport(supabase: any, studentId: string, termId: string) {
  const [{ data: student }, { data: term }, { data: scores }, { data: sheet }] = await Promise.all([
    supabase.from("students").select(
      "id,admission_no,full_name,gender,date_of_birth,parent_name,passport_url,current_class_id,current_arm_id,classes:current_class_id(name,section),arms:current_arm_id(name)"
    ).eq("id", studentId).single(),
    supabase.from("terms").select("id,name,session_id,start_date,end_date,academic_sessions:session_id(name)").eq("id", termId).single(),
    supabase.from("scores").select("ca1,ca2,ca3,exam,total,grade,remark,subjects:subject_id(name,code)").eq("student_id", studentId).eq("term_id", termId),
    supabase.from("result_sheets").select("*").eq("student_id", studentId).eq("term_id", termId).maybeSingle(),
  ]);
  if (!student || !term) throw new Error("Not found");

  // class size for position display
  let classSize = 0;
  if (sheet) {
    const { count } = await supabase.from("result_sheets")
      .select("id", { count: "exact", head: true })
      .eq("class_id", sheet.class_id).eq("arm_id", sheet.arm_id).eq("term_id", termId);
    classSize = count ?? 0;
  }

  return { school: SCHOOL, student, term, scores: scores ?? [], sheet, classSize };
}

export const getReportCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid(), termId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => buildReport(context.supabase, data.studentId, data.termId));

export const getBroadsheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    classId: z.string().uuid(), armId: z.string().uuid(), termId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: students }, { data: scores }, { data: subjects }, { data: term }, { data: cls }, { data: arm }] = await Promise.all([
      supabase.from("students").select("id,admission_no,full_name")
        .eq("current_class_id", data.classId).eq("current_arm_id", data.armId).eq("is_active", true).order("full_name"),
      supabase.from("scores").select("student_id,subject_id,total,grade")
        .eq("class_id", data.classId).eq("arm_id", data.armId).eq("term_id", data.termId),
      supabase.from("subject_offerings").select("subject_id,subjects:subject_id(name,code)")
        .eq("class_id", data.classId).eq("arm_id", data.armId)
        .eq("session_id", (await supabase.from("terms").select("session_id").eq("id", data.termId).single()).data?.session_id ?? ""),
      supabase.from("terms").select("name,academic_sessions:session_id(name)").eq("id", data.termId).single(),
      supabase.from("classes").select("name").eq("id", data.classId).single(),
      supabase.from("arms").select("name").eq("id", data.armId).single(),
    ]);

    let subjectList = (subjects ?? []).map((o: any) => ({ id: o.subject_id, name: o.subjects?.name, code: o.subjects?.code }));
    if (subjectList.length === 0) {
      // fallback: derive from scored subjects
      const ids = Array.from(new Set((scores ?? []).map((s: any) => s.subject_id)));
      if (ids.length) {
        const { data: subs } = await supabase.from("subjects").select("id,name,code").in("id", ids);
        subjectList = (subs ?? []).map((s: any) => ({ id: s.id, name: s.name, code: s.code }));
      }
    }

    const key = (st: string, su: string) => `${st}|${su}`;
    const scoreMap = new Map<string, any>((scores ?? []).map((s: any) => [key(s.student_id, s.subject_id), s]));
    const rows = (students ?? []).map((st: any) => {
      const cells = subjectList.map((su: any) => scoreMap.get(key(st.id, su.id)) ?? null);
      const total = cells.reduce((a, c) => a + Number(c?.total ?? 0), 0);
      const counted = cells.filter(Boolean).length;
      return { student: st, cells, total, average: counted ? total / counted : 0 };
    }).sort((a, b) => b.total - a.total).map((r, i) => ({ ...r, position: i + 1 }));

    return {
      school: SCHOOL, term, class: cls, arm, subjects: subjectList, rows,
    };
  });

export const getTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: student } = await supabase.from("students").select(
      "id,admission_no,full_name,gender,date_of_birth,admission_date"
    ).eq("id", data.studentId).single();
    if (!student) throw new Error("Student not found");

    const { data: sheets } = await supabase.from("result_sheets")
      .select("term_id,session_id,average,total_score,total_obtainable,position,status,promoted,terms:term_id(name),academic_sessions:session_id(name),classes:class_id(name),arms:arm_id(name)")
      .eq("student_id", data.studentId)
      .in("status", ["published", "locked"])
      .order("session_id");

    return { school: SCHOOL, student, sheets: sheets ?? [] };
  });

// ---------- Public PIN portal (no auth middleware) ----------
export const lookupResultByPin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    pin: z.string().regex(/^\d{4}-\d{4}-\d{4}$/),
    admissionNo: z.string().min(3).max(40),
    termId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: student } = await supabaseAdmin.from("students").select("id").eq("admission_no", data.admissionNo).maybeSingle();
    if (!student) throw new Error("Admission number not found.");

    const { data: card } = await supabaseAdmin.from("scratch_cards").select("*").eq("pin", data.pin).maybeSingle();
    if (!card) throw new Error("Invalid scratch card PIN.");
    if (card.status === "revoked") throw new Error("This PIN has been revoked.");
    if (card.uses >= card.max_uses && card.assigned_student_id !== student.id) {
      throw new Error("This PIN has already been used to its limit.");
    }
    if (card.assigned_student_id && card.assigned_student_id !== student.id) {
      throw new Error("This PIN is tied to a different student.");
    }
    if (card.term_id && card.term_id !== data.termId) {
      throw new Error("This PIN is not valid for the selected term.");
    }

    // Verify published sheet exists
    const { data: sheet } = await supabaseAdmin.from("result_sheets")
      .select("status").eq("student_id", student.id).eq("term_id", data.termId).maybeSingle();
    if (!sheet || !["published", "locked"].includes(sheet.status)) {
      throw new Error("Results for this term are not yet published.");
    }

    // Bind card to student on first use, increment uses
    const newUses = card.uses + 1;
    await supabaseAdmin.from("scratch_cards").update({
      uses: newUses,
      assigned_student_id: card.assigned_student_id ?? student.id,
      status: newUses >= card.max_uses ? "used" : "unused",
    }).eq("id", card.id);

    return await buildReport(supabaseAdmin, student.id, data.termId);
  });

export const listPublishedTerms = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("terms")
      .select("id,name,academic_sessions:session_id(name)").order("start_date");
    return { terms: data ?? [] };
  });
