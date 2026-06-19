import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { FactureDocument } from "@/components/factures/FactureDocument";
import {
  type Facture,
  type FactureLigne,
  FACTURE_SELECT,
  STATUT_FACTURE,
} from "@/lib/factures";

export const Route = createFileRoute("/client/factures/$id")({
  component: FactureDetailClient,
});

function FactureDetailClient() {
  const { id } = useParams({ from: "/client/factures/$id" });
  const [facture, setFacture] = useState<Facture | null>(null);
  const [lignes, setLignes] = useState<FactureLigne[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // RLS : le client ne voit que ses factures emise/payee/annulee.
    const { data: f, error } = await supabase
      .from("factures")
      .select(FACTURE_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error || !f) {
      setFacture(null);
      setLoading(false);
      return;
    }

    const { data: l } = await supabase
      .from("factures_lignes")
      .select("id, ordre_affichage, type_ligne, libelle, quantite, prix_unitaire_ht, montant_ht, tva_taux")
      .eq("facture_id", id)
      .order("ordre_affichage", { ascending: true });

    setFacture(f as unknown as Facture);
    setLignes((l as FactureLigne[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="px-4 py-5 max-w-3xl mx-auto pb-24 flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  if (!facture) {
    return (
      <div className="px-4 py-5 max-w-2xl mx-auto pb-24 flex flex-col gap-4">
        <BackLink />
        <Card className="p-10 text-center shadow-card border-border/60">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
            <FileText className="h-5 w-5 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-foreground">Facture introuvable</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cette facture n'existe pas ou n'est pas accessible.
          </p>
        </Card>
      </div>
    );
  }

  const statut = STATUT_FACTURE[facture.statut];

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto pb-24 flex flex-col gap-4">
      {/* Barre d'actions — non imprimée */}
      <div className="no-print flex items-center justify-between gap-3 flex-wrap">
        <BackLink />
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statut.badge}`}
          >
            {statut.label}
          </span>
          <Button variant="izox" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      <FactureDocument facture={facture} lignes={lignes} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/client/documents"
      className="no-print inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      <ArrowLeft className="h-4 w-4" /> Mes documents
    </Link>
  );
}
