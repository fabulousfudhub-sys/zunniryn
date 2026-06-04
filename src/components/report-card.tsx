import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function ReportCardView({ data }: { data: any }) {
  const { school, student, term, scores, sheet, classSize } = data;
  const cls = student.classes;
  const arm = student.arms;
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-8 py-10 print:p-0 print:max-w-none">
        <div className="mb-4 flex justify-end print:hidden">
          <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>

        <header className="border-b-4 border-double border-primary pb-4 text-center">
          <div className="text-[10px] uppercase tracking-[0.35em] text-amber-600">{school.acronym}</div>
          <h1 className="font-display text-3xl font-bold text-primary">{school.name}</h1>
          <div className="text-sm text-muted-foreground">{school.location} — {school.motto}</div>
          <div className="mt-3 text-sm font-semibold uppercase tracking-wider">Student Report Card</div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Field label="Student Name" value={student.full_name} />
          <Field label="Admission No." value={student.admission_no} />
          <Field label="Class" value={`${cls?.name ?? ""} ${arm?.name ?? ""}`} />
          <Field label="Gender" value={student.gender ?? "—"} />
          <Field label="Session" value={term.academic_sessions?.name ?? ""} />
          <Field label="Term" value={term.name?.replace(/_/g, " ")} />
        </section>

        <section className="mt-6">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="border p-2 text-left">Subject</th>
                <th className="border p-2 w-14">CA1</th>
                <th className="border p-2 w-14">CA2</th>
                <th className="border p-2 w-14">CA3</th>
                <th className="border p-2 w-16">Exam</th>
                <th className="border p-2 w-16">Total</th>
                <th className="border p-2 w-14">Grade</th>
                <th className="border p-2 text-left">Remark</th>
              </tr>
            </thead>
            <tbody>
              {scores.length === 0 && (
                <tr><td colSpan={8} className="border p-4 text-center text-muted-foreground">No scores recorded.</td></tr>
              )}
              {scores.map((s: any, i: number) => (
                <tr key={i} className="odd:bg-muted/30">
                  <td className="border p-2">{s.subjects?.name}</td>
                  <td className="border p-2 text-center">{s.ca1 ?? 0}</td>
                  <td className="border p-2 text-center">{s.ca2 ?? 0}</td>
                  <td className="border p-2 text-center">{s.ca3 ?? 0}</td>
                  <td className="border p-2 text-center">{s.exam ?? 0}</td>
                  <td className="border p-2 text-center font-semibold">{s.total ?? 0}</td>
                  <td className="border p-2 text-center font-bold text-primary">{s.grade ?? "—"}</td>
                  <td className="border p-2">{s.remark ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {sheet && (
          <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
            <Stat label="Total" value={Number(sheet.total_score).toFixed(1)} />
            <Stat label="Average" value={`${Number(sheet.average).toFixed(2)}%`} />
            <Stat label="Position" value={sheet.position ? `${ordinal(sheet.position)} of ${classSize}` : "—"} />
            <Stat label="Status" value={sheet.status.toUpperCase()} />
          </section>
        )}

        <section className="mt-6 grid gap-4">
          <Comment label="Form Master's Comment" value={sheet?.form_master_comment} />
          <Comment label="Principal's Comment" value={sheet?.principal_comment} />
        </section>

        <footer className="mt-10 border-t pt-4 text-center text-xs text-muted-foreground">
          This is a computer-generated report from {school.name}, {school.location}.
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border-2 border-primary/20 bg-primary/5 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-bold text-primary">{value}</div>
    </div>
  );
}
function Comment({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm italic">{value || "—"}</div>
    </div>
  );
}
function ordinal(n: number) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
