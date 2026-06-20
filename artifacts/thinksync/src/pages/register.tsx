import { FormEvent, useState } from "react";
import { Link } from "wouter";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";

export default function RegisterPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const baseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const setApiBaseUrl = useSettingsStore((state) => state.setApiBaseUrl);

  const [apiBase, setApiBase] = useState(baseUrl);
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      setApiBaseUrl(apiBase);
      const client = new ApiClient(apiBase);
      const profile = await client.getProfile(token.trim());
      setSession(token.trim(), { ...profile, display_name: name || profile.display_name });
      setStatus("Account connected successfully. You can open dashboard now.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-10">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Register / Connect account</CardTitle>
          <CardDescription>This page connects your existing backend identity into the frontend session.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Valiyev" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Backend URL</label>
              <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API key or JWT</label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {status ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{status}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connecting..." : "Connect account"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            After connecting, continue to <Link className="underline" href="/dashboard">dashboard</Link>.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
