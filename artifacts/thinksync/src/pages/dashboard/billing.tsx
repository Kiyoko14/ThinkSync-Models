import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBillingQuery, useTransactionsQuery, usePaymentRequestsQuery, useCreatePaymentRequestMutation } from "@/lib/api/hooks";
import { toast } from "sonner";
import { Wallet, CreditCard, Activity, Plus, Upload, ArrowRight } from "lucide-react";

export default function DashboardBillingPage() {
  const billing = useBillingQuery();
  const transactions = useTransactionsQuery();
  const paymentRequests = usePaymentRequestsQuery();
  const createPaymentRequest = useCreatePaymentRequestMutation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [screenshotUrl, setScreenshotUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      toast.error("Invalid amount");
      return;
    }
    createPaymentRequest.mutate(
      { amount: num, currency, screenshot_url: screenshotUrl || undefined },
      {
        onSuccess: () => {
          toast.success("Payment request submitted!");
          setAmount("");
          setScreenshotUrl("");
          setStep(1);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  const balance = (billing.data?.balance ?? 0) / 100;
  const totalSpent = (billing.data?.total_spent ?? 0) / 100;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Billing</h1>
      
      {/* Stats Grid - Responsive */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-800 dark:text-green-200">${balance.toFixed(2)}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">Available for API calls</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">${totalSpent.toFixed(2)}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">All time usage</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Activity className="h-4 w-4" /> API Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">{billing.data?.total_requests ?? 0}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Total requests made</p>
          </CardContent>
        </Card>
      </div>

      {/* Deposit Flow - Step by Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Funds
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step Indicators */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>{s}</div>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Amount */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">How much would you like to deposit?</label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      placeholder="Amount in USD" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)}
                      className="text-lg"
                    />
                    <Button type="button" onClick={() => {
                      if (!amount || Number(amount) <= 0) {
                        toast.error("Please enter an amount");
                        return;
                      }
                      setStep(2);
                    }} className="gap-2">
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Minimum deposit: $1.00</p>
                </div>
              </div>
            )}

            {/* Step 2: Payment Instructions */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">Amount to deposit: <span className="text-primary">${amount}</span></p>
                  <p className="text-sm text-muted-foreground">Transfer to the card below, then proceed to upload your receipt.</p>
                </div>
                <div className="grid gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button type="button" onClick={() => setStep(3)} className="gap-2">
                    I've made the payment <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Submit */}
            {step === 3 && (
              <div className="space-y-4">
                <Input 
                  placeholder="Screenshot URL (optional)" 
                  value={screenshotUrl} 
                  onChange={(e) => setScreenshotUrl(e.target.value)} 
                />
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button type="submit" disabled={createPaymentRequest.isPending} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {createPaymentRequest.isPending ? "Submitting..." : "Submit Payment Request"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Your payment will be reviewed within 24 hours.</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Payment Requests */}
      <Card>
        <CardHeader><CardTitle>Payment Requests</CardTitle></CardHeader>
        <CardContent>
          {paymentRequests.data?.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No payment requests yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Make a deposit to add funds to your wallet.</p>
              <Button onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}>
                <Plus className="h-4 w-4 mr-2" /> Make a Deposit
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      <TableCell className="font-medium">${pr.amount}</TableCell>
                      <TableCell>{pr.currency}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          pr.status === "pending" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          pr.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}>{pr.status}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{pr.created_at ? new Date(pr.created_at).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
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
