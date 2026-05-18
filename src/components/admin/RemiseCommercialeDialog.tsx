import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contratId: string;
  montantBrut: number;
  remiseActuelle: number; // 0..0.20
  remisePalier: number; // 0..0.20
  onApplied?: () => void;
}

export function RemiseCommercialeDialog({
  open,
  onOpenChange,
  contratId,
  montantBrut,
  remiseActuelle,
  remisePalier,
  onApplied,
}: Props) {
  const [pct, setPct] = useState<number>(Math.round((remiseActuelle ?? 0) * 100));
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const remisePct = pct / 100;
  const facteurPalier = 1 - (remisePalier ?? 0);
  const facteurCom = 1 - remisePct;
  const facteurCombine = Math.max(0.7, facteurPalier * facteurCom);
  const nouveauNet = Math.round(montantBrut * facteurCombine * 100) / 100;

  const submit = async () => {
    if (pct > 0 && justification.trim().length < 10) {
      toast.error("Justification obligatoire (min 10 caractères)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("appliquer_remise_commerciale", {
      p_contrat_id: contratId,
      p_remise_pct: remisePct,
      p_justification: justification.trim() || "",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Remise commerciale appliquée (${pct}%)`);
    onApplied?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Remise commerciale</DialogTitle>
          <DialogDescription>
            Plafond 20%. Cumul avec la remise palier limité à 30% maximum (plancher
            facteur combiné 0.70).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Taux de remise</Label>
              <span className="font-mono text-lg font-semibold text-primary">
                {pct}%
              </span>
            </div>
            <Slider
              value={[pct]}
              min={0}
              max={20}
              step={1}
              onValueChange={(v) => setPct(v[0] ?? 0)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="just">Justification {pct > 0 && "*"}</Label>
            <Textarea
              id="just"
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Raison de la remise (min 10 caractères)"
            />
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm space-y-1">
            <p>
              Montant brut mensuel :{" "}
              <span className="tabular-nums font-medium">
                {montantBrut.toFixed(2)} €
              </span>
            </p>
            <p>
              Remise palier :{" "}
              <span className="tabular-nums">
                {Math.round((remisePalier ?? 0) * 100)}%
              </span>
            </p>
            <p>
              Facteur combiné :{" "}
              <span className="tabular-nums">{facteurCombine.toFixed(4)}</span>
            </p>
            <p className="text-base">
              Nouveau montant net :{" "}
              <span className="font-bold tabular-nums text-primary">
                {nouveauNet.toFixed(2)} €
              </span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="izox" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
