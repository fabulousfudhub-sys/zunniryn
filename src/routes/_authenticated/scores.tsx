import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getReferenceData } from "@/lib/reference.functions";
import { getScoreGrid, saveScores } from "@/lib/results.functions";
import { getMyAssignedOptions } from "@/lib/assignments.functions";
import { getMe } from "@/lib/me.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ShieldAlert, Send, FileText, Printer, Upload, BarChart3, TrendingUp, AlertTriangle, Clock } from "lucide-react";

const refQO = queryOptions({ queryKey: ["reference"], queryFn: () => getReferenceData() });
const meQO = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
const myOptsQO = queryOptions({ queryKey: ["my-assigned-options"], queryFn: () => getMyAssignedOptions() });

export const Route = createFileRoute("/_authenticated/scores")({
  ssr: false,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(refQO),
      context.queryClient.ensureQueryData(meQO),
      context.queryClient.ensureQueryData(myOptsQO),
    ]),
  component: ScoreEntry,
});

interface Row {
  student_id: string;
  admission_no: string;
  full_name: string;
  ca1: number; ca2: number; ca3: number; exam: number;
  total: number; grade: string | null; remark: string | null;
}

const ADMIN_ROLES = ["super_admin", "principal", "vice_principal", "exam_officer", "director"];

function ScoreEntry() {
  const { data: ref } = useSuspenseQuery(refQO);
  const { data: me } = useSuspenseQuery(meQO);
  const { data: myOpts } = useSuspenseQuery(myOptsQO);
  const qc = useQueryClient();
  const isAdmin = me.roles.some((r) => ADMIN_ROLES.includes(r));
  const restricted = !isAdmin;

  const [classId, setClassId] = useState<string>("");
  const [armId, setArmId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [termId, setTermId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  const fetchGrid = useServerFn(getScoreGrid);
  const save = useServerFn(saveScores);

  const { data: terms } = useQuery({
    queryKey: ["terms", ref.currentSession?.id],
    queryFn: async () => {
      if (!ref.currentSession) return [];
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("terms").select("id,name,is_current").eq("session_id", ref.currentSession.id).order("name");
      return data ?? [];
    },
    enabled: !!ref.currentSession,
  });

  useEffect(() => {
    if (!termId && terms && terms.length) {
      const cur = terms.find((t: any) => t.is_current) ?? terms[0];
      if (cur) setTermId(cur.id);
    }
  }, [terms, termId]);

  const visibleClasses = useMemo(
    () => restricted ? ref.classes.filter((c) => myOpts.classIds.includes(c.id)) : ref.classes,
    [restricted, ref.classes, myOpts.classIds],
  );
  const visibleArms = useMemo(
    () => restricted ? ref.arms.filter((a) => myOpts.armIds.includes(a.id)) : ref.arms,
    [restricted, ref.arms, myOpts.armIds],
  );
  const visibleSubjects = useMemo(
    () => restricted ? ref.subjects.filter((s) => myOpts.subjectIds.includes(s.id)) : ref.subjects,
    [restricted, ref.subjects, myOpts.subjectIds],
  );

  // Build "My Classes" rail entries — distinct (subject × class) pairs
  const myClassEntries = useMemo(() => {
    const out: { key: string; classId: string; armId: string; subjectId: string; subjectName: string; classLabel: string }[] = [];
    for (const s of visibleSubjects) {
      for (const c of visibleClasses) {
        for (const a of visibleArms.slice(0, 2)) {
          out.push({
            key: `${s.id}-${c.id}-${a.id}`,
            classId: c.id, armId: a.id, subjectId: s.id,
            subjectName: s.name,
            classLabel: `${c.name}${a.name ? ` ${a.name}` : ""}`,
          });
        }
      }
    }
    return out.slice(0, 8);
  }, [visibleSubjects, visibleClasses, visibleArms]);

  const ready = classId && armId && subjectId && termId;

  const load = async (cid: string, aid: string, sid: string) => {
    if (!cid || !aid || !sid || !termId) return;
    const res = await fetchGrid({ data: { classId: cid, armId: aid, subjectId: sid, termId } });
    setRows(res.rows as Row[]);
    setSessionId(res.sessionId);
  };

  const pick = (e: typeof myClassEntries[number]) => {
    setClassId(e.classId); setArmId(e.armId); setSubjectId(e.subjectId);
    load(e.classId, e.armId, e.subjectId);
  };

  const updateRow = (id: string, field: "ca1"|"ca2"|"ca3"|"exam", value: number) => {
    setRows((prev) => prev.map((r) => r.student_id === id
      ? { ...r, [field]: value, total: (field==="ca1"?value:r.ca1)+(field==="ca2"?value:r.ca2)+(field==="ca3"?value:r.ca3)+(field==="exam"?value:r.exam) }
      : r));
  };

  const saveMutation = useMutation({
    mutationFn: () => save({ data: {
      classId, armId, subjectId, termId, sessionId,
      entries: rows.map((r) => ({ studentId: r.student_id, ca1: Number(r.ca1)||0, ca2: Number(r.ca2)||0, ca3: Number(r.ca3)||0, exam: Number(r.exam)||0 })),
    }}),
    onSuccess: () => { toast.success("Scores saved"); load(classId, armId, subjectId); qc.invalidateQueries({ queryKey: ["result_sheets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (restricted && !myOpts.hasAny) {
    return (
      <div className="p-6">
        <Card className="mx-auto max-w-xl p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl font-bold">No assignments yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ask the administrator to assign you under Teacher Assignments.</p>
        </Card>
      </div>
    );
  }

  const subjectName = ref.subjects.find((s) => s.id === subjectId)?.name ?? "—";
  const cls = ref.classes.find((c) => c.id === classId);
  const arm = ref.arms.find((a) => a.id === armId);
  const contextTitle = cls && arm ? `${subjectName} — ${cls.name}${arm.name ? ` (${arm.name})` : ""}` : "Select a class to begin";

  const entered = rows.filter((r) => (r.ca1 || r.ca2 || r.ca3 || r.exam) > 0).length;
  const remaining = rows.length - entered;
  const avg = entered ? Math.round((rows.reduce((s, r) => s + (r.total || 0), 0) / entered) * 10) / 10 : 0;
  const highest = rows.reduce((m, r) => Math.max(m, r.total || 0), 0);
  const under = rows.filter((r) => (r.total || 0) > 0 && (r.total || 0) < 40).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Results › Score Entry</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Teacher Score Entry</h1>
          <p className="text-sm text-muted-foreground">{contextTitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Save Draft</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!rows.length || saveMutation.isPending}>
            <Send className="mr-2 h-4 w-4" /> Submit for Review
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* My Classes rail */}
        <Card className="p-3 h-fit lg:sticky lg:top-20">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Classes</div>
          <div className="mt-2 space-y-1">
            {myClassEntries.map((e) => {
              const active = e.classId === classId && e.armId === armId && e.subjectId === subjectId;
              return (
                <button
                  key={e.key}
                  onClick={() => pick(e)}
                  className={`w-full rounded-md border-l-2 px-3 py-2 text-left transition ${active ? "border-l-primary bg-primary/5" : "border-l-transparent hover:bg-muted/60"}`}
                >
                  <div className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>{e.subjectName}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{e.classLabel}</div>
                </button>
              );
            })}
            {myClassEntries.length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">No classes available.</p>}
          </div>

          <div className="mt-3 border-t pt-3 grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Term</Label>
              <Select value={termId} onValueChange={setTermId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Term" /></SelectTrigger>
                <SelectContent>{(terms ?? []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Subject</Label>
                <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); if (classId && armId) load(classId, armId, v); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{visibleSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Score grid */}
        <div className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {entered} entered</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> {remaining} remaining</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Upload className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Printer className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Student</th>
                    <th className="px-3 py-3 text-center font-medium w-20">CA 1 (10)</th>
                    <th className="px-3 py-3 text-center font-medium w-20">CA 2 (10)</th>
                    <th className="px-3 py-3 text-center font-medium w-20">CA 3 (10)</th>
                    <th className="px-3 py-3 text-center font-medium w-20">Exam (70)</th>
                    <th className="px-4 py-3 text-center font-medium w-24 bg-muted">Total (100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.student_id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-xs font-semibold text-primary">
                            {r.full_name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold uppercase tracking-wide text-primary">{r.full_name}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{r.admission_no}</div>
                          </div>
                        </div>
                      </td>
                      {(["ca1","ca2","ca3","exam"] as const).map((f) => (
                        <td key={f} className="px-2 py-2 text-center">
                          <Input
                            type="number"
                            min={0}
                            max={f === "exam" ? 70 : 10}
                            value={r[f] || ""}
                            placeholder="-"
                            onChange={(e) => updateRow(r.student_id, f, Number(e.target.value))}
                            className="h-9 w-16 mx-auto text-center"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-display text-lg font-bold text-primary bg-muted/40">{r.total || 0}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                      {ready ? "No students in this class." : "Pick a class from the left rail to start."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat icon={BarChart3} label="Class Average" value={avg.toString()} />
            <SummaryStat icon={TrendingUp} label="Highest Score" value={highest.toString()} tone="text-emerald-600" />
            <SummaryStat icon={AlertTriangle} label="Underperforming" value={under.toString()} tone="text-amber-600" />
            <SummaryStat icon={Clock} label="Last Updated" value={rows.length ? "now" : "—"} />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={!rows.length || saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save Scores
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, tone = "text-primary" }: { icon: typeof Save; label: string; value: string; tone?: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-muted"><Icon className={`h-5 w-5 ${tone}`} /></div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`font-display text-xl font-bold ${tone}`}>{value}</div>
      </div>
    </Card>
  );
}
