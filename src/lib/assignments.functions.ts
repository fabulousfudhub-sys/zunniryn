import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AssignmentRow {
  id: string;
  staff_id: string;
  staff_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  arm_id: string;
  arm_name: string;
  session_id: string;
  session_name: string;
}

export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("teacher_assignments")
      .select("id,staff_id,subject_id,class_id,arm_id,session_id,staff:staff_id(full_name),subjects:subject_id(name),classes:class_id(name),arms:arm_id(name),academic_sessions:session_id(name)")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any): AssignmentRow => ({
      id: r.id,
      staff_id: r.staff_id,
      staff_name: r.staff?.full_name ?? "—",
      subject_id: r.subject_id,
      subject_name: r.subjects?.name ?? "—",
      class_id: r.class_id,
      class_name: r.classes?.name ?? "—",
      arm_id: r.arm_id,
      arm_name: r.arms?.name ?? "—",
      session_id: r.session_id,
      session_name: r.academic_sessions?.name ?? "—",
    }));
  });

export const listTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: roles } = await supabase
      .from("user_roles").select("user_id,role").in("role", ["teacher", "form_master"]);
    const teacherUserIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (!teacherUserIds.length) return [] as { id: string; full_name: string }[];
    const { data: staff, error } = await supabase
      .from("staff").select("id,full_name").in("user_id", teacherUserIds).eq("is_active", true).order("full_name");
    if (error) throw new Error(error.message);
    return staff ?? [];
  });

const CreateSchema = z.object({
  staff_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  class_id: z.string().uuid(),
  arm_id: z.string().uuid(),
  session_id: z.string().uuid(),
});

export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase.from("teacher_assignments").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return row;
  });

const BulkSchema = z.object({
  staff_id: z.string().uuid(),
  session_id: z.string().uuid(),
  subject_ids: z.array(z.string().uuid()).min(1).max(50),
  class_ids: z.array(z.string().uuid()).min(1).max(50),
  arm_ids: z.array(z.string().uuid()).min(1).max(50),
});

export const bulkCreateAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { staff_id, session_id, subject_ids, class_ids, arm_ids } = data;

    // Build cartesian product
    const rows: Array<{ staff_id: string; session_id: string; subject_id: string; class_id: string; arm_id: string }> = [];
    for (const subject_id of subject_ids) {
      for (const class_id of class_ids) {
        for (const arm_id of arm_ids) {
          rows.push({ staff_id, session_id, subject_id, class_id, arm_id });
        }
      }
    }

    // Fetch existing to skip duplicates
    const { data: existing } = await supabase
      .from("teacher_assignments")
      .select("subject_id,class_id,arm_id")
      .eq("staff_id", staff_id).eq("session_id", session_id);
    const existingKeys = new Set((existing ?? []).map((r: any) => `${r.subject_id}|${r.class_id}|${r.arm_id}`));
    const toInsert = rows.filter((r) => !existingKeys.has(`${r.subject_id}|${r.class_id}|${r.arm_id}`));

    if (toInsert.length === 0) return { created: 0, skipped: rows.length };
    const { error } = await supabase.from("teacher_assignments").insert(toInsert);
    if (error) throw new Error(error.message);
    return { created: toInsert.length, skipped: rows.length - toInsert.length };
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("teacher_assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// Returns the distinct subjects/classes/arms the current user (as a teacher) is assigned to.
export const getMyAssignedOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: staff } = await supabase.from("staff").select("id").eq("user_id", userId).maybeSingle();
    if (!staff) return { subjectIds: [] as string[], classIds: [] as string[], armIds: [] as string[], hasAny: false };
    const { data } = await supabase
      .from("teacher_assignments")
      .select("subject_id,class_id,arm_id")
      .eq("staff_id", staff.id);
    const subjectIds = Array.from(new Set((data ?? []).map((r: any) => r.subject_id)));
    const classIds = Array.from(new Set((data ?? []).map((r: any) => r.class_id)));
    const armIds = Array.from(new Set((data ?? []).map((r: any) => r.arm_id)));
    return { subjectIds, classIds, armIds, hasAny: (data ?? []).length > 0 };
  });
