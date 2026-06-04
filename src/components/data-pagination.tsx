import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function useClientPage<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { pageRows: rows.slice(start, start + pageSize), total, totalPages, safePage, start };
}

export function DataPagination({
  page, setPage, pageSize, setPageSize, total, totalPages,
}: {
  page: number; setPage: (n: number) => void;
  pageSize: number; setPageSize: (n: number) => void;
  total: number; totalPages: number;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>Per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>{[10, 20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
        </Select>
        <span>•</span>
        <span>{start}–{end} of {total}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>« First</Button>
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>‹ Prev</Button>
        <span className="px-2">Page {page} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next ›</Button>
        <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last »</Button>
      </div>
    </div>
  );
}
