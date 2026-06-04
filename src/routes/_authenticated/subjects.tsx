import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getReferenceData, subjectIsAvailableFor, type SubjectRef } from "@/lib/reference.functions";
import { createSubject, updateSubject, deleteSubject } from "@/lib/academic.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, MoreVertical, BookOpen, Sigma, FlaskConical, Globe, Brush, FileText, Upload } from "lucide-react";
import { DataPagination, useClientPage } from "@/components/data-pagination";

const refQO = queryOptions({ queryKey: ["reference"], queryFn: () => getReferenceData() });

export const Route = createFileRoute("/_authenticated/subjects")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(refQO),
  component: SubjectsPage,
});

type SectionTab = "SEC" | "PRI" | "NUR";
type LevelOpt = "ALL" | "JSS" | "SSS";

const ICONS = [Sigma, Brush, Globe, FlaskConical, BookOpen, FileText];
function iconFor(s: SubjectRef) {
  const i = (s.name.charCodeAt(0) + s.name.length) % ICONS.length;
  return ICONS[i];
}

function classAbbrev(name: string, levelOrder: number, section: string) {
  if (section === "SEC") return (levelOrder <= 3 ? "J" : "S") + (((levelOrder - 1) % 3) + 1);
  if (section === "PRI") return "P" + levelOrder;
  return "N" + levelOrder;
}

function SubjectsPage() {
  const { data: ref } = useSuspenseQuery(refQO);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRef | null>(null);
  const [tab, setTab] = useState<SectionTab>("SEC");
  const [category, setCategory] = useState<"ALL" | "Core" | "Elective">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const filtered = useMemo(
    () => ref.subjects.filter((s) => (s.section ?? "SEC") === tab),
    [ref.subjects, tab],
  );
  const { pageRows, total, totalPages, safePage } = useClientPage(filtered, page, pageSize);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Academic Records › Subject Management</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary">Subject Management</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Bulk Import</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add New Subject</Button>
            </DialogTrigger>
            <SubjectDialog onClose={() => setOpen(false)} />
          </Dialog>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border bg-muted/40 p-1">
          {(["SEC", "PRI", "NUR"] as SectionTab[]).map((s) => (
            <button
              key={s}
              onClick={() => { setTab(s); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === s ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "SEC" ? "Secondary" : s === "PRI" ? "Primary" : "Nursery"}
            </button>
          ))}
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="Core">Core</SelectItem>
            <SelectItem value="Elective">Elective</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pageRows.map((s) => {
          const Icon = iconFor(s);
          const matchingClasses = ref.classes.filter((c) => subjectIsAvailableFor(s, c, null));
          const chips = matchingClasses.slice(0, 3).map((c) => classAbbrev(c.name, c.level_order, c.section));
          const extra = matchingClasses.length - chips.length;
          const isCore = (s.code ?? "").length <= 3 || s.name.length <= 9;
          return (
            <Card key={s.id} className="relative overflow-hidden border-l-[3px] border-l-primary p-5">
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-muted text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">ACTIVE</Badge>
              </div>
              <div className="mt-4 font-display text-xl font-semibold text-primary">{s.name}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">CODE: {s.code ?? "—"}</div>

              <div className="mt-4 flex items-center gap-2 border-t pt-4">
                <div className="flex items-center -space-x-1">
                  {chips.map((c) => (
                    <span key={c} className="grid h-6 min-w-6 place-items-center rounded-full border bg-background px-1.5 text-[10px] font-semibold">{c}</span>
                  ))}
                  {extra > 0 && (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">+{extra}</span>
                  )}
                  {chips.length === 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-muted text-[10px] font-semibold">0</span>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {matchingClasses.length === 0 ? "No Classes Assigned" : `${matchingClasses.length} Classes Assigned`}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Badge variant="secondary">{isCore ? "Core" : "Elective"} Category</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(s)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          );
        })}
        {/* Configure New Subject card */}
        <button
          onClick={() => setOpen(true)}
          className="grid place-items-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <div className="grid h-12 w-12 place-items-center rounded-md bg-muted"><Plus className="h-5 w-5" /></div>
          <div className="mt-3 text-sm font-medium">Configure New Subject</div>
        </button>
      </div>

      <div className="mt-6 rounded-lg border bg-background p-3">
        <DataPagination page={safePage} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} totalPages={totalPages} />
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <SubjectDialog subject={editing} onClose={() => setEditing(null)} />}
      </Dialog>
    </div>
  );
}

function SubjectDialog({ subject, onClose }: { subject?: SubjectRef; onClose: () => void }) {
  const { data: ref } = useSuspenseQuery(refQO);
  const qc = useQueryClient();
  const createFn = useServerFn(createSubject);
  const updateFn = useServerFn(updateSubject);
  const delFn = useServerFn(deleteSubject);
  const isEdit = !!subject;

  const initialLevel: LevelOpt =
    subject?.section === "SEC" && subject?.min_level_order === 1 && subject?.max_level_order === 3 ? "JSS" :
    subject?.section === "SEC" && subject?.min_level_order === 4 && subject?.max_level_order === 6 ? "SSS" :
    "ALL";

  const [form, setForm] = useState({
    name: subject?.name ?? "",
    code: subject?.code ?? "",
    section: (subject?.section ?? "SEC") as "NUR" | "PRI" | "SEC",
    level: initialLevel,
    restricted_arm_ids: subject?.restricted_arm_ids ?? ([] as string[]),
  });

  const computeBounds = () => {
    if (form.section !== "SEC" || form.level === "ALL") return { min: null as number | null, max: null as number | null };
    if (form.level === "JSS") return { min: 1, max: 3 };
    return { min: 4, max: 6 };
  };

  const save = useMutation({
    mutationFn: () => {
      const { min, max } = computeBounds();
      const payload = {
        name: form.name,
        code: form.code || null,
        section: form.section,
        min_level_order: min,
        max_level_order: max,
        restricted_arm_ids: form.restricted_arm_ids,
      } as const;
      return isEdit ? updateFn({ data: { id: subject!.id, ...payload } }) : createFn({ data: payload });
    },
    onSuccess: () => { toast.success(isEdit ? "Updated" : "Subject added"); qc.invalidateQueries({ queryKey: ["reference"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => delFn({ data: { id: subject!.id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["reference"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleArm = (id: string) => setForm((f) => ({
    ...f,
    restricted_arm_ids: f.restricted_arm_ids.includes(id)
      ? f.restricted_arm_ids.filter((x) => x !== id)
      : [...f.restricted_arm_ids, id],
  }));

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{isEdit ? "Edit Subject" : "Add Subject"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="mb-1.5 block text-xs font-medium">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" /></div>
          <div><Label className="mb-1.5 block text-xs font-medium">Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MTH-SEC-01" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="mb-1.5 block text-xs font-medium">Section</Label>
            <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v as any, level: v === "SEC" ? form.level : "ALL" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NUR">Nursery</SelectItem>
                <SelectItem value="PRI">Primary</SelectItem>
                <SelectItem value="SEC">Secondary</SelectItem>
              </SelectContent>
            </Select></div>
          <div><Label className="mb-1.5 block text-xs font-medium">Level (Secondary only)</Label>
            <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as LevelOpt })} disabled={form.section !== "SEC"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All (JSS + SSS)</SelectItem>
                <SelectItem value="JSS">JSS only</SelectItem>
                <SelectItem value="SSS">SSS only</SelectItem>
              </SelectContent>
            </Select></div>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Arm restriction <span className="text-muted-foreground font-normal">(empty = all arms)</span></Label>
          <div className="rounded-md border p-2 grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
            {ref.arms.map((a) => (
              <label key={a.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer">
                <Checkbox checked={form.restricted_arm_ids.includes(a.id)} onCheckedChange={() => toggleArm(a.id)} />
                <span className="truncate">{a.name}</span>
              </label>
            ))}
            {ref.arms.length === 0 && <span className="col-span-3 text-xs text-muted-foreground p-2">No arms defined.</span>}
          </div>
        </div>
      </div>
      <DialogFooter className="flex sm:justify-between gap-2">
        {isEdit ? (
          <Button variant="destructive" onClick={() => { if (confirm("Delete this subject?")) remove.mutate(); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
