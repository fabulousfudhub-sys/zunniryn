import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  Printer, Pencil, ChevronRight, Users, FolderArchive, GitBranch,
  FileCheck2, IdCard, BriefcaseMedical, GraduationCap, Phone,
} from "lucide-react";
import { getStudent } from "@/lib/students.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const studentQO = (id: string) =>
  queryOptions({ queryKey: ["student", id], queryFn: () => getStudent({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/student/$studentId")({
  ssr: false,
  loader: ({ context, params }) => context.queryClient.ensureQueryData(studentQO(params.studentId)),
  component: DossierPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Couldn't load student: {error.message}</div>
  ),
});

function age(dob: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function DossierPage() {
  const { studentId } = Route.useParams();
  const { data: s } = useSuspenseQuery(studentQO(studentId));
  const initials = s.full_name.split(" ").map((x: string) => x[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const a = age(s.date_of_birth);

  const docs = [
    { label: "Birth Certificate", meta: "PDF · Verified", icon: FileCheck2 },
    { label: "Admission Letter", meta: "PDF · Verified", icon: IdCard },
    { label: "Medical Records", meta: "JPG · Updated", icon: BriefcaseMedical },
    { label: "Former Reports", meta: "ZIP · Archival", icon: GraduationCap },
  ];

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/students" className="hover:text-primary">Students</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">Profile 360</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">Student Dossier</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print File</Button>
          <Button><Pencil className="mr-2 h-4 w-4" /> Edit Records</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        {/* Identity card */}
        <Card className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {s.passport_url ? (
                <img src={s.passport_url} alt={s.full_name} className="h-28 w-28 rounded-xl object-cover" />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-xl bg-primary/10 font-display text-3xl font-bold text-primary">{initials}</div>
              )}
              <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{s.status}</Badge>
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold text-primary">{s.full_name}</h2>
            <p className="text-sm text-muted-foreground">ID: {s.admission_no}</p>
          </div>

          <dl className="mt-6 space-y-0 text-sm">
            <Detail label="Date of Birth" value={s.date_of_birth ? `${new Date(s.date_of_birth).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}${a != null ? ` (${a} Yrs)` : ""}` : "—"} />
            <Detail label="Current Grade" value={[s.class_name, s.arm_name].filter(Boolean).join(" ") || "—"} />
            <Detail label="Gender" value={s.gender ?? "—"} />
            <Detail label="State of Origin" value={s.state_of_origin ?? "—"} />
            <Detail label="LGA" value={s.lga ?? "—"} />
          </dl>

          <div className="mt-5 rounded-lg bg-primary/5 p-4">
            <div className="text-xs text-muted-foreground">Parent/Guardian</div>
            <div className="mt-1 flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold">{s.parent_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{s.parent_phone ?? "—"}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Right column */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
                <GitBranch className="h-5 w-5" /> Promotion History
              </h3>
              <span className="text-xs text-muted-foreground">{s.history.length} record{s.history.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="mt-4 space-y-3">
              {s.history.length === 0 && <p className="text-sm text-muted-foreground">No result history yet.</p>}
              {s.history.map((h) => (
                <div key={h.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">{h.session_name} · {h.term_name}</span>
                    <Badge className={h.promoted ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-muted text-muted-foreground"}>
                      {h.promoted ? "PROMOTED" : h.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
                    <HistCell label="Class" value={h.class_name} />
                    <HistCell label="Position" value={h.position != null ? `#${h.position}` : "—"} />
                    <HistCell label="Avg Score" value={`${h.average.toFixed(1)}%`} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
                <Users className="h-5 w-5" /> Linked Siblings
              </h3>
              <div className="mt-4 space-y-2">
                {s.siblings.length === 0 && <p className="text-sm text-muted-foreground">No linked siblings.</p>}
                {s.siblings.map((sib) => (
                  <Link key={sib.id} to="/student/$studentId" params={{ studentId: sib.id }} className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50">
                    <div>
                      <div className="font-semibold">{sib.full_name}</div>
                      <div className="text-xs text-muted-foreground">{sib.class_name ?? "—"} · {sib.admission_no}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
                  <FolderArchive className="h-5 w-5" /> Document Vault
                </h3>
                <button className="text-sm font-medium text-primary hover:underline">Upload New</button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {docs.map((d) => (
                  <div key={d.label} className="rounded-lg border p-3">
                    <d.icon className="h-5 w-5 text-primary" />
                    <div className="mt-2 text-sm font-semibold">{d.label}</div>
                    <div className="text-[11px] text-muted-foreground">{d.meta}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function HistCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display font-bold text-primary">{value}</div>
    </div>
  );
}
