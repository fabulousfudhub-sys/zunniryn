import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getReferenceData } from "@/lib/reference.functions";
import { generateScratchCards, listScratchCards } from "@/lib/results.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination, useClientPage } from "@/components/data-pagination";
import { Plus, Search } from "lucide-react";

const refQO = queryOptions({ queryKey: ["reference"], queryFn: () => getReferenceData() });
const listQO = queryOptions({ queryKey: ["scratch_cards"], queryFn: () => listScratchCards() });

export const Route = createFileRoute("/_authenticated/scratch-cards")({
  ssr: false,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(refQO),
      context.queryClient.ensureQueryData(listQO),
    ]),
  component: ScratchCardsPage,
});

function ScratchCardsPage() {
  const { data: ref } = useSuspenseQuery(refQO);
  const { data: list } = useSuspenseQuery(listQO);
  const qc = useQueryClient();
  const [count, setCount] = useState(20);
  const [maxUses, setMaxUses] = useState(3);
  const [sessionId, setSessionId] = useState(ref.currentSession?.id ?? "");

  const stats = useMemo(() => {
    const cards = list.cards;
    return {
      total: cards.length,
      sold: cards.filter((c) => c.uses > 0).length,
      active: cards.filter((c) => c.status === "unused").length,
      expired: cards.filter((c) => c.status === "expired").length,
    };
  }, [list.cards]);

  const gen = useServerFn(generateScratchCards);
  const mutate = useMutation({
    mutationFn: () => gen({ data: { sessionId, count, maxUses } }),
    onSuccess: (r) => { toast.success(`Generated ${r.cards.length} PINs`); qc.invalidateQueries({ queryKey: ["scratch_cards"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-primary">Scratch Card Management</h1>
        <p className="text-sm text-muted-foreground">Generate, track, and manage result-checker PINs for the current academic session.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total Generated" value={stats.total} accent />
        <StatTile label="Total Sold" value={stats.sold} tone="emerald" />
        <StatTile label="Active PINs" value={stats.active} tone="primary" />
        <StatTile label="Expired Cards" value={stats.expired} tone="destructive" />
      </div>


      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Session</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ref.sessions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Count</Label>
            <Input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
          <div>
            <Label>Max uses per PIN</Label>
            <Input type="number" min={1} max={20} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => mutate.mutate()} disabled={!sessionId || mutate.isPending} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Generate
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-display text-lg font-semibold">Recent Cards</h2>
        <CardsTable />
      </Card>
    </div>
  );
}

function CardsTable() {
  const { data: list } = useSuspenseQuery(listQO);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unused" | "used" | "expired">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filtered = useMemo(() => list.cards.filter((c) => {
    const matchQ = !q.trim() || c.pin.toLowerCase().includes(q.toLowerCase());
    const matchS = statusFilter === "all" || c.status === statusFilter;
    return matchQ && matchS;
  }), [list.cards, q, statusFilter]);

  const { pageRows, total, totalPages, safePage } = useClientPage(filtered, page, pageSize);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by PIN" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unused">Unused</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No cards match.</TableCell></TableRow>
            )}
            {pageRows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono">{c.pin}</TableCell>
                <TableCell><Badge variant={c.status === "unused" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                <TableCell>{c.uses} / {c.max_uses}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination page={safePage} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} totalPages={totalPages} />
    </>
  );
}
