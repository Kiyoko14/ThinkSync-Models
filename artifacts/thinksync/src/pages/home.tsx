import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Sparkles, WalletCards } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <Container className="py-10 sm:py-16">
      <section className="space-y-6">
        <Badge variant="secondary">SiliconFlow Gateway</Badge>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
          AI API Gateway and Billing Platform
        </h1>
        <p className="max-w-2xl text-muted-foreground sm:text-lg">
          Production-ready model gateway powered by SiliconFlow.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/models" className="gap-2">
              Explore models
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" /> OpenAI-compatible API
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use /v1/chat/completions and /v1/models directly with your existing SDKs and workflows.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <WalletCards className="h-5 w-5" /> Usage + billing visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Track requests, token usage, package balance, and API key lifecycle from a single dashboard.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5" /> Secure access
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Authenticate with your existing API key/JWT and operate against protected backend endpoints.
          </CardContent>
        </Card>
      </section>
    </Container>
  );
}
