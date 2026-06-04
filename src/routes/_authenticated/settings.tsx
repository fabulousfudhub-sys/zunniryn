import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { getMe } from "@/lib/me.functions";
import { setCurrentSession, setCurrentTerm, listTerms } from "@/lib/academic.functions";
import { getReferenceData } from "@/lib/reference.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Upload, X, Save, CalendarDays, ShieldCheck, History,
  CheckCircle2, Activity, CloudUpload,
} from "lucide-react";
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
    <div className="p-6 lg:p-8 space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Global School Settings</p>
        <h1 className="font-display text-3xl font-semibold text-primary">Institutional Hub</h1>
        <p className="text-sm text-muted-foreground">
          Manage the foundational identity and academic parameters of {form.school_name}.
          {!isSuper && <span className="ml-1 text-destructive">(read-only)</span>}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <form onSubmit={submit} className="grid gap-6 sm:grid-cols-[auto_1fr]">
              {/* Logo */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => isSuper && fileRef.current?.click()}
                  className="flex h-32 w-32 flex-col items-center justify-center gap-1 border-2 border-dashed bg-muted/30 text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 overflow-hidden"
                  disabled={!isSuper}
                >
                  {form.logo_url
                    ? <img src={form.logo_url} alt="School logo" className="h-full w-full object-contain" />
                    : <><Upload className="h-6 w-6" /><span className="text-[11px] font-medium uppercase tracking-wide">Update Logo</span></>}
                </button>
                {form.logo_url && isSuper && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("logo_url", null)}>
                    <X className="mr-1 h-3.5 w-3.5" /> Remove
                  </Button>
                )}
                <p className="max-w-[8rem] text-center text-[11px] text-muted-foreground">PNG or JPG recommended. Max 1MB.</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoFile(f); e.target.value = ""; }} disabled={!isSuper} />
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Row label="School Name"><Input value={form.school_name} onChange={(e) => set("school_name", e.target.value)} disabled={!isSuper} /></Row>
                  <Row label="Acronym"><Input value={form.acronym} onChange={(e) => set("acronym", e.target.value)} disabled={!isSuper} /></Row>
                </div>
                <Row label="Physical Address">
                  <Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} disabled={!isSuper} rows={2} />
                </Row>
                <Row label="Motto"><Input value={form.motto ?? ""} onChange={(e) => set("motto", e.target.value)} disabled={!isSuper} /></Row>
                {isSuper && (
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Academic period */}
        <AcademicPeriodCard isSuper={!!isSuper} />
      </div>

      {/* Contact + defaults */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold text-primary">Contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Principal name"><Input value={form.principal_name ?? ""} onChange={(e) => set("principal_name", e.target.value)} disabled={!isSuper} /></Row>
              <Row label="Location"><Input value={form.location} onChange={(e) => set("location", e.target.value)} disabled={!isSuper} /></Row>
              <Row label="Contact email"><Input type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} disabled={!isSuper} /></Row>
              <Row label="Contact phone"><Input value={form.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} disabled={!isSuper} /></Row>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold text-primary">Defaults</h2>
            <Row label="Scratch-card default uses">
              <Input type="number" min={1} max={50} value={form.scratch_card_default_uses}
                onChange={(e) => set("scratch_card_default_uses", e.target.value)} disabled={!isSuper} />
            </Row>
            <p className="text-xs text-muted-foreground">Number of times a single result-checker PIN can be used before it is exhausted.</p>
          </CardContent>
        </Card>
      </div>

      {/* Status tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusTile icon={<CheckCircle2 className="h-5 w-5" />} label="System Status" value="Configured" />
        <StatusTile icon={<ShieldCheck className="h-5 w-5" />} label="Records" value="Secured" />
        <StatusTile icon={<Activity className="h-5 w-5" />} label="Audit Logs" value="Active" />
        <Button asChild variant="secondary" className="h-auto justify-start gap-3 p-4">
          <Link to="/exports">
            <CloudUpload className="h-5 w-5 text-primary" />
            <span className="font-medium">Exports &amp; Backup</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

function AcademicPeriodCard({ isSuper }: { isSuper: boolean }) {
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

  const applySession = async (id: string) => {
    if (!id || id === current?.id) return;
    setBusy(true);
    try {
      await setSession({ data: { id } });
      toast.success("Current session updated.");
      qc.invalidateQueries({ queryKey: ["reference"] });
      qc.invalidateQueries({ queryKey: ["all-terms"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const applyTerm = async (id: string) => {
    if (!id || id === currentTerm?.id) return;
    setBusy(true);
    try {
      await setTerm({ data: { id } });
      toast.success("Current term updated.");
      qc.invalidateQueries({ queryKey: ["all-terms"] });
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-primary">Academic Period</h2>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Current Session</Label>
          <Select value={current?.id ?? ""} onValueChange={applySession} disabled={!isSuper || busy}>
            <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
            <SelectContent>
              {sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Current Term</Label>
          <div className="grid grid-cols-3 gap-2">
            {sessionTerms.length === 0 && <p className="col-span-3 text-xs text-muted-foreground">No terms in this session.</p>}
            {sessionTerms.map((t) => {
              const active = t.id === currentTerm?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTerm(t.id)}
                  disabled={!isSuper || busy}
                  className={`border px-2 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-input bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {t.name.replace(/\s*Term$/i, "")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live Now
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            {currentTerm?.name ?? "—"} · {current?.name ?? "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center bg-muted text-primary">{icon}</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-display font-semibold text-primary">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}
