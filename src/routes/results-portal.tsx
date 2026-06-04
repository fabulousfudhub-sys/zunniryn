import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { lookupResultByPin, listPublishedTerms } from "@/lib/reports.functions";
import { ReportCardView } from "@/components/report-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/results-portal")({
  head: () => ({
    meta: [
      { title: "Check Results — Zinnuryn Academy Bauchi" },
      { name: "description", content: "Parents and students: enter admission number and scratch-card PIN to view published term results." },
    ],
  }),
  component: Portal,
});

function Portal() {
  const termsFn = useServerFn(listPublishedTerms);
  const termsQ = useQuery({ queryKey: ["pub-terms"], queryFn: () => termsFn() });
  const lookup = useServerFn(lookupResultByPin);
  const [pin, setPin] = useState("");
  const [admissionNo, setAdm] = useState("");
  const [termId, setTermId] = useState<string>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || !admissionNo || !termId) return toast.error("Fill all fields.");
    setLoading(true);
    try { setReport(await lookup({ data: { pin, admissionNo, termId } })); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  if (report) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-primary text-primary-foreground print:hidden">
          <div className="container mx-auto flex items-center justify-between px-6 py-3">
            <button onClick={() => setReport(null)} className="flex items-center gap-2 text-sm hover:text-gold">
              <ArrowLeft className="h-4 w-4" /> Check another result
            </button>
            <Link to="/" className="text-sm hover:text-gold">Home</Link>
          </div>
        </div>
        <ReportCardView data={report} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary/80">
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <Link to="/" className="mb-6 flex items-center gap-2 text-primary-foreground/80 hover:text-gold">
          <img src={logo} alt="" className="h-10 w-10" /> <span className="font-display font-bold">Zinnuryn Academy</span>
        </Link>
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display text-2xl text-primary">Check Your Result</CardTitle>
            <CardDescription>Enter your admission number and the scratch-card PIN issued by the school.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="adm">Admission Number</Label>
                <Input id="adm" value={admissionNo} onChange={(e) => setAdm(e.target.value)} placeholder="ZAB/25/SEC/0001" required />
              </div>
              <div>
                <Label htmlFor="term">Term</Label>
                <Select value={termId} onValueChange={setTermId}>
                  <SelectTrigger id="term"><SelectValue placeholder="Choose term" /></SelectTrigger>
                  <SelectContent>
                    {(termsQ.data?.terms ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name.replace(/_/g, " ")} — {t.academic_sessions?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pin">Scratch Card PIN</Label>
                <Input id="pin" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="1234-5678-9012" required />
                <p className="mt-1 text-xs text-muted-foreground">Format: 4-4-4 digits separated by dashes.</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-gold-foreground hover:opacity-90">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} View Result
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-primary-foreground/70">
          Each PIN can be used a limited number of times and is tied to the first student it opens.
        </p>
      </div>
    </div>
  );
}
