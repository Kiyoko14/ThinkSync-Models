import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { useModelsQuery } from "@/lib/api/hooks";
import { 
  Bot, 
  Zap, 
  Clock, 
  DollarSign, 
  Gauge, 
  Sparkles, 
  Code, 
  Globe, 
  Lightbulb,
  Loader2,
  Search,
  Tiers
} from "lucide-react";

// Category icon mapping
const getCategoryIcon = (providerName: string) => {
  const name = providerName.toLowerCase();
  if (name.includes('anthropic') || name.includes('claude')) return Sparkles;
  if (name.includes('openai') || name.includes('gpt')) return Bot;
  if (name.includes('code') || name.includes('coder')) return Code;
  if (name.includes('multilingual') || name.includes('translation')) return Globe;
  return Lightbulb;
};

// Format large numbers with K/M suffix
const formatNumber = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
};

// Format pricing
const formatPricing = (pricePerM: number) => {
  if (pricePerM === 0) return 'Free';
  if (pricePerM >= 1) return `$${pricePerM.toFixed(2)}/M`;
  return `$${pricePerM.toFixed(4)}/M`;
};

export default function ModelsPage() {
  const { data, isLoading, error } = useModelsQuery();

  // Group models by provider
  const modelsByProvider = data?.reduce((acc, model) => {
    const provider = model.provider_name;
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, typeof data>);

  // Get unique providers
  const providers = modelsByProvider ? Object.keys(modelsByProvider) : [];

  return (
    <Container className="py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Models</h1>
        <p className="mt-2 text-muted-foreground">
          Browse available AI models on ThinkSync Models. Choose the right model for your needs.
        </p>
      </div>

      {isLoading ? (
        // Loading skeleton
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : error ? (
        // Error state
        <Card className="border-destructive/20">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium">Failed to load models</p>
              <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      ) : !data || data.length === 0 ? (
        // Empty state
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No models available</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                There are no active models available at the moment. Please check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Models by provider
        <div className="space-y-10">
          {providers.map((provider) => {
            const providerModels = modelsByProvider[provider];
            const Icon = getCategoryIcon(provider);
            
            return (
              <div key={provider}>
                {/* Provider Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{provider}</h2>
                    <p className="text-sm text-muted-foreground">
                      {providerModels.length} model{providerModels.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>

                {/* Model Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {providerModels.map((model) => (
                    <ModelCard key={model.id} model={model} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}

// Individual Model Card Component
function ModelCard({ model }: { model: ReturnType<typeof useModelsQuery>['data'] extends (infer T)[] | undefined ? T : never }) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {model.display_name || model.id}
            </CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-2">
              {model.description || 'No description available'}
            </CardDescription>
          </div>
          <Badge variant={model.active ? "default" : "secondary"} className="shrink-0">
            {model.active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Context</span>
            <span className="ml-auto font-medium">{formatNumber(model.context_window)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>Max Output</span>
            <span className="ml-auto font-medium">{formatNumber(model.max_output_tokens)}</span>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            <span>RPM: {model.rate_limit_rpm}</span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            <span>TPM: {formatNumber(model.rate_limit_tpm)}</span>
          </div>
        </div>

        {/* Capabilities */}
        <div className="flex items-center gap-2 pt-2">
          {model.supports_streaming && (
            <Badge variant="outline" className="text-xs">Streaming</Badge>
          )}
          {model.supports_functions && (
            <Badge variant="outline" className="text-xs">Functions</Badge>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between pt-3 border-t text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">Input</span>
            <span className="font-medium">{formatPricing(model.pricing_input_per_m)}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span className="text-muted-foreground">Output</span>
            <span className="font-medium">{formatPricing(model.pricing_output_per_m)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Also export AlertCircle for error state
import { AlertCircle } from "lucide-react";