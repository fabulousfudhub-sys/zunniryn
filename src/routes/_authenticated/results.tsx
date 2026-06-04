import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getReferenceData } from "@/lib/reference.functions";
import { listResultSheets, setSheetStatus } from "@/lib/results.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const refQO = queryOptions({ queryKey: ["reference"], queryFn: () => getReferenceData() });

export const Route = createFileRoute("/_authenticated/results")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(refQO),
  component: ResultsPage,
});

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/15 text-blue-600",
  approved: "bg-green-500/15 text-green-700",
  published: "bg-primary/15 text-primary",
  locked: "bg-amber-500/15 text-amber-700",
};

function ResultsPage() {
  const { data: ref } = useSuspenseQuery(refQO);
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [armId, setArmId] = useState("");
  const [termId, setTermId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchList = useServerFn(listResultSheets);
  const setStatus = useServerFn(setSheetStatus);

  const { data: terms } = useQuery({
    queryKey: ["terms", ref.currentSession?.id],
    queryFn: async () => {
      if (!ref.currentSession) return [];
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("terms").select("id,name").eq("session_id", ref.currentSession.id);
      return data ?? [];
    },
    enabled: !!ref.currentSession,
  });

  const ready = classId && armId && termId;
  const { data: sheetsData, refetch } = useQuery({
    queryKey: ["result_sheets", classId, armId, termId],
    queryFn: () => fetchList({ data: { classId, armId, termId } }),
    enabled: !!ready,
  });

  const sheets = sheetsData?.sheets ?? [];
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const apply = useMutation({
    mutationFn: (status: "approved"|"published"|"locked"|"draft") =>
      setStatus({ data: { sheetIds: Array.from(selected), status } }),
    onSuccess: () => { toast.success("Status updated"); setSelected(new Set()); refetch(); qc.invalidateQueries({ queryKey: ["result_sheets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Results Review</h1>
        <p className="text-sm text-muted-foreground">Review computed results, approve and publish.</p>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{ref.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Arm</Label>
            <Select value={armId} onValueChange={setArmId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{ref.arms.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Term</Label>
            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{(terms ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {ready && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!selected.size || apply.isPending} onClick={() => apply.mutate("approved")}>Approve</Button>
            <Button size="sm" disabled={!selected.size || apply.isPending} onClick={() => apply.mutate("published")}>Publish</Button>
            <Button size="sm" variant="outline" disabled={!selected.size || apply.isPending} onClick={() => apply.mutate("locked")}>Lock</Button>
            <Button size="sm" variant="ghost" disabled={!selected.size || apply.isPending} onClick={() => apply.mutate("draft")}>Reset</Button>
            <span className="ml-auto self-center text-sm text-muted-foreground">{selected.size} selected</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Adm No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Obtainable</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No results yet. Enter scores first.</TableCell></TableRow>
                )}
                {sheets.map((s) => {
                  const student = Array.isArray(s.students) ? s.students[0] : s.students;
                  return (
                    <TableRow key={s.id}>
                      <TableCell><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} /></TableCell>
                      <TableCell className="font-semibold">{s.rank}</TableCell>
                      <TableCell className="font-mono text-xs">{student?.admission_no}</TableCell>
                      <TableCell>{student?.full_name}</TableCell>
                      <TableCell>{s.total_score}</TableCell>
                      <TableCell className="text-muted-foreground">{s.total_obtainable}</TableCell>
                      <TableCell>{Number(s.average ?? 0).toFixed(1)}%</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[s.status] ?? ""}>{s.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
