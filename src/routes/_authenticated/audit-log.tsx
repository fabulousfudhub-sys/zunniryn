import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listAuditLog } from "@/lib/audit.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const qo = queryOptions({ queryKey: ["audit-log"], queryFn: () => listAuditLog({ data: { limit: 200 } }) });

export const Route = createFileRoute("/_authenticated/audit-log")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: AuditLogPage,
});

function AuditLogPage() {
  const { data: rows } = useSuspenseQuery(qo);
  return (
    <div className="container mx-auto px-8 py-10">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold">System</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-primary">Audit log</h1>
        <p className="mt-1 text-muted-foreground">Most recent {rows.length} sensitive changes.</p>
      </header>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">{r.actor_name ?? <span className="text-muted-foreground">system</span>}</td>
                  <td className="p-3"><Badge variant="secondary">{r.action}</Badge></td>
                  <td className="p-3 font-mono text-xs">{r.entity}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{r.entity_id ?? "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
