import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { useModelsQuery } from "@/lib/api/hooks";

export default function ModelsPage() {
  const { data, isLoading, error } = useModelsQuery();

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-semibold">Models</h1>
      <p className="mt-2 text-muted-foreground">Active models exposed by your FastAPI backend.</p>

      {isLoading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-destructive">Failed to load models: {(error as Error).message}</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((model) => (
            <Card key={model.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>{model.id}</span>
                  <Badge variant={model.active ? "secondary" : "outline"}>{model.active ? "active" : "inactive"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Provider: {model.owned_by}</p>
                <p>Context: {model.context_window.toLocaleString()} tokens</p>
                <p>Max output: {model.max_output_tokens.toLocaleString()} tokens</p>
                <p>Input: ${model.pricing_input_per_m}/1M</p>
                <p>Output: ${model.pricing_output_per_m}/1M</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
