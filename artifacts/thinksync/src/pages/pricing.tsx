import { CheckCircle2 } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePackagesQuery } from "@/lib/api/hooks";

export default function PricingPage() {
  const { data, isLoading, error } = usePackagesQuery();

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-semibold">Pricing & Packages</h1>
      <p className="mt-2 text-muted-foreground">Package catalog from /v1/packages.</p>

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-6 text-destructive">Failed to load packages: {(error as Error).message}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((pkg) => (
            <Card key={pkg.id} className={pkg.is_featured ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{pkg.name}</span>
                  {pkg.is_featured ? <Badge>featured</Badge> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-2xl font-bold">{pkg.display_price}</p>
                <p className="text-muted-foreground">Base: {pkg.token_amount.toLocaleString()} tokens</p>
                <p className="text-muted-foreground">Bonus: {pkg.bonus_tokens.toLocaleString()} tokens</p>
                <p className="text-muted-foreground">Total: {(pkg.token_amount + pkg.bonus_tokens).toLocaleString()} tokens</p>
                <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Instant activation after purchase
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
