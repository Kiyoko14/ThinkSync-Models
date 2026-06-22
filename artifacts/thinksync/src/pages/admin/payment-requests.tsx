import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminPaymentRequestsQuery, useApprovePaymentRequestMutation, useRejectPaymentRequestMutation } from "@/lib/api/hooks";
import { toast } from "sonner";

export default function AdminPaymentRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const { data: requests, isLoading } = useAdminPaymentRequestsQuery(statusFilter);
  const approve = useApprovePaymentRequestMutation();
  const reject = useRejectPaymentRequestMutation();

  function handleApprove(id: string) {
    approve.mutate({ id }, {
      onSuccess: (res) => {
        toast.success(`Payment request approved. New balance: ${res.balance_after}`);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleReject(id: string) {
    reject.mutate({ id }, {
      onSuccess: () => toast.success("Payment request rejected"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Payment Requests</h1>
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "secondary" : "ghost"} size="sm" onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Requests</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requests || []).map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-xs">{req.user_id}</TableCell>
                    <TableCell>{req.amount}</TableCell>
                    <TableCell>{req.currency}</TableCell>
                    <TableCell>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        req.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        req.status === "approved" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }`}>{req.status}</span>
                    </TableCell>
                    <TableCell>{req.created_at ? new Date(req.created_at).toLocaleString() : "-"}</TableCell>
                    <TableCell>{req.admin_email || "-"}</TableCell>
                    <TableCell>
                      {req.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => handleApprove(req.id)}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(req.id)}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(requests || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No requests found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
