import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";

export default function LoginPage() {
  const setSession = useAuthStore((state) => state.setSession);
  const baseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const setApiBaseUrl = useSettingsStore((state) => state.setApiBaseUrl);
  const [location] = useLocation();

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("next") || "/dashboard";
  }, []);

  const [token, setToken] = useState("");
  const [apiBase, setApiBase] = useState(baseUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      setApiBaseUrl(apiBase);
      const client = new ApiClient(apiBase);
      const profile = await client.getProfile(token.trim());
      setSession(token.trim(), profile);
      window.location.href = nextPath;
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
          <CardTitle>Login</CardTitle>
          <CardDescription>Authenticate using your backend API key (thc_...) or JWT token.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Backend URL</label>
              <Input value={apiBase} onChange={(e) => setApiBase(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API key or JWT</label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="thc_..." required />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Need onboarding help? <Link className="underline" href="/register">Go to register page</Link>.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
