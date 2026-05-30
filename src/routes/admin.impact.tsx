import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchImpactCoefficients, CATEGORY_META, type ImpactCoefficient } from "@/lib/impact";

export const Route = createFileRoute("/admin/impact")({
  component: AdminImpactPage,
});

function AdminImpactPage() {
  const [coeffs, setCoeffs] = useState<ImpactCoefficient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpactCoefficients()
      .then(setCoeffs)
      .catch((e: unknown) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Leaf className="h-7 w-7 text-primary" /> Impact RSE
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Coefficients d'impact appliqués à chaque prestation validée.
          L'impact est calculé automatiquement — pas de validation manuelle requise.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center mt-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="overflow-hidden border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Libellé</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Catégorie</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Valeur</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Unité</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">ESRS</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {coeffs.map((c) => {
                  const meta = CATEGORY_META[c.category];
                  return (
                    <tr key={c.code}>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.code}</td>
                      <td className="px-4 py-3 font-medium">{c.label}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" style={{ color: meta?.color, borderColor: meta?.color }}>
                          {meta?.label ?? c.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{c.value}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.unit}</td>
                      <td className="px-4 py-3">
                        {c.esrs_topic
                          ? <Badge variant="outline" className="text-xs">{c.esrs_topic}</Badge>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{c.source ?? "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
