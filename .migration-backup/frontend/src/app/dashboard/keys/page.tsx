"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useApiKeysQuery,
  useGenerateApiKeyMutation,
  useRevokeApiKeyMutation,
  useRotateApiKeyMutation,
} from "@/lib/api/hooks";

export default function DashboardKeysPage() {
  const { data } = useApiKeysQuery();
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
      {
        name,
        expiresInDays: typeof expiresInDays === "number" ? expiresInDays : undefined,
      },
      {
        onSuccess: (result) => {
          setLatestRawKey(result.raw_key);
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">API Keys</h1>

      <Card>
        <CardHeader>
          <CardTitle>Generate key</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]" onSubmit={onGenerate}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" required />
            <Input
              type="number"
              min={1}
              max={365}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value ? Number(e.target.value) : "")}
              placeholder="Expiry (days)"
            />
            <Button type="submit" disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </form>
          {latestRawKey ? (
            <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
              New key (shown once): <code>{latestRawKey}</code>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing keys</CardTitle>
        </CardHeader>
        <CardContent>
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
                  <TableCell>{key.key_prefix}</TableCell>
                  <TableCell>{key.name}</TableCell>
                  <TableCell>{key.status}</TableCell>
                  <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "-"}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => rotateMutation.mutate(key.id)}>
                      Rotate
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => revokeMutation.mutate(key.id)}>
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
