import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Enhanced StatCard with premium SaaS styling
export function StatCard({ 
  title, 
  value, 
  hint, 
  icon: Icon,
  trend,
  className 
}: { 
  title: string; 
  value: string; 
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground/70" />}
          {title}
          {trend && (
            <span className={cn(
              "ml-auto text-xs",
              trend === 'up' && "text-green-600 dark:text-green-400",
              trend === 'down' && "text-red-600 dark:text-red-400",
              trend === 'neutral' && "text-muted-foreground"
            )}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
