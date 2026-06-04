import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ExportKind = "students" | "staff" | "results" | "attendance" | "scratch_cards";

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export const exportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: ExportKind }) =>
    z.object({ kind: z.enum(["students", "staff", "results", "attendance", "scratch_cards"]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ filename: string; csv: string; count: number }> => {
    const { supabase } = context;
    let rows: any[] = [];
    switch (data.kind) {
      case "students": {
        const { data: r, error } = await supabase.from("students")
          .select("admission_no, full_name, gender, date_of_birth, parent_name, parent_phone, state_of_origin, lga, address, is_active, admission_date");
        if (error) throw new Error(error.message);
        rows = r ?? [];
        break;
      }
      case "staff": {
        const { data: r, error } = await supabase.from("staff")
          .select("employee_no, full_name, email, phone, gender, department, qualification, date_employed, is_active");
        if (error) throw new Error(error.message);
        rows = r ?? [];
        break;
      }
      case "results": {
        const { data: r, error } = await supabase.from("result_sheets")
          .select("student_id, session_id, term_id, total_score, total_obtainable, average, position, status, published_at");
        if (error) throw new Error(error.message);
        rows = r ?? [];
        break;
      }
      case "attendance": {
        const { data: r, error } = await supabase.from("attendance")
          .select("date, student_id, class_id, arm_id, term_id, status, note");
        if (error) throw new Error(error.message);
        rows = r ?? [];
        break;
      }
      case "scratch_cards": {
        const { data: r, error } = await supabase.from("scratch_cards")
          .select("pin, status, max_uses, uses, session_id, term_id, assigned_student_id, created_at");
        if (error) throw new Error(error.message);
        rows = r ?? [];
        break;
      }
    }
    const stamp = new Date().toISOString().slice(0, 10);
    return { filename: `${data.kind}-${stamp}.csv`, csv: toCsv(rows), count: rows.length };
  });
