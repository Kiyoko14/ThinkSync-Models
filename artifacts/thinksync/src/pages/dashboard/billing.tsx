import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillingQuery, useTransactionsQuery, usePaymentRequestsQuery, useCreatePaymentRequestMutation } from "@/lib/api/hooks";
import { toast } from "sonner";

export default function DashboardBillingPage() {
  const billing = useBillingQuery();
  const transactions = useTransactionsQuery();
  const paymentRequests = usePaymentRequestsQuery();
  const createPaymentRequest = useCreatePaymentRequestMutation();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [screenshotUrl, setScreenshotUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    createPaymentRequest.mutate(
      { amount: num, currency, screenshot_url: screenshotUrl || undefined },
      {
        onSuccess: () => {
          toast.success("Payment request submitted");
          setAmount("");
          setScreenshotUrl("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Wallet balance</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">${(billing.data?.balance ?? 0) / 100}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total spent</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">${(billing.data?.total_spent ?? 0) / 100}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total requests</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{billing.data?.total_requests ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payment request</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input type="number" placeholder="Amount (cents)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
                <option value="USD">USD</option>
                <option value="UZS">UZS</option>
              </select>
              <Input placeholder="Screenshot URL (optional)" value={screenshotUrl} onChange={(e) => setScreenshotUrl(e.target.value)} />
            </div>
            <Button type="submit" disabled={createPaymentRequest.isPending}>Submit payment request</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(paymentRequests.data || []).map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell>{pr.amount}</TableCell>
                  <TableCell>{pr.currency}</TableCell>
                  <TableCell>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      pr.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      pr.status === "approved" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>{pr.status}</span>
                  </TableCell>
                  <TableCell>{pr.created_at ? new Date(pr.created_at).toLocaleString() : "-"}</TableCell>
                </TableRow>
              ))}
              {(paymentRequests.data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No payment requests</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance after</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.data?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>{tx.transaction_type}</TableCell>
                  <TableCell>{tx.amount}</TableCell>
                  <TableCell>{tx.balance_after}</TableCell>
                  <TableCell>{tx.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
