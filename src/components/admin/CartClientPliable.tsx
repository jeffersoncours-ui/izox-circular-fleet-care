import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ExternalLink, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export interface ClientResume {
  entreprise_id: string;
  nom: string;
  ville: string | null;
  commercial_id: string | null;
  commercial_nom: string | null;
  nb_vehicules_actifs: number;
  nb_vehicules_en_attente: number;
  nb_vehicules_total: number;
  contrat_statut: string | null;
  montant_net_mensuel: number | null;
}

interface Props {
  client: ClientResume;
  isOpen: boolean;
  onToggle: () => void;
  onAddVehicule: () => void;
  children?: React.ReactNode;
}

function ContratBadge({ statut }: { statut: string | null }) {
  if (statut === "actif")
    return (
      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-100">
        Actif
      </Badge>
    );
  if (statut === "en_attente_validation")
    return (
      <Badge className="bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-100">
        En attente
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Aucun
    </Badge>
  );
}

export function CartClientPliable({
  client,
  isOpen,
  onToggle,
  onAddVehicule,
  children,
}: Props) {
  return (
    <div className="rounded-lg border border-border/60 bg-card shadow-card overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_1fr_auto] gap-3 md:gap-4 items-center p-4 cursor-pointer hover:bg-muted/40 transition-colors"
      >
        {/* Gauche : nom + ville */}
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{client.nom}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {client.ville ?? "—"}
          </p>
        </div>

        {/* Centre : statut contrat + ventilation véhicules */}
        <div className="flex flex-col gap-1">
          <ContratBadge statut={client.contrat_statut} />
          <p className="text-xs text-muted-foreground">
            {client.nb_vehicules_actifs} actif{client.nb_vehicules_actifs > 1 ? "s" : ""}
            {client.nb_vehicules_en_attente > 0 && (
              <> · {client.nb_vehicules_en_attente} en attente</>
            )}
          </p>
        </div>

        {/* Droite : MRR + commercial */}
        <div className="md:text-right">
          <p className="font-bold text-lg text-foreground leading-tight">
            {formatCurrency(client.montant_net_mensuel)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">HT / mois</span>
          </p>
          {client.commercial_nom && client.commercial_nom.trim() && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {client.commercial_nom.trim()}
            </p>
          )}
        </div>

        {/* Chevron + action fiche */}
        <div className="flex items-center gap-1 justify-end">
          <Button
            asChild
            size="sm"
            variant="ghost"
            onClick={(e) => e.stopPropagation()}
            title="Voir la fiche client"
          >
            <Link to="/admin/clients/$id" params={{ id: client.entreprise_id }}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-border/60 bg-muted/20 p-4 space-y-2">
          {children}
          <div className="pt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onAddVehicule();
              }}
            >
              <Plus className="h-4 w-4" /> Ajouter un véhicule
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
