import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTransactionsQuery } from "@/lib/api/hooks";

export default function AdminTransactionsPage() {
  const [page, setPage] = useState(1);
  const [profileId, setProfileId] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useAdminTransactionsQuery({
    page, pageSize: 20, profileId: profileId || undefined, transactionType: transactionType || undefined, status: status || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Profile ID" className="max-w-sm" />
        <Input value={transactionType} onChange={(e) => setTransactionType(e.target.value)} placeholder="Transaction type" className="max-w-sm" />
        <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Status" className="max-w-sm" />
      </div>

      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
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
                    <TableHead>Profile ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.profile_id}</TableCell>
                      <TableCell><Badge variant="outline">{tx.transaction_type}</Badge></TableCell>
                      <TableCell>{tx.amount}</TableCell>
                      <TableCell>{tx.balance_after}</TableCell>
                      <TableCell><Badge variant={tx.status === "completed" ? "secondary" : "outline"}>{tx.status}</Badge></TableCell>
                      <TableCell>{tx.description || "-"}</TableCell>
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
