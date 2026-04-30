import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { format, addMonths, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { calculerFactureFlotte, getPalier } from "@/lib/pricing";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Entreprise {
  id: string;
  nom: string;
  ville: string | null;
}

type TypePack = "pack_interieur" | "pack_standard" | "pack_vtc";

interface Ligne {
  id: string;
  typePack: TypePack;
  nbVehicules: number;
}

const PACK_LABELS: Record<TypePack, string> = {
  pack_interieur: "Pack Intérieur",
  pack_standard: "Pack Standard",
  pack_vtc: "Pack VTC",
};

const PACK_PASSAGES: Record<TypePack, number> = {
  pack_interieur: 2,
  pack_standard: 2,
  pack_vtc: 4,
};

const PACK_PRIX: Record<TypePack, number> = {
  pack_interieur: 100,
  pack_standard: 150,
  pack_vtc: 190,
};

const PALIER_BADGE: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  pro: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  business: "bg-primary/15 text-primary",
  premium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

const PALIER_LABEL: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

const PALIER_TAUX: Record<string, number> = {
  starter: 0,
  pro: 5,
  business: 12,
  premium: 20,
};

function defaultAnniversaire(start: Date): Date {
  // 1er du mois suivant + 12 mois
  const nextMonthFirst = startOfMonth(addMonths(start, 1));
  return addMonths(nextMonthFirst, 12);
}

function newLigne(): Ligne {
  return {
    id: crypto.randomUUID(),
    typePack: "pack_standard",
    nbVehicules: 1,
  };
}

const schema = z.object({
  entreprise_id: z.string().uuid("Sélectionnez une entreprise"),
  date_debut: z.date({ required_error: "Date de début requise" }),
  date_anniversaire: z.date({ required_error: "Date d'anniversaire requise" }),
  engagement_annuel: z.boolean(),
  mode_paiement: z.enum(["sepa", "virement", "cb_stripe"]),
  lignes: z
    .array(
      z.object({
        typePack: z.enum(["pack_interieur", "pack_standard", "pack_vtc"]),
        nbVehicules: z.number().int().min(1, "Min 1 véhicule"),
      })
    )
    .min(1, "Au moins une ligne de pack"),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

export function CreateContratDialog({ open, onOpenChange, onCreated }: Props) {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string>("");
  const [vehiculesActifs, setVehiculesActifs] = useState<number | null>(null);
  const [comboOpen, setComboOpen] = useState(false);

  const [lignes, setLignes] = useState<Ligne[]>([newLigne()]);
  const [engagementAnnuel, setEngagementAnnuel] = useState(false);
  const [dateDebut, setDateDebut] = useState<Date>(new Date());
  const [customAnniv, setCustomAnniv] = useState(false);
  const [dateAnniv, setDateAnniv] = useState<Date>(defaultAnniversaire(new Date()));
  const [modePaiement, setModePaiement] = useState<"sepa" | "virement" | "cb_stripe">("sepa");
  const [submitting, setSubmitting] = useState(false);

  const [debutOpen, setDebutOpen] = useState(false);
  const [annivOpen, setAnnivOpen] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setEntrepriseId("");
      setVehiculesActifs(null);
      setLignes([newLigne()]);
      setEngagementAnnuel(false);
      const d = new Date();
      setDateDebut(d);
      setDateAnniv(defaultAnniversaire(d));
      setCustomAnniv(false);
      setModePaiement("sepa");
    }
  }, [open]);

  // Auto-update anniversaire if not custom
  useEffect(() => {
    if (!customAnniv) {
      setDateAnniv(defaultAnniversaire(dateDebut));
    }
  }, [dateDebut, customAnniv]);

  // Load entreprises
  useEffect(() => {
    if (!open) return;
    supabase
      .from("entreprises")
      .select("id, nom, ville")
      .order("nom")
      .then(({ data }) => setEntreprises((data as Entreprise[]) ?? []));
  }, [open]);

  // Load vehicules count for selected entreprise
  useEffect(() => {
    if (!entrepriseId) {
      setVehiculesActifs(null);
      return;
    }
    supabase
      .from("vehicules")
      .select("id", { count: "exact", head: true })
      .eq("entreprise_id", entrepriseId)
      .eq("statut", "actif")
      .then(({ count }) => setVehiculesActifs(count ?? 0));
  }, [entrepriseId]);

  const facture = useMemo(() => {
    const valid = lignes.filter((l) => l.nbVehicules > 0);
    if (valid.length === 0) return null;
    return calculerFactureFlotte({
      lignes: valid.map((l) => ({ typePack: l.typePack, nbVehicules: l.nbVehicules })),
      engagementAnnuel,
    });
  }, [lignes, engagementAnnuel]);

  const totalVehicules = lignes.reduce((s, l) => s + (l.nbVehicules || 0), 0);
  const palier = totalVehicules > 0 ? getPalier(totalVehicules) : null;

  const addLigne = () => setLignes((l) => [...l, newLigne()]);
  const removeLigne = (id: string) =>
    setLignes((l) => (l.length > 1 ? l.filter((x) => x.id !== id) : l));
  const updateLigne = (id: string, patch: Partial<Ligne>) =>
    setLignes((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const generateNumeroContrat = async (debut: Date) => {
    const ym = format(debut, "yyyyMM");
    const prefix = `CT-${ym}-`;
    const { data } = await supabase
      .from("contrats")
      .select("numero_contrat")
      .like("numero_contrat", `${prefix}%`)
      .order("numero_contrat", { ascending: false })
      .limit(1);
    let next = 1;
    if (data && data.length > 0 && data[0].numero_contrat) {
      const last = data[0].numero_contrat as string;
      const n = parseInt(last.split("-").pop() || "0", 10);
      if (!isNaN(n)) next = n + 1;
    }
    return `${prefix}${String(next).padStart(4, "0")}`;
  };

  const handleSubmit = async () => {
    const parsed = schema.safeParse({
      entreprise_id: entrepriseId,
      date_debut: dateDebut,
      date_anniversaire: dateAnniv,
      engagement_annuel: engagementAnnuel,
      mode_paiement: modePaiement,
      lignes: lignes.map((l) => ({ typePack: l.typePack, nbVehicules: l.nbVehicules })),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }

    // Validate anniversaire >= debut + 11 months
    const minAnniv = addMonths(dateDebut, 11);
    if (dateAnniv < minAnniv) {
      toast.error("La date d'anniversaire doit être au moins 11 mois après le début.");
      return;
    }

    setSubmitting(true);
    try {
      const passagesMois = Math.max(...lignes.map((l) => PACK_PASSAGES[l.typePack]));
      const numero = await generateNumeroContrat(dateDebut);

      const { data: contrat, error: errContrat } = await supabase
        .from("contrats")
        .insert([
          {
            entreprise_id: entrepriseId,
            date_debut: format(dateDebut, "yyyy-MM-dd"),
            date_anniversaire: format(dateAnniv, "yyyy-MM-dd"),
            engagement_annuel: engagementAnnuel,
            mode_paiement: modePaiement,
            passages_mois: passagesMois,
            passages_restants_mois: passagesMois,
            statut: "actif",
            numero_contrat: numero,
          },
        ])
        .select("id, numero_contrat")
        .single();

      if (errContrat || !contrat) throw errContrat ?? new Error("Échec création contrat");

      const lignesPayload = lignes.map((l) => ({
        contrat_id: contrat.id,
        type_pack: l.typePack,
        nb_vehicules: l.nbVehicules,
        prix_unitaire_ht: PACK_PRIX[l.typePack],
        statut_ligne: "actif",
      }));

      const { error: errLignes } = await supabase.from("contrat_lignes").insert(lignesPayload);
      if (errLignes) throw errLignes;

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("admin_actions_log").insert({
        action: "creation_contrat",
        user_id: userData.user?.id ?? null,
        details: {
          contrat_id: contrat.id,
          entreprise_id: entrepriseId,
          palier,
          total_ht: facture?.totalAbonnementHt ?? 0,
        },
      });

      toast.success(`Contrat ${contrat.numero_contrat ?? ""} créé avec succès.`);
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEntreprise = entreprises.find((e) => e.id === entrepriseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau contrat</DialogTitle>
          <DialogDescription>
            Créez un contrat avec aperçu de facturation en temps réel.
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 mt-2">
          {/* FORM */}
          <div className="space-y-5">
            {/* Entreprise */}
            <div className="space-y-2">
              <Label>Entreprise</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedEntreprise
                      ? selectedEntreprise.nom
                      : "Sélectionner une entreprise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher..." />
                    <CommandList>
                      <CommandEmpty>Aucune entreprise.</CommandEmpty>
                      <CommandGroup>
                        {entreprises.map((e) => (
                          <CommandItem
                            key={e.id}
                            value={e.nom}
                            onSelect={() => {
                              setEntrepriseId(e.id);
                              setComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                entrepriseId === e.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span>{e.nom}</span>
                            {e.ville && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {e.ville}
                              </span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {vehiculesActifs !== null && (
                <p className="text-xs text-muted-foreground">
                  Cette entreprise a {vehiculesActifs} véhicule
                  {vehiculesActifs > 1 ? "s" : ""} actif{vehiculesActifs > 1 ? "s" : ""}.
                </p>
              )}
            </div>

            {/* Lignes de pack */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lignes de pack</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {lignes.map((l) => (
                  <div
                    key={l.id}
                    className="grid grid-cols-[1fr_100px_auto] gap-2 items-center"
                  >
                    <Select
                      value={l.typePack}
                      onValueChange={(v) =>
                        updateLigne(l.id, { typePack: v as TypePack })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pack_interieur">Pack Intérieur (100 €)</SelectItem>
                        <SelectItem value="pack_standard">Pack Standard (150 €)</SelectItem>
                        <SelectItem value="pack_vtc">Pack VTC (190 €)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={l.nbVehicules}
                      onChange={(e) =>
                        updateLigne(l.id, {
                          nbVehicules: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLigne(l.id)}
                      disabled={lignes.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Engagement annuel */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="engagement">Engagement annuel</Label>
                <p className="text-xs text-muted-foreground">-5% sur le total</p>
              </div>
              <Switch
                id="engagement"
                checked={engagementAnnuel}
                onCheckedChange={setEngagementAnnuel}
              />
            </div>

            {/* Dates */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Popover open={debutOpen} onOpenChange={setDebutOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateDebut, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateDebut}
                      onSelect={(d) => {
                        if (d) {
                          setDateDebut(d);
                          setDebutOpen(false);
                        }
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Date d'anniversaire</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setCustomAnniv((v) => !v)}
                  >
                    {customAnniv ? "Auto" : "Personnaliser"}
                  </Button>
                </div>
                {customAnniv ? (
                  <Popover open={annivOpen} onOpenChange={setAnnivOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dateAnniv, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateAnniv}
                        onSelect={(d) => {
                          if (d) {
                            setDateAnniv(d);
                            setAnnivOpen(false);
                          }
                        }}
                        disabled={(d) => d < addMonths(dateDebut, 11)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="h-9 flex items-center px-3 text-sm rounded-md border bg-muted/40 text-muted-foreground">
                    {format(dateAnniv, "dd/MM/yyyy")} (auto)
                  </div>
                )}
              </div>
            </div>

            {/* Mode paiement */}
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select
                value={modePaiement}
                onValueChange={(v) => setModePaiement(v as typeof modePaiement)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sepa">SEPA</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cb_stripe">CB Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* APERCU */}
          <div className="lg:sticky lg:top-0 self-start">
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
              <h3 className="font-semibold text-primary mb-3">Aperçu de facture</h3>
              {!facture ? (
                <p className="text-sm text-muted-foreground">
                  Ajoutez une ligne de pack pour voir l'aperçu de facture.
                </p>
              ) : (
                <>
                  {palier && (
                    <Badge className={cn("mb-3", PALIER_BADGE[palier])}>
                      Palier : {PALIER_LABEL[palier]} ({PALIER_TAUX[palier]}% de remise)
                    </Badge>
                  )}
                  <div className="space-y-1.5 text-sm">
                    {facture.lignesDetail
                      .filter((l) => l.type !== "total")
                      .map((l, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex justify-between gap-2",
                            l.type === "remise" && "text-primary"
                          )}
                        >
                          <span className="truncate">{l.label}</span>
                          <span className="tabular-nums shrink-0">
                            {l.montant.toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    <div className="border-t border-primary/30 mt-2 pt-2 flex justify-between font-bold text-base">
                      <span>Total HT</span>
                      <span className="tabular-nums">
                        {facture.totalAbonnementHt.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="izox" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Création..." : "Créer le contrat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
