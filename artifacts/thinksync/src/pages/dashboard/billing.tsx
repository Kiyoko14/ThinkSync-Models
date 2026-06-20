import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBalanceQuery, usePackagesQuery, useTransactionsQuery } from "@/lib/api/hooks";

export default function DashboardBillingPage() {
  const balance = useBalanceQuery();
  const transactions = useTransactionsQuery();
  const packages = usePackagesQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Wallet balance</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{balance.data?.balance ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Package tokens</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{balance.data?.active_package_tokens ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total available</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{balance.data?.total_available ?? 0}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Current packages</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {packages.data?.map((pkg) => (
              <div key={pkg.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{pkg.name}</p>
                <p className="text-muted-foreground">{pkg.display_price}</p>
                <p className="text-muted-foreground">{(pkg.token_amount + pkg.bonus_tokens).toLocaleString()} tokens</p>
              </div>
            ))}
          </div>
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
