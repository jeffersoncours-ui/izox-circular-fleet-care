import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entrepriseId: string;
  currentCommercialId: string | null;
  onReassigned?: () => void;
}

export function ReassignCommercialDialog({
  open,
  onOpenChange,
  entrepriseId,
  currentCommercialId,
  onReassigned,
}: Props) {
  const [commerciaux, setCommerciaux] = useState<
    Array<{ id: string; prenom: string | null; nom: string | null }>
  >([]);
  const [selected, setSelected] = useState<string>(currentCommercialId ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(currentCommercialId ?? "");
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "commercial");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) {
        setCommerciaux([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, prenom, nom")
        .in("id", ids);
      setCommerciaux((profs as any) ?? []);
    })();
  }, [open, currentCommercialId]);

  const submit = async () => {
    if (!selected) {
      toast.error("Sélectionnez un commercial");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("reassigner_commercial", {
      p_entreprise_id: entrepriseId,
      p_nouveau_commercial_id: selected,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Commercial réassigné");
    onReassigned?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réassigner le commercial</DialogTitle>
          <DialogDescription>
            Choisir le nouveau commercial responsable de cette entreprise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 mt-2">
          <Label>Commercial</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {commerciaux.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {[c.prenom, c.nom].filter(Boolean).join(" ") || "Sans nom"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="izox" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
