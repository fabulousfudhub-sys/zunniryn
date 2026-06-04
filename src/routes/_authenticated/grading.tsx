import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listGradeScale, saveGradeScale } from "@/lib/grading.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Save, History, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/grading")({
  ssr: false,
  component: GradingPage,
});

type Tab = "general" | "nursery" | "primary" | "secondary";
type Row = { grade: string; min_score: number; max_score: number; remark: string };

const DEFAULT_WEIGHTS = { ca1: 10, ca2: 10, ca3: 20, exam: 60 };

function GradingPage() {
  const list = useServerFn(listGradeScale);
  const save = useServerFn(saveGradeScale);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["grade-scale"], queryFn: () => list() });
  const [tab, setTab] = useState<Tab>("general");
  const [rows, setRows] = useState<Row[]>([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  useEffect(() => {
    if (q.data) setRows(q.data.map((r) => ({ grade: r.grade, min_score: r.min_score, max_score: r.max_score, remark: r.remark })));
  }, [q.data]);

  const total = weights.ca1 + weights.ca2 + weights.ca3 + weights.exam;

  const saveMut = useMutation({
    mutationFn: () => save({ data: { rows: rows.map((r) => ({ ...r, min_score: Number(r.min_score), max_score: Number(r.max_score) })) } }),
    onSuccess: () => { toast.success("Grading configuration saved."); qc.invalidateQueries({ queryKey: ["grade-scale"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addRow = () => setRows((r) => [...r, { grade: "", min_score: 0, max_score: 0, remark: "" }]);
  const delRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, k: keyof Row, v: string | number) => setRows((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  // Live preview
  const preview = useMemo(() => {
    const students = [
      { name: "Musa Ibrahim", ca: 38, exam: 52 },
      { name: "Zainab Aliyu", ca: 32, exam: 45 },
      { name: "John Okoro", ca: 24, exam: 38 },
      { name: "Fatima Bauchi", ca: 15, exam: 25 },
    ];
    return students.map((s) => {
      const tot = s.ca + s.exam;
      const g = rows.find((r) => tot >= r.min_score && tot <= r.max_score);
      return { ...s, total: tot, grade: g?.grade ?? "—", remark: g?.remark ?? "—" };
    });
  }, [rows]);

  const classAvg = preview.length ? Math.round(preview.reduce((s, r) => s + r.total, 0) / preview.length * 10) / 10 : 0;
  const distro = rows.map((r) => ({
    grade: r.grade,
    pct: Math.round(preview.filter((p) => p.grade === r.grade).length / Math.max(1, preview.length) * 100),
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Grading System Configuration</h1>
          <p className="text-sm text-muted-foreground">Define academic standards and assessment weights.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><History className="mr-2 h-4 w-4" /> History</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="mr-2 h-4 w-4" /> Save Configuration</Button>
        </div>
      </header>

      <div className="mb-5 border-b">
        <div className="flex flex-wrap gap-1">
          {(["general", "nursery", "primary", "secondary"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "general" ? "General Scale" : `${t} Section`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Grading scale */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-primary">Global Grading Scale</h2>
            <Button variant="ghost" size="sm" onClick={addRow}><Plus className="mr-1 h-4 w-4" /> Add Row</Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium w-16">Grade</th>
                  <th className="py-2 text-left font-medium">Score Range (%)</th>
                  <th className="py-2 text-left font-medium">Remarks</th>
                  <th className="py-2 text-right font-medium w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3"><Input value={r.grade} onChange={(e) => updateRow(i, "grade", e.target.value)} className="h-9 w-14 text-center font-bold text-primary" /></td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <Input type="number" value={r.min_score} onChange={(e) => updateRow(i, "min_score", Number(e.target.value))} className="h-9 w-20 text-center" />
                        <span className="text-muted-foreground">—</span>
                        <Input type="number" value={r.max_score} onChange={(e) => updateRow(i, "max_score", Number(e.target.value))} className="h-9 w-20 text-center" />
                      </div>
                    </td>
                    <td className="py-2 pr-3"><Input value={r.remark} onChange={(e) => updateRow(i, "remark", e.target.value)} className="h-9" /></td>
                    <td className="py-2 text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => delRow(i)}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">No rows. Add one to begin.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Assessment Weightage */}
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold text-primary">Assessment Weightage</h2>
          <div className="mt-4 space-y-5">
            {(["ca1", "ca2", "ca3", "exam"] as const).map((k) => {
              const labels = { ca1: "Continuous Assessment 1", ca2: "Continuous Assessment 2", ca3: "Continuous Assessment 3", exam: "Final Examination" } as const;
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium uppercase tracking-wider text-muted-foreground">{labels[k]}</span>
                    <span className="text-sm font-semibold text-primary">{weights[k]}%</span>
                  </div>
                  <Slider value={[weights[k]]} max={100} step={5} onValueChange={(v) => setWeights({ ...weights, [k]: v[0] })} className="mt-2" />
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
            <span className="text-sm">Total Allocation</span>
            <span className={`font-display text-xl font-bold ${total === 100 ? "text-primary" : "text-destructive"}`}>{total}%</span>
          </div>
        </Card>
      </div>

      {/* Live preview */}
      <Card className="mt-6 p-5">
        <h2 className="font-display text-lg font-semibold text-primary">Live Grade Preview</h2>
        <p className="text-xs text-muted-foreground">See how the current configuration affects student results.</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Student</th>
                  <th className="px-3 py-2 text-center font-medium">CA (40)</th>
                  <th className="px-3 py-2 text-center font-medium">Exam (60)</th>
                  <th className="px-3 py-2 text-center font-medium">Total (100)</th>
                  <th className="px-3 py-2 text-center font-medium">Grade</th>
                  <th className="px-3 py-2 text-left font-medium">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((p) => {
                  const failing = p.total < 40;
                  return (
                    <tr key={p.name}>
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-center">{p.ca}</td>
                      <td className="px-3 py-2 text-center">{p.exam}</td>
                      <td className={`px-3 py-2 text-center font-bold ${failing ? "text-destructive" : ""}`}>{p.total}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-grid h-6 w-7 place-items-center rounded-full text-xs font-bold ${failing ? "bg-destructive/15 text-destructive" : "bg-emerald-100 text-emerald-700"}`}>{p.grade}</span>
                      </td>
                      <td className={`px-3 py-2 ${failing ? "text-destructive" : "text-muted-foreground"}`}>{p.remark}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-4">
            <Card className="bg-muted/40 p-5 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Class Average</div>
              <div className="mt-1 font-display text-4xl font-bold text-primary">{classAvg}%</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Current Schema Impact</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Grade Distribution</div>
              <div className="mt-2 flex h-2 w-full overflow-hidden rounded">
                {distro.map((d, i) => (
                  <div key={d.grade + i} style={{ width: `${d.pct}%` }} className={i % 4 === 0 ? "bg-primary" : i % 4 === 1 ? "bg-primary/70" : i % 4 === 2 ? "bg-gold" : "bg-destructive"} />
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {distro.map((d) => <div key={d.grade}>● {d.grade}: {d.pct}%</div>)}
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
