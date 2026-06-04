import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const sectionEnum = z.enum(["NUR", "PRI", "SEC"]);

// ===== Classes =====
export const createClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      name: z.string().min(1).max(64),
      section: sectionEnum,
      level_order: z.number().int().min(0).max(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("classes").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(64),
      section: sectionEnum,
      level_order: z.number().int().min(0).max(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("classes").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("classes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Arms =====
export const createArm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().min(1).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("arms").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateArm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), name: z.string().min(1).max(32) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("arms").update({ name: data.name }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteArm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("arms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Subjects =====
const SubjectSchema = z.object({
  name: z.string().min(1).max(64),
  code: z.string().max(16).optional().nullable(),
  section: sectionEnum.nullable().optional(),
  min_level_order: z.number().int().min(0).max(50).nullable().optional(),
  max_level_order: z.number().int().min(0).max(50).nullable().optional(),
  restricted_arm_ids: z.array(z.string().uuid()).max(50).optional(),
});

export const createSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubjectSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      code: data.code || null,
      section: data.section ?? null,
      min_level_order: data.min_level_order ?? null,
      max_level_order: data.max_level_order ?? null,
      restricted_arm_ids: data.restricted_arm_ids ?? [],
    };
    const { error } = await (context.supabase.from("subjects") as any).insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => SubjectSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = {
      name: rest.name,
      code: rest.code || null,
      section: rest.section ?? null,
      min_level_order: rest.min_level_order ?? null,
      max_level_order: rest.max_level_order ?? null,
      restricted_arm_ids: rest.restricted_arm_ids ?? [],
    };
    const { error } = await (context.supabase.from("subjects") as any).update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subjects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Current session / term =====
export const setCurrentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error: e1 } = await supabase.from("academic_sessions").update({ is_current: false }).neq("id", data.id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from("academic_sessions").update({ is_current: true }).eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const setCurrentTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error: e1 } = await supabase.from("terms").update({ is_current: false }).neq("id", data.id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from("terms").update({ is_current: true }).eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const listTerms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("terms")
      .select("id,name,session_id,is_current,academic_sessions:session_id(name,is_current)")
      .order("created_at", { ascending: false });
    return (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      session_id: t.session_id,
      session_name: t.academic_sessions?.name ?? "—",
      is_current: t.is_current,
      session_is_current: t.academic_sessions?.is_current ?? false,
    }));
  });
