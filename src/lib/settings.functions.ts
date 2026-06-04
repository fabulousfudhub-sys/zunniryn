import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("school_settings").select("*").eq("id", 1).single();
    return { settings: data };
  });

// Accept https URL or data: URL (embedded base64 image), up to ~1.5MB encoded
const logoSchema = z.string().max(2_000_000).optional().nullable().refine(
  (v) => !v || v.startsWith("data:image/") || /^https?:\/\//.test(v),
  { message: "Logo must be an uploaded image or http(s) URL" },
);

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    school_name: z.string().min(1).max(200),
    acronym: z.string().min(1).max(20),
    location: z.string().min(1).max(200),
    motto: z.string().max(200).optional().nullable(),
    logo_url: logoSchema,
    principal_name: z.string().max(120).optional().nullable(),
    contact_email: z.string().email().max(200).optional().nullable().or(z.literal("")),
    contact_phone: z.string().max(40).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    scratch_card_default_uses: z.number().int().min(1).max(50),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, contact_email: data.contact_email || null };
    const { error } = await context.supabase.from("school_settings")
      .update({ ...payload, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
