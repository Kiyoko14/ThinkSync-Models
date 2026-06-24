import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApiKeysQuery, useGenerateApiKeyMutation, useRevokeApiKeyMutation, useRotateApiKeyMutation } from "@/lib/api/hooks";
import { toast } from "sonner";
import { Copy, RefreshCw, Trash2, Plus, AlertTriangle } from "lucide-react";

export default function DashboardKeysPage() {
  const { data, isLoading } = useApiKeysQuery();
  const generateMutation = useGenerateApiKeyMutation();
  const revokeMutation = useRevokeApiKeyMutation();
  const rotateMutation = useRotateApiKeyMutation();

  const [name, setName] = useState("web-client");
  const [expiresInDays, setExpiresInDays] = useState<number | "">("");
  const [latestRawKey, setLatestRawKey] = useState<string | null>(null);

  function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLatestRawKey(null);
    generateMutation.mutate(
      { name, expiresInDays: typeof expiresInDays === "number" ? expiresInDays : undefined },
      { onSuccess: (result) => {
        setLatestRawKey(result.raw_key);
        toast.success("API key created successfully");
      }}
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">API Keys</h1>

      <Card>
        <CardHeader><CardTitle>Generate new key</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_120px_auto]" onSubmit={onGenerate}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name (e.g., web-client)" required />
            <Input type="number" min={1} max={365} value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : "")} placeholder="Days" />
            <Button type="submit" disabled={generateMutation.isPending} className="gap-2">
              <Plus className="h-4 w-4" />
              {generateMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
          {latestRawKey && (
            <div className="mt-4 rounded-lg border-2 border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-amber-800 dark:text-amber-200">This key will only be shown once!</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Copy and save it now — you won't be able to see it again.</p>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <code className="flex-1 break-all text-sm bg-white dark:bg-black px-3 py-2 rounded border border-amber-200 dark:border-amber-800">
                      {latestRawKey}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(latestRawKey)} className="gap-2 whitespace-nowrap">
                      <Copy className="h-4 w-4" /> Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your API Keys</CardTitle></CardHeader>
        <CardContent>
          {/* Empty State */}
          {data?.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first API key to start making requests.</p>
              <Button onClick={() => document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })}>
                <Plus className="h-4 w-4 mr-2" /> Create API Key
              </Button>
            </div>
          )}

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{key.key_prefix}</code></TableCell>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        key.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                      }`}>{key.status}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "Never"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => rotateMutation.mutate(key.id)} disabled={rotateMutation.isPending}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Rotate
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          if (confirm("Are you sure you want to revoke this key? This action cannot be undone.")) {
                            revokeMutation.mutate(key.id);
                          }
                        }} disabled={revokeMutation.isPending}>
                          <Trash2 className="h-3 w-3 mr-1" /> Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards - Hidden on desktop */}
          <div className="md:hidden space-y-3">
            {data?.map((key) => (
              <div key={key.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{key.name}</p>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{key.key_prefix}••••••</code>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    key.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                  }`}>{key.status}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {key.last_used_at ? `Last used: ${new Date(key.last_used_at).toLocaleString()}` : "Never used"}
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => rotateMutation.mutate(key.id)} disabled={rotateMutation.isPending}>
                    <RefreshCw className="h-3 w-3 mr-1" /> Rotate
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => {
                    if (confirm("Revoke this key?")) revokeMutation.mutate(key.id);
                  }} disabled={revokeMutation.isPending}>
                    <Trash2 className="h-3 w-3 mr-1" /> Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
