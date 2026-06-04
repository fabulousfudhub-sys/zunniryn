import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import {
  Users, GraduationCap, CalendarDays, ClipboardCheck, ArrowUpRight, Calendar,
  Compass, Key, DatabaseBackup, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { getMe, type AppRole } from "@/lib/me.functions";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { listAuditLog } from "@/lib/audit.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statsQO = queryOptions({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });
const meQO = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
const auditQO = queryOptions({
  queryKey: ["audit-recent"],
  queryFn: () => listAuditLog({ data: { limit: 6 } }),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQO),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useSuspenseQuery(statsQO);
  const { data: me } = useSuspenseQuery(meQO);
  const audit = useQuery(auditQO);
  const has = (r: AppRole) => me.roles.includes(r) || me.roles.includes("super_admin");
  const [scope, setScope] = useState<"Current Session" | "All Time">("Current Session");

  const resultPct = (() => {
    const total = stats.pendingResults + stats.publishedResults + stats.approvalQueue;
    return total ? Math.round((stats.publishedResults / total) * 100) : 0;
  })();

  const sect = stats.sectionDistribution;
  const total = sect.NUR + sect.PRI + sect.SEC || stats.students || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Top stat strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total Students" value={stats.students.toLocaleString()} hint="+12% from last term" icon={Users} accent />
        <StatTile label="Total Staff" value={stats.staff.toLocaleString()} hint={`${stats.approvalQueue} pending approvals`} icon={GraduationCap} accent />
        <StatTile
          label="Active Session"
          value={stats.currentSession ?? "—"}
          hint={stats.currentTerm ?? "—"}
          icon={CalendarDays}
          accent
        />
        <StatTile label="Result Status" value={`${resultPct}%`} hint="Published" icon={ClipboardCheck} accent progress={resultPct} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Distribution */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-primary">Student Distribution</h2>
              <p className="text-xs text-muted-foreground">Enrollment breakdown by section</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                {scope} <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setScope("Current Session")}>Current Session</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setScope("All Time")}>All Time</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[180px_1fr]">
            <DistroVisual total={stats.students} sect={sect} />
            <div className="space-y-4">
              <BarRow label="Secondary" value={sect.SEC} total={total} color="bg-primary" />
              <BarRow label="Primary" value={sect.PRI} total={total} color="bg-primary/70" />
              <BarRow label="Nursery" value={sect.NUR} total={total} color="bg-gold" />
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold text-primary">Quick Actions</h2>
          <div className="mt-4 space-y-3">
            <QuickAction icon={Calendar} title="Manage Sessions" subtitle="Update academic calendar" to="/settings" />
            <QuickAction icon={Compass} title="Configure Grading" subtitle="Edit score ranges & marks" to="/grading" />
            <QuickAction icon={Key} title="Generate PINs" subtitle="Batch scratch card tokens" to="/scratch-cards" />
            <QuickAction icon={DatabaseBackup} title="System Backup" subtitle="Last backup: 2h ago" to="/exports" />
          </div>
        </Card>
      </div>

      {/* Recent System Activity */}
      <Card className="mt-6 p-5">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-primary">Recent System Activity</h2>
            <p className="text-xs text-muted-foreground">Administrative audit trail and security logs</p>
          </div>
          <Link to="/audit-log" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View Full Logs <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(audit.data ?? []).map((row) => {
                const name = row.actor_name ?? "System";
                const initials = name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                return (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">{initials || "SY"}</div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{row.entity}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{row.action.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">● success</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{new Date(row.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
              {(!audit.data || audit.data.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">No recent activity.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role-specific extras kept for principals / exam officers */}
      {(has("principal") || has("exam_officer")) && (
        <Card className="mt-6 p-5">
          <h2 className="font-display text-xl font-semibold text-primary">Results pipeline · {stats.currentTerm ?? "current term"}</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <PipeStat label="Pending" value={stats.pendingResults} />
            <PipeStat label="In approval" value={stats.approvalQueue} />
            <PipeStat label="Published" value={stats.publishedResults} />
          </div>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  label, value, hint, icon: Icon, accent, progress,
}: { label: string; value: string; hint?: string; icon: typeof Users; accent?: boolean; progress?: number }) {
  return (
    <Card className={`relative overflow-hidden p-5 ${accent ? "border-l-[3px] border-l-primary" : ""}`}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <div className="grid h-7 w-7 place-items-center rounded-md border bg-muted/40 text-primary"><Icon className="h-3.5 w-3.5" /></div>
      </div>
      <div className="mt-2 font-display text-3xl font-bold text-primary">{value}</div>
      {progress != null ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>
          <span>{hint}</span>
        </div>
      ) : hint ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}</span>
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{value.toLocaleString()}</span>{" "}
          <span className="text-xs">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function DistroVisual({ total, sect }: { total: number; sect: { NUR: number; PRI: number; SEC: number } }) {
  const t = sect.NUR + sect.PRI + sect.SEC || 1;
  // Donut geometry
  const r = 70;
  const c = 2 * Math.PI * r;
  const segs = [
    { value: sect.SEC, className: "text-primary" },
    { value: sect.PRI, className: "text-primary/70" },
    { value: sect.NUR, className: "text-gold" },
  ];
  let offset = 0;
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="currentColor" strokeWidth="20" className="text-muted" />
        {segs.map((s, i) => {
          const len = (s.value / t) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={i}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="20"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              className={s.className}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-primary">{total.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Students</div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, subtitle, to }: { icon: typeof Users; title: string; subtitle: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition hover:bg-muted/60">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </Link>
  );
}

function PipeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <div className="font-display text-2xl font-bold text-primary">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
