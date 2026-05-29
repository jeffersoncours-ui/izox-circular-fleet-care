import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateCoefficient, type ImpactCoefficient } from "@/lib/impact";

const ESRS_OPTIONS = ["E1", "E2", "E3", "E5"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coefficient: ImpactCoefficient | null;
  onSaved?: () => void;
}

export function ImpactCoefficientDialog({ open, onOpenChange, coefficient, onSaved }: Props) {
  const [label, setLabel]       = useState("");
  const [value, setValue]       = useState("");
  const [unit, setUnit]         = useState("");
  const [source, setSource]     = useState("");
  const [esrs, setEsrs]         = useState("");
  const [active, setActive]     = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!coefficient) return;
    setLabel(coefficient.label);
    setValue(String(coefficient.value));
    setUnit(coefficient.unit);
    setSource(coefficient.source ?? "");
    setEsrs(coefficient.esrs_topic ?? "");
    setActive(coefficient.active);
  }, [coefficient]);

  const handleSave = async () => {
    if (!coefficient) return;
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) { toast.error("Valeur numérique invalide"); return; }
    if (!label.trim()) { toast.error("Libellé obligatoire"); return; }
    setSaving(true);
    try {
      await updateCoefficient(coefficient.id, {
        label: label.trim(),
        value: num,
        unit: unit.trim(),
        source: source.trim() || null,
        esrs_topic: esrs || null,
        active,
      });
      toast.success("Coefficient mis à jour");
      onOpenChange(false);
      onSaved?.();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (!coefficient) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Éditer le coefficient</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{coefficient.code}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="coeff-label">Libellé</Label>
            <Input id="coeff-label" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="coeff-value">Valeur / prestation</Label>
              <Input id="coeff-value" type="number" min="0" step="any"
                value={value} onChange={(e) => setValue(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="coeff-unit">Unité</Label>
              <Input id="coeff-unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="coeff-esrs">Topic ESRS/CSRD</Label>
            <select id="coeff-esrs" value={esrs}
              onChange={(e) => setEsrs(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="">— non défini —</option>
              {ESRS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <Label htmlFor="coeff-source">Source</Label>
            <Input id="coeff-source" placeholder="ex: ADEME Base Empreinte v23"
              value={source} onChange={(e) => setSource(e.target.value)} className="mt-1" />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="coeff-active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="coeff-active">Coefficient actif (utilisé dans les nouveaux calculs)</Label>
          </div>
          {!active && (
            <p className="text-xs text-amber-600">
              ⚠️ Les calculs en cours et passés ne sont PAS affectés (grâce au snapshot JSONB).
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
