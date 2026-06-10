import { Snowflake, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  computeQuotaGelDecompose,
  type DemandeGelRow,
  type QuotaGelDecompose,
} from "@/lib/quota-gel";
import { useSupabaseQuery } from "@/lib/hooks/useSupabaseQuery";

interface Props {
  entrepriseId: string;
  dureeDemandeeJours?: number;
}

export function QuotaGelDecompose({ entrepriseId, dureeDemandeeJours = 0 }: Props) {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 365);
  const minISO = minDate.toISOString().split("T")[0];

  const { data: demandesGel } = useSupabaseQuery<DemandeGelRow[]>(
    async () =>
      await supabase
        .from("demandes_gel")
        .select("statut, date_debut, date_fin_prevue, date_fin_effective")
        .eq("entreprise_id", entrepriseId)
        .in("statut", ["en_attente", "validee", "active", "close"])
        .gte("date_debut", minISO),
    { defaultValue: [] },
    [entrepriseId]
  );

  const decompose = computeQuotaGelDecompose(demandesGel);

  const { joursActifs, joursProgrammes, total } = decompose;
  const apres = total + dureeDemandeeJours;
  const apresDepasse = apres > 90;
  const totalDepasse = total > 90;

  return (
    <Card className="bg-muted/30 p-3 border-border/60 shadow-none space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        Quota de gel — 12 mois glissants
      </p>
      <div className="flex items-center justify-between text-sm text-blue-700">
        <span className="flex items-center gap-1.5">
          <Snowflake className="h-3.5 w-3.5" /> En cours / écoulés
        </span>
        <span className="font-medium tabular-nums">{joursActifs} jours</span>
      </div>
      <div className="flex items-center justify-between text-sm text-orange-700">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> Programmés (futurs)
        </span>
        <span className="font-medium tabular-nums">{joursProgrammes} jours</span>
      </div>
      <div className="border-t border-border/60 pt-2 flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" /> Total engagé
        </span>
        <span className={totalDepasse ? "text-red-600 tabular-nums" : "tabular-nums"}>
          {total}/90 jours
        </span>
      </div>
      {dureeDemandeeJours > 0 && (
        <div className="text-xs text-muted-foreground">
          Après cette demande :{" "}
          <span className={apresDepasse ? "text-red-600 font-medium" : "font-medium"}>
            {apres}/90 jours
          </span>
          {apresDepasse && (
            <span className="block text-red-600 mt-0.5">
              Quota dépassé — demande non autorisée
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
