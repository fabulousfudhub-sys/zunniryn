import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listGradeScale = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("grade_scale")
      .select("id,grade,min_score,max_score,remark").order("min_score", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const RowSchema = z.object({
  grade: z.string().trim().min(1).max(4),
  min_score: z.number().int().min(0).max(100),
  max_score: z.number().int().min(0).max(100),
  remark: z.string().trim().min(1).max(60),
}).refine((r) => r.min_score <= r.max_score, { message: "min_score must be <= max_score" });

export const saveGradeScale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ rows: z.array(RowSchema).min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error: delErr } = await supabase.from("grade_scale").delete().gte("min_score", 0);
    if (delErr) throw new Error(delErr.message);
    const { error } = await supabase.from("grade_scale").insert(data.rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.rows.length };
  });
