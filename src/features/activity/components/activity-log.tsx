"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filterActivity } from "../store";
import { activityModules, type ActivityEntry, type ActivityModule } from "../types";

const moduleTone: Record<ActivityModule, "brand" | "success" | "warning" | "neutral" | "danger"> = {
  POS: "brand",
  Products: "warning",
  Inventory: "success",
  Costing: "warning",
  Expenses: "neutral",
  Users: "danger",
  Settings: "neutral",
};
const ranges = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "all", label: "All time" },
];
const PAGE = 50;
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(iso));

export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  const [query, setQuery] = useState("");
  const [user, setUser] = useState("all");
  const [module, setModule] = useState("all");
  const [range, setRange] = useState("7");
  const [shown, setShown] = useState(PAGE);
  // "Today" = since 00:00 Manila; 7/30 days count back whole days from then.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000); // so "Today" rolls over at midnight
    return () => clearInterval(timer);
  }, []);

  const userItems = [{ value: "all", label: "All users" }, ...[...new Set(entries.map((e) => e.user))].map((u) => ({ value: u, label: u }))];
  const moduleItems = [{ value: "all", label: "All modules" }, ...activityModules.map((m) => ({ value: m, label: m }))];
  const midnight = new Date(new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }) + "T00:00:00+08:00").getTime();
  const since = range === "all" ? undefined : new Date(midnight - (Number(range) - 1) * 86_400_000).toISOString();
  const rows = filterActivity(entries, {
    query,
    user: user === "all" ? undefined : user,
    module: module === "all" ? undefined : (module as ActivityModule),
    since,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => (setQuery(e.target.value), setShown(PAGE))}
            placeholder="Search activity…"
            aria-label="Search activity"
            className="h-10 pl-9"
          />
        </div>
        {[
          { label: "User", items: userItems, value: user, set: setUser },
          { label: "Module", items: moduleItems, value: module, set: setModule },
          { label: "Period", items: ranges, value: range, set: setRange },
        ].map((f) => (
          <Select key={f.label} items={f.items} value={f.value} onValueChange={(v) => v && (f.set(v), setShown(PAGE))}>
            <SelectTrigger aria-label={f.label} size="lg" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {f.items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {entries.length
            ? "No activity matches these filters."
            : "Nothing recorded yet. Sales, price changes, stock movements, expenses and account changes will show up here as they happen."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-[10px] border">
          <Table className="table-fixed">
            <TableHeader className="bg-secondary">
              <TableRow>
                <TableHead className="w-32 text-xs">Date &amp; time</TableHead>
                <TableHead className="hidden w-36 text-xs md:table-cell">User</TableHead>
                <TableHead className="w-40 text-xs">Activity</TableHead>
                <TableHead className="hidden w-28 text-xs sm:table-cell">Module</TableHead>
                <TableHead className="hidden w-44 text-xs lg:table-cell">Record</TableHead>
                <TableHead className="text-xs">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, shown).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground tabular-nums">{when(e.at)}</TableCell>
                  <TableCell className="hidden truncate md:table-cell">{e.user}</TableCell>
                  <TableCell className="truncate font-semibold">{e.action}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={moduleTone[e.module]}>{e.module}</Badge>
                  </TableCell>
                  <TableCell className="hidden truncate lg:table-cell" title={e.record}>
                    {e.record}
                  </TableCell>
                  <TableCell className="truncate text-muted-foreground" title={e.change}>
                    <span className="lg:hidden">{e.record} · </span>
                    {e.change ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {rows.length > shown && (
        <Button variant="outline" className="self-center" onClick={() => setShown(shown + PAGE)}>
          Show {Math.min(PAGE, rows.length - shown)} more
        </Button>
      )}
      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {Math.min(shown, rows.length)} of {rows.length} entries
        </p>
      )}
    </div>
  );
}
