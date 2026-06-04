import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("announcements")
      .select("id,title,body,audience,class_id,arm_id,published,created_at,created_by")
      .eq("published", true).order("created_at", { ascending: false }).limit(100);
    return { announcements: data ?? [] };
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    title: z.string().min(2).max(200),
    body: z.string().min(2).max(5000),
    audience: z.enum(["all","staff","students","parents","class"]).default("all"),
    classId: z.string().uuid().optional(),
    armId: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error, data: row } = await supabase.from("announcements").insert({
      title: data.title, body: data.body, audience: data.audience,
      class_id: data.classId ?? null, arm_id: data.armId ?? null,
      created_by: userId, published: true,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
