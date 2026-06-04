import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Database } from "lucide-react";
import { exportData } from "@/lib/exports.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exports")({
  component: ExportsPage,
});

const KINDS: { kind: "students" | "staff" | "results" | "attendance" | "scratch_cards"; label: string; description: string }[] = [
  { kind: "students", label: "Students", description: "All registered student records with bio and contact data." },
  { kind: "staff", label: "Staff", description: "Employee directory including roles and contact info." },
  { kind: "results", label: "Result sheets", description: "Per-student term result summaries with positions." },
  { kind: "attendance", label: "Attendance", description: "All attendance entries across sessions." },
  { kind: "scratch_cards", label: "Scratch cards", description: "Issued result-access PINs and usage status." },
];

function ExportsPage() {
  const run = useServerFn(exportData);
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (kind: typeof KINDS[number]["kind"]) => {
    setBusy(kind);
    try {
      const { filename, csv, count } = await run({ data: { kind } });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${count} ${kind} record${count === 1 ? "" : "s"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container mx-auto px-8 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold">Backup & Exports</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-primary">Data exports</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Download CSV snapshots of core data for backup or offline analysis. Automatic backups of the
          live database are managed by Lovable Cloud.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {KINDS.map((k) => (
          <Card key={k.kind}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">{k.label}</CardTitle>
              <Database className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">{k.description}</p>
              <Button size="sm" onClick={() => download(k.kind)} disabled={busy === k.kind}>
                <Download className="mr-2 h-4 w-4" />
                {busy === k.kind ? "Preparing…" : "CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Automatic backups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Daily database backups are taken automatically by the managed backend.</p>
          <p>To restore from a backup, contact the system administrator. Restore operations are restricted to Super Admin via the backend console.</p>
        </CardContent>
      </Card>
    </div>
  );
}
