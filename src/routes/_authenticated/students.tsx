import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listStudents, createStudent, updateStudent, bulkUpdateStudents, type StudentRow, type StudentStatus } from "@/lib/students.functions";
import { getReferenceData } from "@/lib/reference.functions";
import { getStates, getLGAs } from "@/lib/nigeria-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataPagination, useClientPage } from "@/components/data-pagination";
import { Plus, Search, Pencil, Layers } from "lucide-react";

const studentsQO = queryOptions({ queryKey: ["students"], queryFn: () => listStudents() });
const refQO = queryOptions({ queryKey: ["reference"], queryFn: () => getReferenceData() });

export const Route = createFileRoute("/_authenticated/students")({
  ssr: false,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(studentsQO),
      context.queryClient.ensureQueryData(refQO),
    ]),
  component: StudentsPage,
});

const STATUS_VARIANTS: Record<StudentStatus, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400",
  graduated: "bg-primary/15 text-primary",
  withdrawn: "bg-muted text-muted-foreground",
  suspended: "bg-amber-500/15 text-amber-700",
  transferred: "bg-blue-500/15 text-blue-700",
  alumni: "bg-purple-500/15 text-purple-700",
};

function StudentsPage() {
  const { data: students } = useSuspenseQuery(studentsQO);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StudentStatus>("all");
  const [section, setSection] = useState<"ALL" | "NUR" | "PRI" | "SEC">("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [armFilter, setArmFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  // Build section → classes → arms tree from the loaded students
  const classesInSection = useMemo(() => {
    const m = new Map<string, string[]>(); // section -> classes
    for (const s of students) {
      if (!s.class_name || !s.section) continue;
      const arr = m.get(s.section) ?? [];
      if (!arr.includes(s.class_name)) arr.push(s.class_name);
      m.set(s.section, arr);
    }
    return m;
  }, [students]);

  const armsInClass = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of students) {
      if (!s.class_name || !s.arm_name) continue;
      const arr = m.get(s.class_name) ?? [];
      if (!arr.includes(s.arm_name)) arr.push(s.arm_name);
      m.set(s.class_name, arr);
    }
    return m;
  }, [students]);

  const filtered = useMemo(() => students.filter((s) => {
    const matchQ = !q.trim() ||
      s.full_name.toLowerCase().includes(q.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(q.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchSection = section === "ALL" || s.section === section;
    const matchClass = classFilter === "ALL" || s.class_name === classFilter;
    const matchArm = armFilter === "ALL" || s.arm_name === armFilter;
    return matchQ && matchStatus && matchSection && matchClass && matchArm;
  }), [students, q, statusFilter, section, classFilter, armFilter]);

  const { pageRows, total, totalPages, safePage } = useClientPage(filtered, page, pageSize);

  const sectionTabs: { code: "ALL" | "NUR" | "PRI" | "SEC"; label: string }[] = [
    { code: "ALL", label: "All" },
    { code: "NUR", label: "Nursery" },
    { code: "PRI", label: "Primary" },
    { code: "SEC", label: "Secondary" },
  ];
  const classOptions = section === "ALL"
    ? Array.from(new Set(students.map((s) => s.class_name).filter(Boolean) as string[]))
    : (classesInSection.get(section) ?? []);
  const armOptions = classFilter === "ALL"
    ? Array.from(new Set(students.map((s) => s.arm_name).filter(Boolean) as string[]))
    : (armsInClass.get(classFilter) ?? []);

  const pageIds = pageRows.map((s) => s.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const togglePageAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleOne = (id: string) => setSelected((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const selectAllFiltered = () => setSelected(new Set(filtered.map((s) => s.id)));
  const clearSelection = () => setSelected(new Set());

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">Browse by section → class → arm. Select rows to bulk update.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Register student</Button>
          </DialogTrigger>
          <RegisterStudentDialog onSuccess={() => setOpen(false)} />
        </Dialog>
      </header>

      <Tabs value={section} onValueChange={(v) => { setSection(v as any); setClassFilter("ALL"); setArmFilter("ALL"); setPage(1); }}>
        <TabsList className="flex-wrap h-auto">
          {sectionTabs.map((t) => (
            <TabsTrigger key={t.code} value={t.code}>
              {t.label}
              <Badge variant="secondary" className="ml-2">
                {t.code === "ALL" ? students.length : students.filter((s) => s.section === t.code).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name or admission no" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setArmFilter("ALL"); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All classes</SelectItem>
              {classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={armFilter} onValueChange={(v) => { setArmFilter(v); setPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Arm" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All arms</SelectItem>
              {armOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.keys(STATUS_VARIANTS).map((s) => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={selectAllFiltered}>Select all {filtered.length} filtered</Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
            <Button size="sm" className="ml-auto" onClick={() => setBulkOpen(true)}>
              <Layers className="mr-2 h-4 w-4" /> Bulk update…
            </Button>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allOnPageSelected} onCheckedChange={togglePageAll} aria-label="Select page" />
                </TableHead>
                <TableHead>Admission No</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Arm</TableHead>
                <TableHead className="hidden sm:table-cell">Gender</TableHead>
                <TableHead className="hidden md:table-cell">Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-10">No students match.</TableCell></TableRow>
              )}
              {pageRows.map((s) => (
                <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
                  <TableCell><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleOne(s.id)} aria-label="Select row" /></TableCell>
                  <TableCell className="font-mono text-xs">{s.admission_no}</TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell>{s.class_name ?? "—"}</TableCell>
                  <TableCell>{s.arm_name ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{s.gender ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm">{s.parent_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{s.parent_phone ?? ""}</div>
                  </TableCell>
                  <TableCell><Badge className={STATUS_VARIANTS[s.status]}>{s.status}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DataPagination page={safePage} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} totalPages={totalPages} />
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <EditStudentDialog student={editing} onClose={() => setEditing(null)} />}
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <BulkUpdateDialog
          students={students.filter((s) => selected.has(s.id))}
          onClose={() => setBulkOpen(false)}
          onDone={() => { setBulkOpen(false); clearSelection(); }}
        />
      </Dialog>
    </div>
  );
}

function BulkUpdateDialog({ students, onClose, onDone }: { students: StudentRow[]; onClose: () => void; onDone: () => void }) {
  const { data: ref } = useQuery(refQO);
  const qc = useQueryClient();
  const bulk = useServerFn(bulkUpdateStudents);
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [classId, setClassId] = useState("");
  const [armId, setArmId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const className = classId ? ref?.classes.find((c) => c.id === classId)?.name : null;
  const armName = armId ? ref?.arms.find((a) => a.id === armId)?.name : null;

  const changes: string[] = [];
  if (status) changes.push(`Status → ${status}`);
  if (className) changes.push(`Class → ${className}`);
  if (armName) changes.push(`Arm → ${armName}`);

  const mutation = useMutation({
    mutationFn: () => bulk({ data: {
      ids: students.map((s) => s.id),
      ...(status ? { status } : {}),
      ...(classId ? { current_class_id: classId } : {}),
      ...(armId ? { current_arm_id: armId } : {}),
    } }),
    onSuccess: (res: any) => {
      toast.success(`Updated ${res.updated} student(s).`);
      qc.invalidateQueries({ queryKey: ["students"] });
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Bulk update {students.length} student{students.length !== 1 ? "s" : ""}</DialogTitle>
        <DialogDescription>Only filled fields are applied. Empty fields leave the existing value unchanged.</DialogDescription>
      </DialogHeader>

      {!confirming ? (
        <div className="space-y-3">
          <Field label="Set status (optional)">
            <Select value={status} onValueChange={(v) => setStatus(v as StudentStatus)}>
              <SelectTrigger><SelectValue placeholder="Leave unchanged" /></SelectTrigger>
              <SelectContent>
                {Object.keys(STATUS_VARIANTS).map((s) => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Move to class (optional)">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue placeholder="Leave unchanged" /></SelectTrigger>
              <SelectContent>{ref?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Move to arm (optional)">
            <Select value={armId} onValueChange={setArmId}>
              <SelectTrigger><SelectValue placeholder="Leave unchanged" /></SelectTrigger>
              <SelectContent>{ref?.arms.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setConfirming(true)} disabled={changes.length === 0}>Preview changes →</Button>
          </DialogFooter>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="font-semibold mb-1">Changes to apply:</div>
            <ul className="list-disc pl-5 space-y-0.5">{changes.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          <div className="rounded-md border max-h-60 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adm No</TableHead><TableHead>Name</TableHead>
                  <TableHead>Current class/arm</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.admission_no}</TableCell>
                    <TableCell>{s.full_name}</TableCell>
                    <TableCell className="text-xs">{s.class_name ?? "—"} {s.arm_name ? `/ ${s.arm_name}` : ""}</TableCell>
                    <TableCell><Badge className={STATUS_VARIANTS[s.status]}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={mutation.isPending}>← Back</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Applying…" : `Apply to ${students.length} student${students.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  );
}


function EditStudentDialog({ student, onClose }: { student: StudentRow; onClose: () => void }) {
  const { data: ref } = useQuery(refQO);
  const qc = useQueryClient();
  const update = useServerFn(updateStudent);
  const [status, setStatus] = useState<StudentStatus>(student.status);
  const [classId, setClassId] = useState<string>("");
  const [armId, setArmId] = useState<string>("");

  const mutation = useMutation({
    mutationFn: () => update({ data: {
      id: student.id, status,
      ...(classId ? { current_class_id: classId } : {}),
      ...(armId ? { current_arm_id: armId } : {}),
    } }),
    onSuccess: () => {
      toast.success("Student updated.");
      qc.invalidateQueries({ queryKey: ["students"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Edit {student.full_name}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setStatus(v as StudentStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(STATUS_VARIANTS).map((s) => <SelectItem key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Move to class (optional)">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue placeholder={student.class_name ?? "Select class"} /></SelectTrigger>
            <SelectContent>
              {ref?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Move to arm (optional)">
          <Select value={armId} onValueChange={setArmId}>
            <SelectTrigger><SelectValue placeholder={student.arm_name ?? "Select arm"} /></SelectTrigger>
            <SelectContent>
              {ref?.arms.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}


function RegisterStudentDialog({ onSuccess }: { onSuccess: () => void }) {
  const { data: ref } = useQuery(refQO);
  const qc = useQueryClient();
  const create = useServerFn(createStudent);
  const [form, setForm] = useState({
    full_name: "", gender: "" as "" | "Male" | "Female",
    date_of_birth: "", state_of_origin: "", lga: "", address: "",
    parent_name: "", parent_phone: "", parent_email: "", parent_occupation: "",
    class_id: "", arm_id: "", session_id: "",
  });

  const states = useMemo(() => getStates(), []);
  const lgas = useMemo(() => getLGAs(form.state_of_origin), [form.state_of_origin]);

  if (ref?.currentSession && !form.session_id) {
    setTimeout(() => setForm((f) => ({ ...f, session_id: ref.currentSession!.id })), 0);
  }

  const mutation = useMutation({
    mutationFn: (input: typeof form) => create({
      data: {
        ...input,
        gender: input.gender || undefined,
        parent_email: input.parent_email || undefined,
      } as any,
    }),
    onSuccess: (row) => {
      toast.success(`Registered. Admission no: ${(row as any)?.admission_no ?? "assigned"}`);
      qc.invalidateQueries({ queryKey: ["students"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not register student"),
  });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Register New Student</DialogTitle></DialogHeader>
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}
      >
        <Field label="Full name" required>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={120} />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        </Field>

        <Field label="State of origin">
          <Select value={form.state_of_origin} onValueChange={(v) => setForm({ ...form, state_of_origin: v, lga: "" })}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="LGA">
          <Select value={form.lga} onValueChange={(v) => setForm({ ...form, lga: v })} disabled={!form.state_of_origin}>
            <SelectTrigger><SelectValue placeholder={form.state_of_origin ? "Select LGA" : "Pick state first"} /></SelectTrigger>
            <SelectContent className="max-h-72">
              {lgas.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Address" className="md:col-span-2">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={300} />
        </Field>

        <Field label="Class" required>
          <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {ref?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Arm" required>
          <Select value={form.arm_id} onValueChange={(v) => setForm({ ...form, arm_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select arm" /></SelectTrigger>
            <SelectContent>
              {ref?.arms.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Admission session" required className="md:col-span-2">
          <Select value={form.session_id} onValueChange={(v) => setForm({ ...form, session_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select session (can be a past session)" /></SelectTrigger>
            <SelectContent>
              {ref?.sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.is_current ? " (current)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <div className="md:col-span-2 mt-2 border-t pt-3">
          <h3 className="text-sm font-semibold mb-2">Parent / Guardian</h3>
        </div>
        <Field label="Parent name"><Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} maxLength={120} /></Field>
        <Field label="Parent phone"><Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} maxLength={30} /></Field>
        <Field label="Parent email"><Input type="email" value={form.parent_email} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} maxLength={255} /></Field>
        <Field label="Parent occupation"><Input value={form.parent_occupation} onChange={(e) => setForm({ ...form, parent_occupation: e.target.value })} maxLength={120} /></Field>

        <DialogFooter className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending || !form.full_name || !form.class_id || !form.arm_id || !form.session_id}>
            {mutation.isPending ? "Registering…" : "Register student"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
