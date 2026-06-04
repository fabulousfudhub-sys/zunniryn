import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listAssignments, listTeachers, bulkCreateAssignments, deleteAssignment, type AssignmentRow } from "@/lib/assignments.functions";
import { getReferenceData, subjectIsAvailableFor, type SubjectRef } from "@/lib/reference.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination, useClientPage } from "@/components/data-pagination";
import { Plus, Trash2, Search, Users } from "lucide-react";

const assignmentsQO = queryOptions({ queryKey: ["assignments"], queryFn: () => listAssignments() });
const teachersQO = queryOptions({ queryKey: ["teachers"], queryFn: () => listTeachers() });
const refQO = queryOptions({ queryKey: ["reference"], queryFn: () => getReferenceData() });

export const Route = createFileRoute("/_authenticated/assignments")({
  ssr: false,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(assignmentsQO),
      context.queryClient.ensureQueryData(refQO),
      context.queryClient.ensureQueryData(teachersQO),
    ]),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { data: rows } = useSuspenseQuery(assignmentsQO);
  const qc = useQueryClient();
  const remove = useServerFn(deleteAssignment);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const delMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { toast.success("Assignment removed"); qc.invalidateQueries({ queryKey: ["assignments"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not remove"),
  });

  const teachers = useMemo(
    () => Array.from(new Map(rows.map((r) => [r.staff_id, r.staff_name])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [rows],
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (teacherFilter !== "ALL" && r.staff_id !== teacherFilter) return false;
      if (!t) return true;
      return r.staff_name.toLowerCase().includes(t) ||
        r.subject_name.toLowerCase().includes(t) ||
        r.class_name.toLowerCase().includes(t) ||
        r.arm_name.toLowerCase().includes(t);
    });
  }, [rows, q, teacherFilter]);

  const { pageRows, total, totalPages, safePage } = useClientPage(filtered, page, pageSize);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Teacher Assignments</h1>
          <p className="text-sm text-muted-foreground">Compact list — search, filter, paginate. Use Mass assign to add many at once.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Mass assign</Button>
          </DialogTrigger>
          <MassAssignDialog onSuccess={() => setOpen(false)} />
        </Dialog>
      </header>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search teacher, subject, class…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={teacherFilter} onValueChange={(v) => { setTeacherFilter(v); setPage(1); }}>
            <SelectTrigger className="w-56"><SelectValue placeholder="All teachers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All teachers</SelectItem>
              {teachers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="ml-auto">{filtered.length} assignment{filtered.length !== 1 ? "s" : ""}</Badge>
        </div>

        {pageRows.length === 0 ? (
          <div className="rounded-md border p-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
            No assignments match. Use “Mass assign” to add some.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Arm</TableHead>
                  <TableHead className="w-12 text-right">—</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r: AssignmentRow) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.staff_name}</TableCell>
                    <TableCell>{r.subject_name}</TableCell>
                    <TableCell>{r.class_name}</TableCell>
                    <TableCell>{r.arm_name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remove ${r.subject_name} · ${r.class_name} ${r.arm_name} from ${r.staff_name}?`)) delMutation.mutate(r.id); }} disabled={delMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DataPagination page={safePage} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} totalPages={totalPages} />
      </Card>
    </div>
  );
}

function MassAssignDialog({ onSuccess }: { onSuccess: () => void }) {
  const { data: ref } = useQuery(refQO);
  const { data: teachers } = useQuery(teachersQO);
  const qc = useQueryClient();
  const bulk = useServerFn(bulkCreateAssignments);
  const [staffId, setStaffId] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [arms, setArms] = useState<string[]>([]);

  const sessionId = ref?.currentSession?.id ?? "";
  const classObjs = useMemo(() => (ref?.classes ?? []).filter((c) => classes.includes(c.id)), [ref?.classes, classes]);

  // Subjects available given selected classes/arms (intersection of availability)
  const availableSubjects: SubjectRef[] = useMemo(() => {
    if (!ref) return [];
    return ref.subjects.filter((s) => {
      // If a class set is chosen, subject must be available for at least one selected class
      if (classObjs.length) {
        const okForClass = classObjs.some((c) => subjectIsAvailableFor(s, c, null));
        if (!okForClass) return false;
      }
      // If arms chosen and subject is arm-restricted, must overlap
      if (arms.length && s.restricted_arm_ids.length) {
        const overlap = arms.some((id) => s.restricted_arm_ids.includes(id));
        if (!overlap) return false;
      }
      return true;
    });
  }, [ref, classObjs, arms]);

  // Drop selected subjects no longer valid
  const validSelectedSubjects = subjects.filter((id) => availableSubjects.some((s) => s.id === id));
  if (validSelectedSubjects.length !== subjects.length) {
    setTimeout(() => setSubjects(validSelectedSubjects), 0);
  }

  const mutation = useMutation({
    mutationFn: () => bulk({ data: {
      staff_id: staffId, session_id: sessionId,
      subject_ids: subjects, class_ids: classes, arm_ids: arms,
    } }),
    onSuccess: (res: any) => {
      toast.success(`Created ${res.created} assignment(s)${res.skipped ? `, ${res.skipped} already existed` : ""}.`);
      qc.invalidateQueries({ queryKey: ["assignments"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not assign"),
  });

  const total = subjects.length * classes.length * arms.length;
  const canSubmit = staffId && sessionId && subjects.length && classes.length && arms.length;

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Mass-assign teacher</DialogTitle>
        <DialogDescription>
          Uses current session: <strong>{ref?.currentSession?.name ?? "— none set —"}</strong>.
          Subjects are filtered by section, JSS/SSS level and arm restrictions on each subject.
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <Field label="Teacher" required>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger><SelectValue placeholder={teachers && teachers.length === 0 ? "No teachers — add staff with Teacher role" : "Select teacher"} /></SelectTrigger>
            <SelectContent>{teachers?.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MultiCheckList title="Classes" items={(ref?.classes ?? []).map((c) => ({ id: c.id, name: `${c.name}` }))}
            selected={classes}
            onToggle={(id) => toggle(classes, setClasses, id)}
            onSelectAll={() => setClasses(ref?.classes.map((c) => c.id) ?? [])}
            onClear={() => setClasses([])} />
          <MultiCheckList title="Arms" items={ref?.arms ?? []} selected={arms}
            onToggle={(id) => toggle(arms, setArms, id)}
            onSelectAll={() => setArms(ref?.arms.map((a) => a.id) ?? [])}
            onClear={() => setArms([])} />
        </div>

        <MultiCheckList
          title={`Subjects ${classObjs.length || arms.length ? "(filtered by class/arm)" : ""}`}
          items={availableSubjects}
          selected={subjects}
          onToggle={(id) => toggle(subjects, setSubjects, id)}
          onSelectAll={() => setSubjects(availableSubjects.map((s) => s.id))}
          onClear={() => setSubjects([])}
        />

        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          Will create up to <span className="font-semibold">{total}</span> assignment{total !== 1 ? "s" : ""} ({subjects.length} subj × {classes.length} class × {arms.length} arm). Duplicates are skipped.
        </div>

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending ? "Assigning…" : `Create ${total || ""} assignment${total !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function MultiCheckList({ title, items, selected, onToggle, onSelectAll, onClear }: {
  title: string; items: { id: string; name: string }[]; selected: string[];
  onToggle: (id: string) => void; onSelectAll: () => void; onClear: () => void;
}) {
  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="text-sm font-semibold">{title} <span className="text-muted-foreground font-normal">({selected.length}/{items.length})</span></div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onSelectAll} disabled={items.length === 0}>All</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={selected.length === 0}>Clear</Button>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-2 grid grid-cols-2 gap-1">
        {items.map((it) => {
          const checked = selected.includes(it.id);
          return (
            <label key={it.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer">
              <Checkbox checked={checked} onCheckedChange={() => onToggle(it.id)} />
              <span className="truncate">{it.name}</span>
            </label>
          );
        })}
        {items.length === 0 && <div className="col-span-2 p-2 text-xs text-muted-foreground">None available</div>}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
