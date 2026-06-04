import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------------- Score grid ----------------
const gridInput = z.object({
  classId: z.string().uuid(),
  armId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
});

export const getScoreGrid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => gridInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: term } = await supabase.from("terms").select("session_id").eq("id", data.termId).single();
    if (!term) throw new Error("Invalid term");

    const [{ data: students }, { data: scores }] = await Promise.all([
      supabase.from("students")
        .select("id,admission_no,full_name")
        .eq("current_class_id", data.classId)
        .eq("current_arm_id", data.armId)
        .eq("is_active", true)
        .order("full_name"),
      supabase.from("scores")
        .select("id,student_id,ca1,ca2,ca3,exam,total,grade,remark")
        .eq("term_id", data.termId)
        .eq("subject_id", data.subjectId)
        .eq("class_id", data.classId)
        .eq("arm_id", data.armId),
    ]);

    const map = new Map((scores ?? []).map((s) => [s.student_id, s]));
    const rows = (students ?? []).map((s) => ({
      student_id: s.id,
      admission_no: s.admission_no,
      full_name: s.full_name,
      ...(map.get(s.id) ?? { ca1: 0, ca2: 0, ca3: 0, exam: 0, total: 0, grade: null, remark: null }),
    }));
    return { rows, sessionId: term.session_id };
  });

const saveInput = z.object({
  classId: z.string().uuid(),
  armId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  sessionId: z.string().uuid(),
  entries: z.array(z.object({
    studentId: z.string().uuid(),
    ca1: z.number().min(0).max(10),
    ca2: z.number().min(0).max(10),
    ca3: z.number().min(0).max(10),
    exam: z.number().min(0).max(70),
  })).max(200),
});

export const saveScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.entries.map((e) => ({
      student_id: e.studentId,
      subject_id: data.subjectId,
      class_id: data.classId,
      arm_id: data.armId,
      term_id: data.termId,
      session_id: data.sessionId,
      ca1: e.ca1, ca2: e.ca2, ca3: e.ca3, exam: e.exam,
      entered_by: userId,
    }));
    const { error } = await supabase.from("scores").upsert(rows, { onConflict: "student_id,subject_id,term_id" });
    if (error) throw new Error(error.message);

    // recompute sheets
    await Promise.all(data.entries.map((e) =>
      supabase.rpc("recompute_result_sheet" as never, { _student_id: e.studentId, _term_id: data.termId } as never)
    ));
    return { saved: rows.length };
  });

// ---------------- Result sheets ----------------
export const listResultSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    classId: z.string().uuid(),
    armId: z.string().uuid(),
    termId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: sheets, error } = await supabase
      .from("result_sheets")
      .select("id,student_id,total_score,total_obtainable,average,position,status,students!inner(full_name,admission_no)")
      .eq("class_id", data.classId)
      .eq("arm_id", data.armId)
      .eq("term_id", data.termId)
      .order("total_score", { ascending: false });
    if (error) throw new Error(error.message);
    // assign positions
    const ranked = (sheets ?? []).map((s, i) => ({ ...s, rank: i + 1 }));
    return { sheets: ranked };
  });

export const setSheetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    sheetIds: z.array(z.string().uuid()).min(1).max(200),
    status: z.enum(["draft","submitted","approved","published","locked"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch = data.status === "published"
      ? { status: data.status, published_at: new Date().toISOString() }
      : { status: data.status };
    const { error } = await supabase.from("result_sheets").update(patch).in("id", data.sheetIds);
    if (error) throw new Error(error.message);

    if (data.status === "published") {
      const { data: sheets } = await supabase.from("result_sheets")
        .select("id,class_id,arm_id,term_id").in("id", data.sheetIds);
      const groups = new Map<string, string[]>();
      (sheets ?? []).forEach((s) => {
        const k = `${s.class_id}|${s.arm_id}|${s.term_id}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(s.id);
      });
      for (const k of groups.keys()) {
        const [cId, aId, tId] = k.split("|");
        const { data: ranked } = await supabase.from("result_sheets")
          .select("id,total_score").eq("class_id", cId).eq("arm_id", aId).eq("term_id", tId)
          .order("total_score", { ascending: false });
        await Promise.all((ranked ?? []).map((r, i) =>
          supabase.from("result_sheets").update({ position: i + 1 }).eq("id", r.id)
        ));
      }
    }

    await supabase.from("audit_log").insert({
      actor_id: userId, action: `result.${data.status}`,
      entity: "result_sheets", new_value: { ids: data.sheetIds } as never,
    });
    return { updated: data.sheetIds.length };
  });

// ---------------- Scratch cards ----------------
function genPin() {
  const seg = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `${seg()}-${seg()}-${seg()}`;
}

export const generateScratchCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    sessionId: z.string().uuid(),
    termId: z.string().uuid().optional(),
    count: z.number().int().min(1).max(500),
    maxUses: z.number().int().min(1).max(20).default(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = Array.from({ length: data.count }, () => ({
      pin: genPin(),
      session_id: data.sessionId,
      term_id: data.termId ?? null,
      max_uses: data.maxUses,
      created_by: userId,
    }));
    const { data: inserted, error } = await supabase.from("scratch_cards").insert(rows).select("pin,max_uses,created_at");
    if (error) throw new Error(error.message);
    return { cards: inserted ?? [] };
  });

export const listScratchCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("scratch_cards")
      .select("id,pin,status,uses,max_uses,created_at,session_id,term_id")
      .order("created_at", { ascending: false }).limit(200);
    return { cards: data ?? [] };
  });
