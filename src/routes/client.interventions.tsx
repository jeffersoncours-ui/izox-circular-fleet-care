import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, ShieldCheck, Download, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  zonesFor,
  CHECKLIST_INTERIEUR,
  CHECKLIST_EXTERIEUR,
  type TypePrestation,
  type Moment,
} from "@/lib/interventions";
import { toast } from "sonner";

export const Route = createFileRoute("/client/interventions")({
  component: ClientInterventions,
});

interface Item {
  id: string;
  type_prestation: TypePrestation;
  date_intervention: string | null;
  notes_operateur: string | null;
  checklist_interieur: Record<string, string | null>;
  checklist_exterieur: Record<string, string | null>;
  vehicules: { immatriculation: string; marque: string | null; modele: string | null } | null;
}

interface Photo {
  intervention_id: string;
  zone: string;
  moment: Moment;
  url: string;
  signedUrl: string | null;
}

function ClientInterventions() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [photosMap, setPhotosMap] = useState<Record<string, Photo[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.entreprise_id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("interventions")
        .select(
          "id, type_prestation, date_intervention, notes_operateur, checklist_interieur, checklist_exterieur, vehicules(immatriculation, marque, modele)"
        )
        .eq("statut", "validee")
        .order("date_intervention", { ascending: false });
      const list = (data as unknown as Item[]) || [];
      setItems(list);

      if (list.length > 0) {
        const ids = list.map((i) => i.id);
        const { data: ph } = await supabase
          .from("intervention_photos")
          .select("intervention_id, zone, moment, url")
          .in("intervention_id", ids);

        const map: Record<string, Photo[]> = {};
        for (const p of (ph as { intervention_id: string; zone: string; moment: Moment; url: string }[]) || []) {
          const { data: signed } = await supabase.storage
            .from("interventions")
            .createSignedUrl(p.url, 3600);
          (map[p.intervention_id] ||= []).push({ ...p, signedUrl: signed?.signedUrl ?? null });
        }
        setPhotosMap(map);
      }
      setLoading(false);
    })();
  }, [profile?.entreprise_id]);

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-4">Mes interventions</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center shadow-card border-border/60">
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucune intervention validée pour le moment.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((i) => {
            const photos = photosMap[i.id] || [];
            const isOpen = open === i.id;
            return (
              <Card key={i.id} className="shadow-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i.id)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">
                        {i.vehicules?.immatriculation || "—"}
                      </p>
                      <Badge variant="secondary" className="capitalize">
                        {i.type_prestation}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {[i.vehicules?.marque, i.vehicules?.modele].filter(Boolean).join(" ") || "—"}{" "}
                      ·{" "}
                      {i.date_intervention
                        ? new Date(i.date_intervention).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border space-y-4 pt-4">
                    <div className="rounded-lg bg-primary-soft border border-primary/20 p-3 flex items-start gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-primary font-medium">
                        Les vérifications pré-intervention ont été effectuées.
                      </p>
                    </div>

                    <div className="space-y-5">
                      {zonesFor(i.type_prestation).map((z) => {
                        const av = photos.find((p) => p.zone === z.key && p.moment === "avant");
                        const ap = photos.find((p) => p.zone === z.key && p.moment === "apres");
                        return (
                          <div key={z.key}>
                            <p className="font-semibold text-sm text-foreground mb-2">
                              {z.label}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <PhotoView label="Avant" url={av?.signedUrl ?? null} />
                              <PhotoView label="Après" url={ap?.signedUrl ?? null} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(i.type_prestation === "interieur" || i.type_prestation === "complet") && (
                      <Checklist title="Intérieur" defs={CHECKLIST_INTERIEUR} state={i.checklist_interieur} />
                    )}
                    {(i.type_prestation === "exterieur" || i.type_prestation === "complet") && (
                      <Checklist title="Extérieur" defs={CHECKLIST_EXTERIEUR} state={i.checklist_exterieur} />
                    )}

                    {i.notes_operateur && (
                      <div>
                        <p className="font-semibold text-sm text-foreground mb-1">Notes</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {i.notes_operateur}
                        </p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => toast.info("Export PDF disponible prochainement")}
                    >
                      <Download className="h-4 w-4 mr-2" /> Télécharger PDF
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhotoView({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted/40">
      {url ? (
        <img src={url} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          —
        </div>
      )}
      <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded">
        {label}
      </span>
    </div>
  );
}

function Checklist({
  title,
  defs,
  state,
}: {
  title: string;
  defs: { key: string; label: string }[];
  state: Record<string, string | null>;
}) {
  return (
    <div>
      <p className="font-semibold text-sm text-foreground mb-2">Prestations {title}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
        {defs.map((c) => {
          const ok = !!state?.[c.key];
          return (
            <li
              key={c.key}
              className={ok ? "text-foreground" : "text-muted-foreground"}
            >
              {ok ? "✓" : "○"} {c.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
