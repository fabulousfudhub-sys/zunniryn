import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ClassRef { id: string; name: string; section: "NUR" | "PRI" | "SEC"; level_order: number; }
export interface ArmRef { id: string; name: string; }
export interface SubjectRef {
  id: string; name: string; code: string | null;
  section: "NUR" | "PRI" | "SEC" | null;
  min_level_order: number | null;
  max_level_order: number | null;
  restricted_arm_ids: string[];
}
export interface SessionRef { id: string; name: string; short_code: string; is_current: boolean; }

export const getReferenceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [classes, arms, subjects, sessions] = await Promise.all([
      supabase.from("classes").select("id,name,section,level_order").order("level_order"),
      supabase.from("arms").select("id,name").order("name"),
      supabase.from("subjects").select("id,name,code,section,min_level_order,max_level_order,restricted_arm_ids").order("name"),
      supabase.from("academic_sessions").select("id,name,short_code,is_current").order("start_date", { ascending: false }),
    ]);
    return {
      classes: (classes.data ?? []) as ClassRef[],
      arms: (arms.data ?? []) as ArmRef[],
      subjects: ((subjects.data ?? []) as any[]).map((s) => ({
        ...s, restricted_arm_ids: s.restricted_arm_ids ?? [],
      })) as SubjectRef[],
      sessions: (sessions.data ?? []) as SessionRef[],
      currentSession: ((sessions.data ?? []).find((s) => s.is_current) ?? null) as SessionRef | null,
    };
  });

// Filter helper used by UI: which subjects are available for a (class, arm) combination?
export function subjectIsAvailableFor(subject: SubjectRef, cls: ClassRef | null | undefined, armId: string | null | undefined) {
  if (cls) {
    if (subject.section && subject.section !== cls.section) return false;
    if (subject.min_level_order != null && cls.level_order < subject.min_level_order) return false;
    if (subject.max_level_order != null && cls.level_order > subject.max_level_order) return false;
  }
  if (armId && subject.restricted_arm_ids.length > 0 && !subject.restricted_arm_ids.includes(armId)) return false;
  return true;
}
