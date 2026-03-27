import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InsightsCardProps {
  insights: string[];
}

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Sparkles className="size-4 text-primary" />
        <CardTitle>Insights automáticos</CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length ? (
          <ul className="space-y-3 text-sm text-muted-foreground">
            {insights.map((insight) => (
              <li key={insight} className="rounded-lg border bg-muted/20 p-3">
                {insight}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no hay suficientes datos para generar insights útiles.</p>
        )}
      </CardContent>
    </Card>
  );
}
