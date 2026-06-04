import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getReferenceData } from "@/lib/reference.functions";
import { getAttendanceGrid, saveAttendance } from "@/lib/attendance.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/attendance")({ component: AttendancePage });

type Status = "present" | "absent" | "late" | "excused";
const STATUS_COLORS: Record<Status, string> = {
  present: "bg-emerald-100 text-emerald-800 border-emerald-300",
  absent: "bg-red-100 text-red-800 border-red-300",
  late: "bg-amber-100 text-amber-800 border-amber-300",
  excused: "bg-blue-100 text-blue-800 border-blue-300",
};

function AttendancePage() {
  const refFn = useServerFn(getReferenceData);
  const ref = useQuery({ queryKey: ["ref"], queryFn: () => refFn() });
  const [sessionId, setSession] = useState<string>();
  const [classId, setClass] = useState<string>();
  const [armId, setArm] = useState<string>();
  const [termId, setTerm] = useState<string>();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!sessionId && ref.data?.currentSession) setSession(ref.data.currentSession.id); }, [ref.data, sessionId]);
  const termsQ = useQuery({
    queryKey: ["terms", sessionId], enabled: !!sessionId,
    queryFn: async () => {
      const { data } = await supabase.from("terms").select("id,name,is_current").eq("session_id", sessionId!).order("start_date");
      return data ?? [];
    },
  });
  useEffect(() => { if (!termId && termsQ.data) { const cur = termsQ.data.find((t: any) => t.is_current); if (cur) setTerm(cur.id); } }, [termsQ.data, termId]);

  const getGrid = useServerFn(getAttendanceGrid);
  const save = useServerFn(saveAttendance);

  const load = async () => {
    if (!classId || !armId || !termId || !date) return toast.error("Pick class, arm, term and date.");
    setLoading(true);
    try { const r = await getGrid({ data: { classId, armId, termId, date } }); setRows(r.rows); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const submit = async () => {
    if (!classId || !armId || !termId) return;
    setSaving(true);
    try {
      await save({ data: { classId, armId, termId, date, entries: rows.map((r) => ({ studentId: r.id, status: r.status, note: r.note })) } });
      toast.success("Attendance saved.");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const setAll = (s: Status) => setRows((rs) => rs.map((r) => ({ ...r, status: s })));
  const summary = useMemo(() => rows.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {} as any), [rows]);

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <h1 className="font-display text-3xl font-bold text-primary">Attendance</h1>
      <p className="text-sm text-muted-foreground">Mark daily attendance per class arm.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Choose class & date</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Field label="Session"><Select value={sessionId} onValueChange={setSession}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{(ref.data?.sessions ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Term"><Select value={termId} onValueChange={setTerm}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{(termsQ.data ?? []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Class"><Select value={classId} onValueChange={setClass}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{(ref.data?.classes ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Arm"><Select value={armId} onValueChange={setArm}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{(ref.data?.arms ?? []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={load} disabled={loading} className="bg-primary text-primary-foreground">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Load Register
        </Button>
        {rows.length > 0 && (
          <>
            <Button variant="outline" onClick={() => setAll("present")}>Mark all Present</Button>
            <Button variant="outline" onClick={() => setAll("absent")}>Mark all Absent</Button>
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              {(["present","absent","late","excused"] as Status[]).map((s) => (
                <span key={s} className={`rounded border px-2 py-0.5 ${STATUS_COLORS[s]}`}>{s}: {summary[s] ?? 0}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card border-b">
                  <tr>
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Student</th>
                    <th className="p-3 text-left">Adm. No.</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-medium">{r.full_name}</td>
                      <td className="p-3 text-muted-foreground">{r.admission_no}</td>
                      <td className="p-3">
                        <Select value={r.status} onValueChange={(v) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, status: v } : x))}>
                          <SelectTrigger className={`w-32 ${STATUS_COLORS[r.status as Status]}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(["present","absent","late","excused"] as Status[]).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Input value={r.note} onChange={(e) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} placeholder="optional" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t p-4 text-right">
              <Button onClick={submit} disabled={saving} className="bg-gradient-gold text-gold-foreground">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>{children}</div>;
}
