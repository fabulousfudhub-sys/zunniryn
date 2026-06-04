import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { getMe } from "@/lib/me.functions";
import { setCurrentSession, setCurrentTerm, listTerms } from "@/lib/academic.functions";
import { getReferenceData } from "@/lib/reference.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: Page });

const MAX_LOGO_BYTES = 1_000_000; // 1MB original file

function Page() {
  const get = useServerFn(getSettings);
  const meFn = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const q = useQuery({ queryKey: ["settings"], queryFn: () => get() });
  const save = useServerFn(updateSettings);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isSuper = me.data?.roles?.includes("super_admin");

  useEffect(() => { if (q.data?.settings) setForm(q.data.settings); }, [q.data]);

  const onLogoFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > MAX_LOGO_BYTES) { toast.error("Logo must be under 1MB."); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    setForm((f: any) => ({ ...f, logo_url: dataUrl }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await save({ data: {
        school_name: form.school_name, acronym: form.acronym, location: form.location,
        motto: form.motto, logo_url: form.logo_url, principal_name: form.principal_name,
        contact_email: form.contact_email, contact_phone: form.contact_phone, address: form.address,
        scratch_card_default_uses: Number(form.scratch_card_default_uses),
      } });
      toast.success("Settings saved.");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (!form) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <h1 className="font-display text-3xl font-bold text-primary">School Settings</h1>
      <p className="text-sm text-muted-foreground">Configure school identity and defaults. {!isSuper && <span className="text-destructive">(read-only)</span>}</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Row label="School name"><Input value={form.school_name} onChange={(e) => set("school_name", e.target.value)} disabled={!isSuper} /></Row>
            <Row label="Acronym"><Input value={form.acronym} onChange={(e) => set("acronym", e.target.value)} disabled={!isSuper} /></Row>
            <Row label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} disabled={!isSuper} /></Row>
            <Row label="Motto"><Input value={form.motto ?? ""} onChange={(e) => set("motto", e.target.value)} disabled={!isSuper} /></Row>

            <Row label="School logo" className="md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted/30 overflow-hidden">
                  {form.logo_url
                    ? <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                    : <span className="text-xs text-muted-foreground">No logo</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoFile(f); e.target.value = ""; }}
                    disabled={!isSuper}
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!isSuper}>
                      <Upload className="mr-2 h-4 w-4" /> Upload image
                    </Button>
                    {form.logo_url && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => set("logo_url", null)} disabled={!isSuper}>
                        <X className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG or JPG, under 1MB. Embedded directly — no link needed.</p>
                </div>
              </div>
            </Row>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Row label="Principal name"><Input value={form.principal_name ?? ""} onChange={(e) => set("principal_name", e.target.value)} disabled={!isSuper} /></Row>
            <Row label="Contact email"><Input type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} disabled={!isSuper} /></Row>
            <Row label="Contact phone"><Input value={form.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} disabled={!isSuper} /></Row>
            <Row label="Address" className="md:col-span-2"><Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} disabled={!isSuper} rows={2} /></Row>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Defaults</CardTitle></CardHeader>
          <CardContent>
            <Row label="Scratch-card default uses">
              <Input type="number" min={1} max={50} value={form.scratch_card_default_uses}
                onChange={(e) => set("scratch_card_default_uses", e.target.value)} disabled={!isSuper} />
            </Row>
          </CardContent>
        </Card>
        {isSuper && (
          <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Settings
          </Button>
        )}
      </form>

      {isSuper && <CurrentSessionTermCard />}
    </div>
  );
}

function CurrentSessionTermCard() {
  const qc = useQueryClient();
  const refFn = useServerFn(getReferenceData);
  const termsFn = useServerFn(listTerms);
  const setSession = useServerFn(setCurrentSession);
  const setTerm = useServerFn(setCurrentTerm);
  const refQ = useQuery({ queryKey: ["reference"], queryFn: () => refFn() });
  const termsQ = useQuery({ queryKey: ["all-terms"], queryFn: () => termsFn() });
  const [busy, setBusy] = useState(false);

  const current = refQ.data?.currentSession ?? null;
  const sessions = refQ.data?.sessions ?? [];
  const allTerms = termsQ.data ?? [];
  const sessionTerms = allTerms.filter((t) => t.session_id === current?.id);
  const currentTerm = sessionTerms.find((t) => t.is_current) ?? null;

  const [selSession, setSelSession] = useState<string>("");
  const [selTerm, setSelTerm] = useState<string>("");
  useEffect(() => { if (current && !selSession) setSelSession(current.id); }, [current, selSession]);
  useEffect(() => { if (currentTerm && !selTerm) setSelTerm(currentTerm.id); }, [currentTerm, selTerm]);

  const applySession = async () => {
    if (!selSession || selSession === current?.id) return;
    setBusy(true);
    try { await setSession({ data: { id: selSession } }); toast.success("Current session updated."); qc.invalidateQueries({ queryKey: ["reference"] }); qc.invalidateQueries({ queryKey: ["all-terms"] }); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const applyTerm = async () => {
    if (!selTerm || selTerm === currentTerm?.id) return;
    setBusy(true);
    try { await setTerm({ data: { id: selTerm } }); toast.success("Current term updated."); qc.invalidateQueries({ queryKey: ["all-terms"] }); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Current Session & Term</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="mb-1.5 block">Active session</Label>
          <div className="flex gap-2">
            <Select value={selSession} onValueChange={setSelSession}>
              <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.is_current ? " (current)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={applySession} disabled={busy || !selSession || selSession === current?.id}>
              <Check className="mr-1 h-4 w-4" /> Set
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Currently: <span className="font-medium">{current?.name ?? "—"}</span></p>
        </div>
        <div>
          <Label className="mb-1.5 block">Active term (in current session)</Label>
          <div className="flex gap-2">
            <Select value={selTerm} onValueChange={setSelTerm} disabled={sessionTerms.length === 0}>
              <SelectTrigger><SelectValue placeholder={sessionTerms.length ? "Select term" : "No terms in current session"} /></SelectTrigger>
              <SelectContent>
                {sessionTerms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={applyTerm} disabled={busy || !selTerm || selTerm === currentTerm?.id}>
              <Check className="mr-1 h-4 w-4" /> Set
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Currently: <span className="font-medium">{currentTerm?.name ?? "—"}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-1.5 block">{label}</Label>{children}</div>;
}
