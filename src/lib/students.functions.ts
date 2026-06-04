import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudentStatus = "active" | "graduated" | "withdrawn" | "suspended" | "transferred" | "alumni";

export interface StudentRow {
  id: string;
  admission_no: string;
  full_name: string;
  gender: "Male" | "Female" | null;
  class_name: string | null;
  arm_name: string | null;
  section: "NUR" | "PRI" | "SEC" | null;
  parent_name: string | null;
  parent_phone: string | null;
  is_active: boolean;
  status: StudentStatus;
  admission_date: string;
}

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("students")
      .select("id,admission_no,full_name,gender,parent_name,parent_phone,is_active,status,admission_date,classes:current_class_id(name,section),arms:current_arm_id(name)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((s: any): StudentRow => ({
      id: s.id,
      admission_no: s.admission_no,
      full_name: s.full_name,
      gender: s.gender,
      parent_name: s.parent_name,
      parent_phone: s.parent_phone,
      is_active: s.is_active,
      status: (s.status ?? "active") as StudentStatus,
      admission_date: s.admission_date,
      class_name: s.classes?.name ?? null,
      arm_name: s.arms?.name ?? null,
      section: s.classes?.section ?? null,
    }));
  });

const CreateSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  gender: z.enum(["Male", "Female"]).optional(),
  date_of_birth: z.string().optional(),
  state_of_origin: z.string().max(80).optional(),
  lga: z.string().max(80).optional(),
  address: z.string().max(300).optional(),
  parent_name: z.string().max(120).optional(),
  parent_phone: z.string().max(30).optional(),
  parent_email: z.string().email().optional().or(z.literal("")),
  parent_occupation: z.string().max(120).optional(),
  class_id: z.string().uuid(),
  arm_id: z.string().uuid(),
  session_id: z.string().uuid(),
});

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Get section from class
    const { data: cls, error: clsErr } = await supabase
      .from("classes").select("section").eq("id", data.class_id).single();
    if (clsErr || !cls) throw new Error("Invalid class");

    // Generate admission number via RPC
    const { data: admNo, error: rpcErr } = await supabase.rpc("generate_admission_no", {
      _session_id: data.session_id,
      _section: cls.section,
    });
    if (rpcErr || !admNo) throw new Error(rpcErr?.message ?? "Could not generate admission number");

    const insertPayload = {
      admission_no: admNo as string,
      full_name: data.full_name,
      gender: data.gender ?? null,
      date_of_birth: data.date_of_birth || null,
      state_of_origin: data.state_of_origin || null,
      lga: data.lga || null,
      address: data.address || null,
      parent_name: data.parent_name || null,
      parent_phone: data.parent_phone || null,
      parent_email: data.parent_email || null,
      parent_occupation: data.parent_occupation || null,
      current_class_id: data.class_id,
      current_arm_id: data.arm_id,
      admission_session_id: data.session_id,
    };

    const { data: row, error } = await supabase
      .from("students").insert(insertPayload).select("id,admission_no").single();
    if (error) throw new Error(error.message);
    return row;
  });

const STATUSES = ["active","graduated","withdrawn","suspended","transferred","alumni"] as const;
const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES).optional(),
  current_class_id: z.string().uuid().optional(),
  current_arm_id: z.string().uuid().optional(),
  parent_name: z.string().max(120).optional().nullable(),
  parent_phone: z.string().max(30).optional().nullable(),
  parent_email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  address: z.string().max(300).optional().nullable(),
});

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (patch.parent_email === "") patch.parent_email = null;
    if (patch.status) patch.is_active = patch.status === "active";
    patch.updated_at = new Date().toISOString();
    const { error } = await (context.supabase.from("students") as any).update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const BulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(STATUSES).optional(),
  current_class_id: z.string().uuid().optional(),
  current_arm_id: z.string().uuid().optional(),
});

export const bulkUpdateStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { ids, status, current_class_id, current_arm_id } = data;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) { patch.status = status; patch.is_active = status === "active"; }
    if (current_class_id) patch.current_class_id = current_class_id;
    if (current_arm_id) patch.current_arm_id = current_arm_id;
    if (Object.keys(patch).length === 1) throw new Error("Nothing to update");
    const { error, count } = await (context.supabase.from("students") as any)
      .update(patch, { count: "exact" }).in("id", ids);
    if (error) throw new Error(error.message);
    return { updated: count ?? ids.length };
  });
