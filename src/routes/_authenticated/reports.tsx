import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getReferenceData } from "@/lib/reference.functions";
import { getReportCard, getBroadsheet, getTranscript } from "@/lib/reports.functions";
import { ReportCardView } from "@/components/report-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="container mx-auto max-w-7xl p-6">
      <h1 className="font-display text-3xl font-bold text-primary">Reports</h1>
      <p className="text-sm text-muted-foreground">Generate printable report cards, broadsheets and transcripts.</p>
      <Tabs defaultValue="report" className="mt-6">
        <TabsList>
          <TabsTrigger value="report">Report Card</TabsTrigger>
          <TabsTrigger value="broadsheet">Broadsheet</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>
        <TabsContent value="report"><ReportTab /></TabsContent>
        <TabsContent value="broadsheet"><BroadsheetTab /></TabsContent>
        <TabsContent value="transcript"><TranscriptTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useRef_() {
  const fn = useServerFn(getReferenceData);
  return useQuery({ queryKey: ["ref"], queryFn: () => fn() });
}
function useTerms(sessionId?: string) {
  return useQuery({
    queryKey: ["terms", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data } = await supabase.from("terms").select("id,name,is_current").eq("session_id", sessionId!).order("start_date");
      return data ?? [];
    },
  });
}
function useStudents(classId?: string, armId?: string) {
  return useQuery({
    queryKey: ["students-cls", classId, armId],
    enabled: !!classId && !!armId,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id,full_name,admission_no")
        .eq("current_class_id", classId!).eq("current_arm_id", armId!).eq("is_active", true).order("full_name");
      return data ?? [];
    },
  });
}

function ReportTab() {
  const ref = useRef_();
  const [sessionId, setSession] = useState<string>();
  const [classId, setClass] = useState<string>();
  const [armId, setArm] = useState<string>();
  const [termId, setTerm] = useState<string>();
  const [studentId, setStudent] = useState<string>();
  const [search, setSearch] = useState("");
  const terms = useTerms(sessionId);
  const students = useStudents(classId, armId);
  const getReport = useServerFn(getReportCard);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // auto-pick current session
  useMemo(() => {
    if (!sessionId && ref.data?.currentSession) setSession(ref.data.currentSession.id);
  }, [ref.data, sessionId]);

  const filtered = useMemo(() => (students.data ?? []).filter((s) =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.admission_no.toLowerCase().includes(search.toLowerCase())
  ), [students.data, search]);

  const generate = async () => {
    if (!studentId || !termId) return toast.error("Pick a student and a term.");
    setLoading(true);
    try { setReport(await getReport({ data: { studentId, termId } })); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Pick student & term</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <SelectField label="Session" value={sessionId} onChange={setSession} options={(ref.data?.sessions ?? []).map((s) => ({ value: s.id, label: s.name }))} />
          <SelectField label="Term" value={termId} onChange={setTerm} options={(terms.data ?? []).map((t) => ({ value: t.id, label: t.name.replace(/_/g, " ") }))} />
          <SelectField label="Class" value={classId} onChange={(v) => { setClass(v); setStudent(undefined); }} options={(ref.data?.classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <SelectField label="Arm" value={armId} onChange={(v) => { setArm(v); setStudent(undefined); }} options={(ref.data?.arms ?? []).map((a) => ({ value: a.id, label: a.name }))} />
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Search</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or admission no." />
          </div>
        </CardContent>
      </Card>

      {classId && armId && (
        <Card>
          <CardContent className="p-3">
            <div className="max-h-64 overflow-y-auto divide-y">
              {filtered.map((s) => (
                <button key={s.id} onClick={() => setStudent(s.id)}
                  className={`w-full text-left px-3 py-2 text-sm flex justify-between hover:bg-muted ${studentId === s.id ? "bg-primary/10 font-semibold" : ""}`}>
                  <span>{s.full_name}</span>
                  <span className="text-muted-foreground">{s.admission_no}</span>
                </button>
              ))}
              {filtered.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No students.</div>}
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={generate} disabled={loading} className="bg-primary text-primary-foreground">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate Report Card
      </Button>

      {report && (
        <div className="rounded-lg border bg-white shadow-elegant">
          <ReportCardView data={report} />
        </div>
      )}
    </div>
  );
}

function BroadsheetTab() {
  const ref = useRef_();
  const [sessionId, setSession] = useState<string>();
  const [classId, setClass] = useState<string>();
  const [armId, setArm] = useState<string>();
  const [termId, setTerm] = useState<string>();
  const terms = useTerms(sessionId);
  const getBs = useServerFn(getBroadsheet);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  useMemo(() => { if (!sessionId && ref.data?.currentSession) setSession(ref.data.currentSession.id); }, [ref.data, sessionId]);

  const generate = async () => {
    if (!classId || !armId || !termId) return toast.error("Pick class, arm, term.");
    setLoading(true);
    try { setData(await getBs({ data: { classId, armId, termId } })); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Class Broadsheet</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <SelectField label="Session" value={sessionId} onChange={setSession} options={(ref.data?.sessions ?? []).map((s) => ({ value: s.id, label: s.name }))} />
          <SelectField label="Term" value={termId} onChange={setTerm} options={(terms.data ?? []).map((t) => ({ value: t.id, label: t.name.replace(/_/g, " ") }))} />
          <SelectField label="Class" value={classId} onChange={setClass} options={(ref.data?.classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <SelectField label="Arm" value={armId} onChange={setArm} options={(ref.data?.arms ?? []).map((a) => ({ value: a.id, label: a.name }))} />
        </CardContent>
      </Card>
      <Button onClick={generate} disabled={loading} className="bg-primary text-primary-foreground">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate Broadsheet
      </Button>

      {data && (
        <div className="rounded-lg border bg-white p-6 shadow-elegant print:border-0 print:shadow-none">
          <div className="mb-4 flex justify-end print:hidden">
            <Button onClick={() => window.print()} variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
          </div>
          <header className="border-b-4 border-double border-primary pb-3 text-center">
            <h2 className="font-display text-2xl font-bold text-primary">{data.school.name} — Class Broadsheet</h2>
            <p className="text-sm text-muted-foreground">
              {data.class?.name} {data.arm?.name} · {data.term?.name?.replace(/_/g, " ")} · {data.term?.academic_sessions?.name}
            </p>
          </header>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border p-2 text-left">#</th>
                  <th className="border p-2 text-left">Student</th>
                  {data.subjects.map((s: any) => (
                    <th key={s.id} className="border p-2" title={s.name}>{s.code ?? s.name?.slice(0, 4)}</th>
                  ))}
                  <th className="border p-2">Total</th>
                  <th className="border p-2">Avg</th>
                  <th className="border p-2">Pos</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any, i: number) => (
                  <tr key={r.student.id} className="odd:bg-muted/30">
                    <td className="border p-2">{i + 1}</td>
                    <td className="border p-2 whitespace-nowrap">{r.student.full_name}</td>
                    {r.cells.map((c: any, j: number) => (
                      <td key={j} className="border p-2 text-center">{c ? Number(c.total).toFixed(0) : "—"}</td>
                    ))}
                    <td className="border p-2 text-center font-semibold">{r.total.toFixed(1)}</td>
                    <td className="border p-2 text-center">{r.average.toFixed(1)}</td>
                    <td className="border p-2 text-center font-bold text-primary">{r.position}</td>
                  </tr>
                ))}
                {data.rows.length === 0 && <tr><td colSpan={4 + data.subjects.length} className="border p-4 text-center text-muted-foreground">No students.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TranscriptTab() {
  const ref = useRef_();
  const [classId, setClass] = useState<string>();
  const [armId, setArm] = useState<string>();
  const students = useStudents(classId, armId);
  const [studentId, setStudent] = useState<string>();
  const getTr = useServerFn(getTranscript);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!studentId) return toast.error("Pick a student.");
    setLoading(true);
    try { setData(await getTr({ data: { studentId } })); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Cumulative Transcript</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <SelectField label="Class" value={classId} onChange={setClass} options={(ref.data?.classes ?? []).map((c) => ({ value: c.id, label: c.name }))} />
          <SelectField label="Arm" value={armId} onChange={setArm} options={(ref.data?.arms ?? []).map((a) => ({ value: a.id, label: a.name }))} />
          <SelectField label="Student" value={studentId} onChange={setStudent} options={(students.data ?? []).map((s) => ({ value: s.id, label: `${s.full_name} (${s.admission_no})` }))} />
        </CardContent>
      </Card>
      <Button onClick={generate} disabled={loading} className="bg-primary text-primary-foreground">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate Transcript
      </Button>

      {data && (
        <div className="rounded-lg border bg-white p-8 shadow-elegant print:border-0 print:shadow-none">
          <div className="mb-4 flex justify-end print:hidden">
            <Button onClick={() => window.print()} variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
          </div>
          <header className="border-b-4 border-double border-primary pb-3 text-center">
            <h2 className="font-display text-2xl font-bold text-primary">{data.school.name} — Academic Transcript</h2>
            <p className="text-sm text-muted-foreground">{data.school.location}</p>
          </header>
          <section className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div><b>Name:</b> {data.student.full_name}</div>
            <div><b>Admission No.:</b> {data.student.admission_no}</div>
            <div><b>Admitted:</b> {data.student.admission_date}</div>
          </section>
          <table className="mt-6 w-full border-collapse text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="border p-2 text-left">Session</th>
                <th className="border p-2 text-left">Term</th>
                <th className="border p-2 text-left">Class</th>
                <th className="border p-2">Total</th>
                <th className="border p-2">Average</th>
                <th className="border p-2">Position</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.sheets.map((s: any, i: number) => (
                <tr key={i} className="odd:bg-muted/30">
                  <td className="border p-2">{s.academic_sessions?.name}</td>
                  <td className="border p-2">{s.terms?.name?.replace(/_/g, " ")}</td>
                  <td className="border p-2">{s.classes?.name} {s.arms?.name}</td>
                  <td className="border p-2 text-center">{Number(s.total_score).toFixed(1)}</td>
                  <td className="border p-2 text-center font-semibold">{Number(s.average).toFixed(2)}%</td>
                  <td className="border p-2 text-center">{s.position ?? "—"}</td>
                  <td className="border p-2 text-center uppercase text-xs">{s.status}</td>
                </tr>
              ))}
              {data.sheets.length === 0 && <tr><td colSpan={7} className="border p-4 text-center text-muted-foreground">No published terms yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value?: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
