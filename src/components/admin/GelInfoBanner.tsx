import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Snowflake, Wrench, RotateCcw } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface GelInfoBannerProps {
  gelType: "programme" | "sinistre" | null;
  gelDateDebut: string | null;
  gelDateFin: string | null;
  gelCommentaire: string | null;
  gelNotifierClient: boolean;
  onReactivateClick: () => void;
}

export function GelInfoBanner({
  gelType,
  gelDateDebut,
  gelDateFin,
  gelCommentaire,
  gelNotifierClient,
  onReactivateClick,
}: GelInfoBannerProps) {
  const safeParseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    try {
      const parsed = parseISO(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };

  const dateDebutObj = safeParseDate(gelDateDebut);
  const dateFinObj = safeParseDate(gelDateFin);

  const dateDebutFormatee = dateDebutObj
    ? format(dateDebutObj, "d MMMM yyyy", { locale: fr })
    : null;
  const dateFinFormatee = dateFinObj
    ? format(dateFinObj, "d MMMM yyyy", { locale: fr })
    : null;

  const dureeJours =
    dateDebutObj && dateFinObj
      ? differenceInDays(dateFinObj, dateDebutObj) + 1
      : null;

  const periodeTexte =
    dateDebutFormatee && dateFinFormatee && dureeJours
      ? `Du ${dateDebutFormatee} au ${dateFinFormatee} (${dureeJours} jour${dureeJours > 1 ? "s" : ""})`
      : dateDebutFormatee && !gelDateFin
        ? `À partir du ${dateDebutFormatee} — durée indéterminée`
        : "Période non précisée";

  const typeLibelle = gelType === "sinistre" ? "Sinistre" : "Programmée";
  const TypeIcon = gelType === "sinistre" ? Wrench : Snowflake;
  const accentClasses =
    gelType === "sinistre"
      ? "border-l-muted-foreground bg-muted/30"
      : "border-l-primary bg-primary/5";

  return (
    <Card
      role="status"
      aria-live="polite"
      className={`mb-4 p-4 border-l-4 ${accentClasses}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="font-semibold text-sm">
              Contrat en veille temporaire
              <span className="text-muted-foreground font-normal ml-1.5">
                — {typeLibelle}
              </span>
            </h3>
          </div>

          <p className="text-sm text-muted-foreground mb-1">{periodeTexte}</p>

          {gelCommentaire && (
            <p className="text-sm italic text-foreground/80 mb-1">
              «&nbsp;{gelCommentaire}&nbsp;»
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Notification client :{" "}
            {gelNotifierClient
              ? "envoyée"
              : "non envoyée (gel administratif interne)"}
          </p>
        </div>

        <div className="shrink-0">
          <Button
            size="sm"
            variant="default"
            onClick={onReactivateClick}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réactiver maintenant
          </Button>
        </div>
      </div>
    </Card>
  );
}
