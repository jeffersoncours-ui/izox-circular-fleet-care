import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatutContrat =
  | "actif"
  | "en_attente_validation"
  | "resilie"
  | "en_cours_gel"
  | "suspendu";

type StatutVehicule =
  | "actif"
  | "en_attente_validation"
  | "remplace"
  | "archive"
  | "refuse"
  | "gele";

interface StatutBadgeProps {
  type: "contrat" | "vehicule";
  statut: string;
  size?: "sm" | "md";
  className?: string;
}

const CONFIG_CONTRAT: Record<StatutContrat, { label: string; className: string }> = {
  actif: { label: "Actif", className: "bg-green-50 text-green-700 border-green-300" },
  en_attente_validation: {
    label: "En attente",
    className: "bg-orange-50 text-orange-700 border-orange-300",
  },
  resilie: { label: "Résilié", className: "bg-red-50 text-red-700 border-red-300" },
  en_cours_gel: { label: "En gel", className: "bg-blue-50 text-blue-700 border-blue-300" },
  suspendu: { label: "Suspendu", className: "bg-gray-50 text-gray-700 border-gray-300" },
};

const CONFIG_VEHICULE: Record<StatutVehicule, { label: string; className: string }> = {
  actif: { label: "Actif", className: "bg-green-50 text-green-700 border-green-300" },
  en_attente_validation: {
    label: "En attente",
    className: "bg-orange-50 text-orange-700 border-orange-300",
  },
  remplace: { label: "Remplacé", className: "bg-gray-50 text-gray-700 border-gray-300" },
  archive: { label: "Archivé", className: "bg-gray-50 text-gray-700 border-gray-300" },
  refuse: { label: "Refusé", className: "bg-red-50 text-red-700 border-red-300" },
  gele: { label: "En gel", className: "bg-blue-50 text-blue-700 border-blue-300" },
};

export function StatutBadge({ type, statut, size = "md", className }: StatutBadgeProps) {
  const config =
    type === "contrat"
      ? CONFIG_CONTRAT[statut as StatutContrat]
      : CONFIG_VEHICULE[statut as StatutVehicule];

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {statut}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(config.className, size === "sm" && "text-xs px-2 py-0.5", className)}
    >
      {config.label}
    </Badge>
  );
}
