import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLogsQuery } from "@/lib/api/hooks";

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [profileId, setProfileId] = useState("");
  const [modelSlug, setModelSlug] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useAdminLogsQuery({
    page, pageSize: 20,
    profileId: profileId || undefined,
    modelSlug: modelSlug || undefined,
    status: status || undefined,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Profile ID" className="max-w-xs" />
        <Input value={modelSlug} onChange={(e) => setModelSlug(e.target.value)} placeholder="Model slug" className="max-w-xs" />
        <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Status" className="max-w-xs" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="max-w-xs" />
      </div>

      <Card>
        <CardHeader><CardTitle>API Request Logs</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : error ? (
            <p className="text-destructive">{(error as Error).message}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Auth</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.created_at ? new Date(log.created_at).toLocaleString() : "-"}</TableCell>
                      <TableCell>{log.model_slug}</TableCell>
                      <TableCell>{log.auth_method}</TableCell>
                      <TableCell>{log.total_tokens.toLocaleString()}</TableCell>
                      <TableCell>${log.estimated_cost.toFixed(4)}</TableCell>
                      <TableCell>{log.duration_ms}ms</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "secondary" : "destructive"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {data?.meta.total_pages ?? 1} ({data?.meta.total ?? 0} total)</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page >= (data?.meta.total_pages ?? 1)}>Next</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
