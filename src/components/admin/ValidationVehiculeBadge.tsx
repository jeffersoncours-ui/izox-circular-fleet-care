import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  vehiculeId: string;
  statut: string;
  createdBy: string | null;
  commercialSignataireId: string | null;
  variant?: "default" | "compact";
  onChanged?: () => void;
}

export function ValidationVehiculeBadge({
  vehiculeId,
  statut,
  createdBy,
  commercialSignataireId,
  variant = "default",
  onChanged,
}: Props) {
  const { user, profile } = useAuth();
  const role = profile?.role as string | undefined;
  const [validateOpen, setValidateOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [raison, setRaison] = useState("");
  const [createurRole, setCreateurRole] = useState<string | null>(null);

  useEffect(() => {
    if (!createdBy || statut !== "en_attente_validation") return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", createdBy)
        .maybeSingle();
      setCreateurRole((data?.role as string) ?? null);
    })();
  }, [createdBy, statut]);

  if (statut !== "en_attente_validation") return null;

  const canAct =
    role === "admin" ||
    role === "staff" ||
    (role === "commercial" && user?.id === commercialSignataireId);

  if (!canAct) {
    return (
      <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">
        <Clock className="h-3 w-3 mr-1" />
        En attente de validation
      </Badge>
    );
  }

  const peutRejeter = createurRole === "client";

  const handleValider = async () => {
    setSubmitting(true);
    const { error } = await supabase.rpc("valider_vehicule", {
      p_vehicule_id: vehiculeId,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Véhicule validé");
    setValidateOpen(false);
    onChanged?.();
  };

  const handleRejeter = async () => {
    if (raison.trim().length < 5) {
      toast.error("Raison obligatoire (min 5 caractères)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("rejeter_vehicule", {
      p_vehicule_id: vehiculeId,
      p_raison: raison.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Véhicule rejeté");
    setRejectOpen(false);
    setRaison("");
    onChanged?.();
  };

  const compact = variant === "compact";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">
        <Clock className="h-3 w-3 mr-1" />
        {compact ? "En attente" : "En attente de validation"}
      </Badge>
      {compact ? (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                onClick={() => setValidateOpen(true)}
                aria-label="Valider le véhicule"
              >
                <Check className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Valider le véhicule</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={!peutRejeter}
                  onClick={() => setRejectOpen(true)}
                  aria-label="Rejeter le véhicule"
                >
                  <X className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {peutRejeter ? "Rejeter le véhicule" : "Suppression standard requise"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <>
          <Button
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setValidateOpen(true)}
          >
            <Check className="h-4 w-4" /> Valider
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!peutRejeter}
            title={
              peutRejeter
                ? "Rejeter ce véhicule"
                : "Pour supprimer ce véhicule, utilisez la suppression standard"
            }
            onClick={() => setRejectOpen(true)}
          >
            <X className="h-4 w-4" /> Rejeter
          </Button>
        </>
      )}

      <AlertDialog open={validateOpen} onOpenChange={setValidateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le véhicule passera en statut actif et sera ajouté à la facturation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleValider();
              }}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le véhicule sera supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="raison">Raison du rejet * (min 5 caractères)</Label>
            <Textarea
              id="raison"
              rows={3}
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRejeter();
              }}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer le rejet"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
