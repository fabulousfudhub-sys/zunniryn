import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from "@/lib/announcements.functions";
import { getMe } from "@/lib/me.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Plus, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/announcements")({ component: Page });

function Page() {
  const meFn = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => meFn() });
  const listFn = useServerFn(listAnnouncements);
  const list = useQuery({ queryKey: ["announcements"], queryFn: () => listFn() });
  const del = useServerFn(deleteAnnouncement);
  const qc = useQueryClient();
  const canPost = me.data?.roles?.some((r) => ["super_admin","principal","vice_principal","director"].includes(r));
  const canDelete = me.data?.roles?.some((r) => ["super_admin","principal"].includes(r));

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Announcements</h1>
          <p className="text-sm text-muted-foreground">School-wide notices and bulletins.</p>
        </div>
        {canPost && <NewAnnouncementDialog onDone={() => qc.invalidateQueries({ queryKey: ["announcements"] })} />}
      </div>

      <div className="mt-6 space-y-3">
        {(list.data?.announcements ?? []).map((a: any) => (
          <Card key={a.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary"><Megaphone className="h-4 w-4" /></div>
                <div>
                  <CardTitle className="text-base">{a.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · Audience: {a.audience}
                  </p>
                </div>
              </div>
              {canDelete && (
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (!confirm("Delete this announcement?")) return;
                  await del({ data: { id: a.id } });
                  qc.invalidateQueries({ queryKey: ["announcements"] });
                }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              )}
            </CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{a.body}</p></CardContent>
          </Card>
        ))}
        {list.data?.announcements.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">No announcements yet.</div>
        )}
      </div>
    </div>
  );
}

function NewAnnouncementDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [saving, setSaving] = useState(false);
  const create = useServerFn(createAnnouncement);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await create({ data: { title, body, audience: audience as any } });
      toast.success("Posted."); setOpen(false); setTitle(""); setBody(""); onDone();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-gold text-gold-foreground"><Plus className="mr-2 h-4 w-4" /> New Announcement</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} /></div>
          <div><Label>Body</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={6} maxLength={5000} /></div>
          <div><Label>Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="parents">Parents</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
