import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "@tanstack/react-router";

export interface PrestationItem {
  id: string;
  statut: string;
  type_prestation: string;
  date_intervention: string | null;
  demande_rdv_id?: string | null;
  vehicules: {
    immatriculation: string;
    marque: string | null;
    modele: string | null;
  } | null;
}

interface LignePrestationProps {
  item: PrestationItem;
  variant: "planifiee" | "validee";
}

export function LignePrestation({ item, variant }: LignePrestationProps) {
  const date = item.date_intervention
    ? format(parseISO(item.date_intervention), "EEEE d MMM yyyy", { locale: fr })
    : "—";
  const vehLabel = [item.vehicules?.marque, item.vehicules?.modele]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {variant === "planifiee" ? (
              <Calendar className="h-4 w-4 text-blue-600" />
            ) : (
              <Wrench className="h-4 w-4 text-green-600" />
            )}
            <p className="font-semibold text-sm">
              {item.vehicules?.immatriculation || "—"}
            </p>
            <Badge variant="secondary" className="capitalize">
              {item.type_prestation}
            </Badge>
            {variant === "planifiee" && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-300"
              >
                Planifiée
              </Badge>
            )}
            {variant === "validee" && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-300"
              >
                Terminée
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {vehLabel || "—"} · {date}
          </p>
        </div>
      </div>
    </Card>
  );
}
