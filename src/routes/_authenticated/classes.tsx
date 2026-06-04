import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getReferenceData, type ClassRef, type ArmRef } from "@/lib/reference.functions";
import { createClass, updateClass, deleteClass, createArm, updateArm, deleteArm } from "@/lib/academic.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

const refQO = queryOptions({ queryKey: ["reference"], queryFn: () => getReferenceData() });

export const Route = createFileRoute("/_authenticated/classes")({
  ssr: false,
  loader: ({ context }) => context.queryClient.ensureQueryData(refQO),
  component: ClassesPage,
});

const SECTIONS: { code: "NUR" | "PRI" | "SEC"; label: string }[] = [
  { code: "NUR", label: "Nursery" },
  { code: "PRI", label: "Primary" },
  { code: "SEC", label: "Secondary" },
];

function ClassesPage() {
  const { data: ref } = useSuspenseQuery(refQO);
  const [clsOpen, setClsOpen] = useState(false);
  const [armOpen, setArmOpen] = useState(false);
  const [editCls, setEditCls] = useState<ClassRef | null>(null);
  const [editArm, setEditArm] = useState<ArmRef | null>(null);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">Classes &amp; Arms Management</h1>
        <p className="text-sm text-muted-foreground">Configure academic levels, class structures, and class arms / streams.</p>
      </header>


      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="arms">Arms</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={clsOpen} onOpenChange={setClsOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Class</Button>
              </DialogTrigger>
              <ClassDialog onClose={() => setClsOpen(false)} />
            </Dialog>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {SECTIONS.map((sec) => {
              const list = ref.classes.filter((c) => c.section === sec.code);
              return (
                <Card key={sec.code} className="p-0 overflow-hidden">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
                    <div className="font-semibold">{sec.label}</div>
                    <Badge variant="secondary">{list.length}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Name</TableHead><TableHead className="w-16">Order</TableHead><TableHead className="w-10"></TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">No classes.</TableCell></TableRow>}
                      {list.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.level_order}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => setEditCls(c)}><Pencil className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="arms" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={armOpen} onOpenChange={setArmOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Arm</Button>
              </DialogTrigger>
              <ArmDialog onClose={() => setArmOpen(false)} />
            </Dialog>
          </div>
          <Card className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {ref.arms.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No arms yet.</TableCell></TableRow>}
                {ref.arms.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditArm(a)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editCls} onOpenChange={(o) => !o && setEditCls(null)}>
        {editCls && <ClassDialog cls={editCls} onClose={() => setEditCls(null)} />}
      </Dialog>
      <Dialog open={!!editArm} onOpenChange={(o) => !o && setEditArm(null)}>
        {editArm && <ArmDialog arm={editArm} onClose={() => setEditArm(null)} />}
      </Dialog>
    </div>
  );
}

function ClassDialog({ cls, onClose }: { cls?: ClassRef; onClose: () => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createClass);
  const updateFn = useServerFn(updateClass);
  const delFn = useServerFn(deleteClass);
  const isEdit = !!cls;
  const [form, setForm] = useState({
    name: cls?.name ?? "",
    section: (cls?.section ?? "PRI") as "NUR" | "PRI" | "SEC",
    level_order: cls?.level_order ?? 1,
  });
  const save = useMutation({
    mutationFn: () => isEdit ? updateFn({ data: { id: cls!.id, ...form } }) : createFn({ data: form }),
    onSuccess: () => { toast.success(isEdit ? "Updated" : "Class added"); qc.invalidateQueries({ queryKey: ["reference"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => delFn({ data: { id: cls!.id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["reference"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{isEdit ? "Edit Class" : "Add Class"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. JSS 1" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Section</Label>
          <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NUR">Nursery</SelectItem>
              <SelectItem value="PRI">Primary</SelectItem>
              <SelectItem value="SEC">Secondary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs font-medium">Level Order</Label>
          <Input type="number" value={form.level_order} onChange={(e) => setForm({ ...form, level_order: Number(e.target.value) })} />
        </div>
      </div>
      <DialogFooter className="flex sm:justify-between gap-2">
        {isEdit ? <Button variant="destructive" onClick={() => { if (confirm("Delete class?")) remove.mutate(); }}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button> : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name || save.isPending}>Save</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

function ArmDialog({ arm, onClose }: { arm?: ArmRef; onClose: () => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createArm);
  const updateFn = useServerFn(updateArm);
  const delFn = useServerFn(deleteArm);
  const isEdit = !!arm;
  const [name, setName] = useState(arm?.name ?? "");
  const save = useMutation({
    mutationFn: () => isEdit ? updateFn({ data: { id: arm!.id, name } }) : createFn({ data: { name } }),
    onSuccess: () => { toast.success(isEdit ? "Updated" : "Arm added"); qc.invalidateQueries({ queryKey: ["reference"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => delFn({ data: { id: arm!.id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["reference"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{isEdit ? "Edit Arm" : "Add Arm"}</DialogTitle></DialogHeader>
      <div>
        <Label className="mb-1.5 block text-xs font-medium">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. A" />
      </div>
      <DialogFooter className="flex sm:justify-between gap-2">
        {isEdit ? <Button variant="destructive" onClick={() => { if (confirm("Delete arm?")) remove.mutate(); }}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button> : <span />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={!name || save.isPending}>Save</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
