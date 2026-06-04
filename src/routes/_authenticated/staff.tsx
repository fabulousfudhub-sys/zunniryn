import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listStaff, createStaff, updateStaff, deleteStaff, type AppRole, type StaffRow } from "@/lib/staff.functions";
import { getStates, getLGAs } from "@/lib/nigeria-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Download, Users } from "lucide-react";
import { DataPagination, useClientPage } from "@/components/data-pagination";

const staffQO = queryOptions({ queryKey: ["staff"], queryFn: () => listStaff() });

export const Route = createFileRoute("/_authenticated/staff")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(staffQO),
  component: StaffPage,
});

const ROLES: { value: AppRole; label: string }[] = [
  { value: "director", label: "Director" },
  { value: "principal", label: "Principal" },
  { value: "vice_principal", label: "Vice Principal" },
  { value: "admission_officer", label: "Admission Officer" },
  { value: "exam_officer", label: "Exam Officer" },
  { value: "teacher", label: "Teacher" },
  { value: "form_master", label: "Form Master" },
];

function StaffPage() {
  const { data: staff } = useSuspenseQuery(staffQO);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => staff.filter((s) => {
    const t = q.trim().toLowerCase();
    const matchQ = !t ||
      s.full_name.toLowerCase().includes(t) ||
      s.employee_no.toLowerCase().includes(t) ||
      (s.email ?? "").toLowerCase().includes(t);
    const matchRole = roleFilter === "all" || s.roles.includes(roleFilter);
    const matchStatus = statusFilter === "all" || (statusFilter === "active" ? s.is_active : !s.is_active);
    return matchQ && matchRole && matchStatus;
  }), [staff, q, roleFilter, statusFilter]);

  const activeCount = useMemo(() => staff.filter((s) => s.is_active).length, [staff]);
  const departments = useMemo(
    () => Array.from(new Set(staff.map((s) => s.department).filter(Boolean))) as string[],
    [staff],
  );
  const [deptFilter, setDeptFilter] = useState<"all" | string>("all");

  const filtered2 = useMemo(
    () => filtered.filter((s) => deptFilter === "all" || s.department === deptFilter),
    [filtered, deptFilter],
  );
  const { pageRows, total, totalPages, safePage } = useClientPage(filtered2, page, pageSize);

  const exportCsv = () => {
    const head = ["Employee No", "Name", "Email", "Department", "Designation", "Status"];
    const rows = filtered2.map((s) => [
      s.employee_no, s.full_name, s.email ?? "", s.department ?? "",
      s.roles.map(prettyRole).join(" / "), s.is_active ? "Active" : "Inactive",
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "staff-directory.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">Staff Directory</h1>
          <p className="text-sm text-muted-foreground">Manage academic and non-academic personnel records. Login credentials are created automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Register New Staff</Button>
            </DialogTrigger>
            <AddStaffDialog onSuccess={() => setOpen(false)} />
          </Dialog>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Staff</span>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{activeCount} of {staff.length}</Badge>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              <span className="font-display text-3xl font-semibold text-primary">{activeCount}</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${staff.length ? (activeCount / staff.length) * 100 : 0}%` }} />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h2 className="text-sm font-semibold text-primary">Quick Filter</h2>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Department</Label>
              <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</Label>
              <div className="flex flex-wrap gap-2">
                {(["all", "active", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {s === "all" ? "All" : s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Role</Label>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as any); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="All roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card className="p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search staff, documents, or ID…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No staff match.</TableCell></TableRow>
                )}
                {pageRows.map((s) => {
                  const initials = s.full_name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials}</div>
                          <div className="min-w-0">
                            <div className="font-medium leading-tight">{s.full_name}</div>
                            <div className="truncate text-xs text-muted-foreground">{s.email ?? "—"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.employee_no}</TableCell>
                      <TableCell>{s.department ?? "—"}</TableCell>
                      <TableCell>{s.roles.length ? prettyRole(s.roles[0]) : "—"}</TableCell>
                      <TableCell>
                        <Badge className={s.is_active
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "bg-muted text-muted-foreground hover:bg-muted"}>
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditing(s)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={safePage} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} totalPages={totalPages} />
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <EditStaffDialog staff={editing} onClose={() => setEditing(null)} />}
      </Dialog>
    </div>
  );
}

function AddStaffDialog({ onSuccess }: { onSuccess: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createStaff);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", password: "",
    gender: "" as "" | "Male" | "Female",
    department: "", qualification: "",
    address: "", state_of_origin: "", lga: "",
    roles: [] as AppRole[],
  });
  const states = useMemo(() => getStates(), []);
  const lgas = useMemo(() => getLGAs(form.state_of_origin), [form.state_of_origin]);

  const toggleRole = (r: AppRole) => setForm((f) => ({
    ...f,
    roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
  }));

  const mutation = useMutation({
    mutationFn: (input: typeof form) => create({
      data: { ...input, gender: input.gender || undefined } as any,
    }),
    onSuccess: () => {
      toast.success("Staff added. Login credentials are active.");
      qc.invalidateQueries({ queryKey: ["staff"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not add staff"),
  });

  const canSubmit = form.full_name && form.email && form.password.length >= 8 && form.roles.length > 0;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}>
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
        <Field label="Email (login)" required>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
        </Field>
        <Field label="Initial password" required>
          <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} maxLength={72} />
        </Field>
        <Field label="Department">
          <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} maxLength={80} />
        </Field>
        <Field label="Qualification" className="md:col-span-2">
          <Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} maxLength={120} />
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

        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-medium">Roles <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent">
                <Checkbox checked={form.roles.includes(r.value)} onCheckedChange={() => toggleRole(r.value)} />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending || !canSubmit}>
            {mutation.isPending ? "Adding…" : "Add staff"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditStaffDialog({ staff, onClose }: { staff: StaffRow; onClose: () => void }) {
  const qc = useQueryClient();
  const update = useServerFn(updateStaff);
  const del = useServerFn(deleteStaff);
  const states = useMemo(() => getStates(), []);
  const [form, setForm] = useState({
    full_name: staff.full_name,
    phone: staff.phone ?? "",
    gender: (staff.gender ?? "") as "" | "Male" | "Female",
    department: staff.department ?? "",
    qualification: staff.qualification ?? "",
    address: staff.address ?? "",
    state_of_origin: staff.state_of_origin ?? "",
    lga: staff.lga ?? "",
    is_active: staff.is_active,
    roles: [...staff.roles],
  });
  const lgas = useMemo(() => getLGAs(form.state_of_origin), [form.state_of_origin]);

  const toggleRole = (r: AppRole) => setForm((f) => ({
    ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
  }));

  const save = useMutation({
    mutationFn: () => update({ data: {
      id: staff.id,
      full_name: form.full_name,
      phone: form.phone || null,
      gender: form.gender || null,
      department: form.department || null,
      qualification: form.qualification || null,
      address: form.address || null,
      state_of_origin: form.state_of_origin || null,
      lga: form.lga || null,
      is_active: form.is_active,
      roles: form.roles,
    } as any }),
    onSuccess: () => { toast.success("Staff updated."); qc.invalidateQueries({ queryKey: ["staff"] }); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const remove = useMutation({
    mutationFn: () => del({ data: { id: staff.id } }),
    onSuccess: () => { toast.success("Staff deleted."); qc.invalidateQueries({ queryKey: ["staff"] }); onClose(); },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit {staff.full_name} <span className="font-mono text-xs text-muted-foreground ml-2">{staff.employee_no}</span></DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Full name">
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={120} />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} /></Field>
        <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} maxLength={80} /></Field>
        <Field label="Qualification" className="md:col-span-2"><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} maxLength={120} /></Field>
        <Field label="State of origin">
          <Select value={form.state_of_origin} onValueChange={(v) => setForm({ ...form, state_of_origin: v, lga: "" })}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent className="max-h-72">{states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="LGA">
          <Select value={form.lga} onValueChange={(v) => setForm({ ...form, lga: v })} disabled={!form.state_of_origin}>
            <SelectTrigger><SelectValue placeholder={form.state_of_origin ? "Select LGA" : "Pick state first"} /></SelectTrigger>
            <SelectContent className="max-h-72">{lgas.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Address" className="md:col-span-2"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={300} /></Field>

        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-medium">Roles</Label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-accent">
                <Checkbox checked={form.roles.includes(r.value)} onCheckedChange={() => toggleRole(r.value)} />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 md:col-span-2">
          <Checkbox checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: !!c })} />
          <span className="text-sm">Active</span>
        </label>
      </div>
      <DialogFooter className="flex sm:justify-between gap-2">
        <Button variant="destructive" onClick={() => { if (confirm("Delete this staff member and their login? This cannot be undone.")) remove.mutate(); }} disabled={remove.isPending}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

function prettyRole(r: string) {
  return r.split("_").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
}

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
