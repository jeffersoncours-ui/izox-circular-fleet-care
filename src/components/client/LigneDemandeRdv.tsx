import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MessageCircle, XCircle, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface DemandeRdv {
  id: string;
  statut: string;
  creneaux_preferes: Array<{ date: string; plage: string }> | any;
  commentaires: string | null;
  nb_vehicules_rdv: number;
  created_at: string;
  refus_motif?: string | null;
  date_intervention_confirmee?: string | null;
}

interface LigneDemandeRdvProps {
  demande: DemandeRdv;
  grise?: boolean;
}

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  en_attente: {
    label: "En attente",
    className: "bg-orange-50 text-orange-700 border-orange-300",
  },
  confirmee: {
    label: "Confirmée",
    className: "bg-green-50 text-green-700 border-green-300",
  },
  refusee: {
    label: "Refusée",
    className: "bg-red-50 text-red-700 border-red-300",
  },
  annulee_client: {
    label: "Annulée",
    className: "bg-gray-50 text-gray-700 border-gray-300",
  },
};

function formatPlage(p: string) {
  if (p === "matin") return "Matin";
  if (p === "apres-midi") return "Après-midi";
  if (p === "soir") return "Soir";
  return p;
}

export function LigneDemandeRdv({ demande, grise }: LigneDemandeRdvProps) {
  const cfg = STATUT_CONFIG[demande.statut] ?? {
    label: demande.statut,
    className: "bg-gray-50 text-gray-700 border-gray-300",
  };
  const creneaux = Array.isArray(demande.creneaux_preferes)
    ? demande.creneaux_preferes
    : [];

  return (
    <Card className={cn("p-4 shadow-card", grise && "opacity-60")}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Demande RDV · {demande.nb_vehicules_rdv} véhicule
            {demande.nb_vehicules_rdv > 1 ? "s" : ""}
          </span>
        </div>
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      </div>

      {creneaux.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5 mb-2">
          {creneaux.map((c: any, i: number) => (
            <li key={i}>
              ·{" "}
              {c.date
                ? format(parseISO(c.date), "EEEE d MMM yyyy", { locale: fr })
                : "—"}{" "}
              — {formatPlage(c.plage)}
            </li>
          ))}
        </ul>
      )}

      {demande.commentaires && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-2">
          <MessageCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <p className="italic">{demande.commentaires}</p>
        </div>
      )}

      {demande.statut === "refusee" && demande.refus_motif && (
        <div className="flex items-start gap-1.5 text-xs text-red-700 italic">
          <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
          <p>Motif du refus : {demande.refus_motif}</p>
        </div>
      )}

      {demande.statut === "confirmee" && demande.date_intervention_confirmee && (
        <div className="flex items-center gap-1.5 text-xs text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          <p>
            Confirmé pour le{" "}
            {format(
              parseISO(demande.date_intervention_confirmee),
              "d MMM yyyy",
              { locale: fr },
            )}
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-2">
        Créée le{" "}
        {format(parseISO(demande.created_at), "d MMM yyyy", { locale: fr })}
      </p>
    </Card>
  );
}
