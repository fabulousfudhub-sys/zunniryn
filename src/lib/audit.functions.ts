import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number; entity?: string }) =>
    z.object({ limit: z.number().min(1).max(500).default(100), entity: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<AuditEntry[]> => {
    const { supabase } = context;
    let q = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.entity) q = q.eq("entity", data.entity);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean) as string[]));
    let profileMap = new Map<string, string>();
    if (actorIds.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", actorIds);
      profileMap = new Map((profs ?? []).map((p) => [p.user_id, p.full_name ?? p.email ?? "—"]));
    }

    return (rows ?? []).map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entity_id: r.entity_id,
      actor_id: r.actor_id,
      actor_name: r.actor_id ? profileMap.get(r.actor_id) ?? null : null,
      old_value: r.old_value == null ? null : JSON.stringify(r.old_value),
      new_value: r.new_value == null ? null : JSON.stringify(r.new_value),
      created_at: r.created_at,
    }));
  });
