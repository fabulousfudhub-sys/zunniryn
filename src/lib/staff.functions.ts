import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole =
  | "super_admin" | "director" | "principal" | "vice_principal"
  | "admission_officer" | "teacher" | "form_master" | "exam_officer"
  | "parent" | "student";

export interface StaffRow {
  id: string;
  user_id: string | null;
  employee_no: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  gender: "Male" | "Female" | null;
  department: string | null;
  qualification: string | null;
  address: string | null;
  state_of_origin: string | null;
  lga: string | null;
  is_active: boolean;
  date_employed: string;
  roles: AppRole[];
}

function admin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertManager(roles: AppRole[]) {
  if (!roles.some((r) => r === "super_admin" || r === "principal")) {
    throw new Error("Forbidden: only super admin or principal can manage staff");
  }
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: staff, error } = await supabase
      .from("staff")
      .select("id,user_id,employee_no,full_name,email,phone,gender,department,qualification,address,state_of_origin,lga,is_active,date_employed")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = (staff ?? []).map((s) => s.user_id).filter((x): x is string => !!x);
    let rolesByUser = new Map<string, AppRole[]>();
    if (userIds.length) {
      const { data: roleRows } = await supabase.from("user_roles").select("user_id,role").in("user_id", userIds);
      for (const r of roleRows ?? []) {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      }
    }

    return (staff ?? []).map((s: any): StaffRow => ({
      ...s,
      roles: s.user_id ? rolesByUser.get(s.user_id) ?? [] : [],
    }));
  });

const VALID_ROLES: AppRole[] = [
  "director","principal","vice_principal","admission_officer",
  "teacher","form_master","exam_officer",
];

const CreateSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  gender: z.enum(["Male", "Female"]).optional(),
  department: z.string().max(80).optional(),
  qualification: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  state_of_origin: z.string().max(80).optional(),
  lga: z.string().max(80).optional(),
  password: z.string().min(8).max(72),
  roles: z.array(z.enum(VALID_ROLES as [AppRole, ...AppRole[]])).min(1),
});

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: callerRoles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    assertManager((callerRoles ?? []).map((r) => r.role as AppRole));

    const a = admin();

    const { data: empNo, error: empErr } = await a.rpc("generate_employee_no");
    if (empErr || !empNo) throw new Error(empErr?.message ?? "Could not generate employee number");

    const { data: created, error: authErr } = await a.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (authErr || !created.user) throw new Error(authErr?.message ?? "Could not create user");
    const newUserId = created.user.id;

    await a.from("user_roles").delete().eq("user_id", newUserId);
    const roleRows = data.roles.map((role) => ({ user_id: newUserId, role }));
    const { error: roleErr } = await a.from("user_roles").insert(roleRows);
    if (roleErr) {
      await a.auth.admin.deleteUser(newUserId);
      throw new Error(roleErr.message);
    }

    await a.from("profiles").update({
      full_name: data.full_name,
      phone: data.phone ?? null,
      email: data.email,
    }).eq("user_id", newUserId);

    const { data: staffRow, error: staffErr } = await a.from("staff").insert({
      user_id: newUserId,
      employee_no: empNo as string,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone ?? null,
      gender: data.gender ?? null,
      department: data.department ?? null,
      qualification: data.qualification ?? null,
      address: data.address ?? null,
      state_of_origin: data.state_of_origin ?? null,
      lga: data.lga ?? null,
    } as any).select("id,employee_no").single();
    if (staffErr) {
      await a.auth.admin.deleteUser(newUserId);
      throw new Error(staffErr.message);
    }
    return staffRow;
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().max(30).optional().nullable(),
  gender: z.enum(["Male", "Female"]).optional().nullable(),
  department: z.string().max(80).optional().nullable(),
  qualification: z.string().max(120).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  state_of_origin: z.string().max(80).optional().nullable(),
  lga: z.string().max(80).optional().nullable(),
  is_active: z.boolean().optional(),
  roles: z.array(z.enum(VALID_ROLES as [AppRole, ...AppRole[]])).optional(),
});

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: callerRoles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    assertManager((callerRoles ?? []).map((r) => r.role as AppRole));

    const { id, roles, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
    const a = admin();
    const { data: staffRow, error } = await a.from("staff").update(patch as any).eq("id", id).select("user_id,full_name,phone").single();
    if (error) throw new Error(error.message);

    if (staffRow?.user_id) {
      await a.from("profiles").update({
        full_name: staffRow.full_name,
        phone: staffRow.phone,
      }).eq("user_id", staffRow.user_id);

      if (roles && roles.length) {
        await a.from("user_roles").delete().eq("user_id", staffRow.user_id);
        await a.from("user_roles").insert(roles.map((role) => ({ user_id: staffRow.user_id!, role })));
      }
    }
    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: callerRoles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(callerRoles ?? []).some((r: any) => r.role === "super_admin")) {
      throw new Error("Only super admin can delete staff");
    }
    const a = admin();
    const { data: row } = await a.from("staff").select("user_id").eq("id", data.id).maybeSingle();
    const { error } = await a.from("staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.user_id) {
      await a.auth.admin.deleteUser(row.user_id).catch(() => {});
    }
    return { ok: true };
  });
