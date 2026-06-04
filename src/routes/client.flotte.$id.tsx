import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVehiculePhotoUrl } from "@/lib/vehicule-photo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Loader2, Pencil, Trash2, Gauge, BookOpen, Droplets, CalendarPlus, Snowflake, Clock, Calendar as CalendarIcon } from "lucide-react";

import { AddVehiculeDialog } from "@/components/client/AddVehiculeDialog";
import { getVehiculeIcon, getVehiculeLabel } from "@/components/client/VehiculeIcons";
import { supprimerVehicule } from "@/lib/supprimer-vehicule";
import {
  FacturationPrealableDialog,
  type FacturationPrealableState,
} from "@/components/admin/FacturationPrealableDialog";
import { CreerDemandeRdvDialog } from "@/components/client/CreerDemandeRdvDialog";
import { PACKS_CATALOG } from "@/lib/pricing";
import { DemanderGelDialog } from "@/components/client/DemanderGelDialog";
import { AnnulerDemandeDialog } from "@/components/client/AnnulerDemandeDialog";
import { LeverGelAnticipeDialog } from "@/components/client/LeverGelAnticipeDialog";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/client/flotte/$id")({
  component: VehiculeDetail,
});

interface Vehicule {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  type_vehicule: string | null;
  annee: number | null;
  couleur: string | null;
  kilometrage: number | null;
  notes: string | null;
  statut: string;
  photo_path: string | null;
  type_pack_souhaite: string | null;
  contrat_id: string | null;
}

function VehiculeDetail() {
  const { id } = useParams({ from: "/client/flotte/$id" });
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [billingState, setBillingState] = useState<FacturationPrealableState | null>(null);
  const [rdvOpen, setRdvOpen] = useState(false);
  const [gelOpen, setGelOpen] = useState(false);
  const [demandesGelActives, setDemandesGelActives] = useState<Array<{ id: string; statut: string; date_debut: string; date_fin_prevue: string; created_at: string }>>([]);
  const [quotaMensuel, setQuotaMensuel] = useState({ quota: 0, pris: 0, realises: 0 });
  const [annulerOpen, setAnnulerOpen] = useState(false);
  const [leverOpen, setLeverOpen] = useState(false);
  const [demandeCibleId, setDemandeCibleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vehicules")
      .select("id, immatriculation, marque, modele, type_vehicule, annee, couleur, kilometrage, notes, statut, photo_path, type_pack_souhaite, contrat_id")
      .eq("id", id)
      .maybeSingle();
    const v = (data as Vehicule) ?? null;
    setVehicule(v);
    setPhotoUrl(await getVehiculePhotoUrl(data?.photo_path));

    if (v) {
      const packInfo = PACKS_CATALOG[v.type_pack_souhaite as keyof typeof PACKS_CATALOG];
      const quota = packInfo?.nbPassages ?? 0;
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartISO = monthStart.toISOString().split("T")[0];
      // Next month start for the upper bound
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthISO = nextMonth.toISOString().split("T")[0];

      const [{ count: countInterventions }, { count: countDemandesEnAttente }, { count: countRealises }] = await Promise.all([
        supabase
          .from("interventions")
          .select("id", { count: "exact", head: true })
          .eq("vehicule_id", v.id)
          .in("statut", ["planifiee", "en_cours", "en_revision", "validee"])
          .gte("date_intervention", monthStartISO)
          .lt("date_intervention", nextMonthISO),
        supabase
          .from("demandes_rdv")
          .select("id", { count: "exact", head: true })
          .eq("statut", "en_attente")
          .contains("vehicule_ids", [v.id])
          .gte("created_at", monthStart.toISOString())
          .lt("created_at", nextMonth.toISOString()),
        supabase
          .from("interventions")
          .select("id", { count: "exact", head: true })
          .eq("vehicule_id", v.id)
          .eq("statut", "validee")
          .gte("date_intervention", monthStartISO)
          .lt("date_intervention", nextMonthISO),
      ]);
      const pris = (countInterventions ?? 0) + (countDemandesEnAttente ?? 0);
      setQuotaMensuel({ quota, pris, realises: countRealises ?? 0 });
    } else {
      setQuotaMensuel({ quota: 0, pris: 0, realises: 0 });
    }

    // Détecte les demandes de gel actives (en_attente / validee / active)
    if (v && profile?.entreprise_id) {
      const arrayFilter = `vehicule_ids.cs.{${v.id}}`;
      const orFilter = v.contrat_id
        ? `${arrayFilter},and(type_demande.eq.contrat,contrat_id.eq.${v.contrat_id})`
        : arrayFilter;
      const { data: gels } = await supabase
        .from("demandes_gel")
        .select("id, statut, date_debut, date_fin_prevue, created_at")
        .eq("entreprise_id", profile.entreprise_id)
        .in("statut", ["en_attente", "validee", "active"])
        .or(orFilter)
        .order("date_debut", { ascending: true });
      setDemandesGelActives((gels ?? []) as typeof demandesGelActives);
    } else {
      setDemandesGelActives([]);
    }
    setLoading(false);
  }, [id, profile?.entreprise_id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await supprimerVehicule(id);
    setDeleting(false);
    if (res.needsBilling) {
      setConfirmOpen(false);
      setBillingState(res.needsBilling);
      return;
    }
    if (res.done) {
      navigate({ to: "/client/flotte" });
    } else {
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!vehicule) {
    return (
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <Button asChild variant="outline" size="sm" className="mb-6">
          <Link to="/client/flotte">
            <ArrowLeft className="h-4 w-4" /> Retour à Ma flotte
          </Link>
        </Button>
        <p className="text-muted-foreground">Véhicule introuvable.</p>
      </div>
    );
  }

  const Icon = getVehiculeIcon(vehicule.type_vehicule);
  const typeLabel = getVehiculeLabel(vehicule.type_vehicule);
  const title = (vehicule.marque || vehicule.modele)
    ? `${vehicule.marque ?? ""} ${vehicule.modele ?? ""}`.trim()
    : "Véhicule";

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Button asChild variant="outline" size="sm" className="mb-6">
        <Link to="/client/flotte">
          <ArrowLeft className="h-4 w-4" /> Retour à Ma flotte
        </Link>
      </Button>

      <Card className="overflow-hidden shadow-card border-border/60 mb-5">
        <div className="aspect-[16/10] bg-muted flex items-center justify-center text-muted-foreground/60 relative overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt={vehicule.immatriculation} className="w-full h-full object-cover" />
          ) : (
            <Icon className="w-40 h-auto opacity-60" />
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-foreground leading-tight">{title}</h1>
              <p className="font-mono text-sm font-bold text-primary mt-1">{vehicule.immatriculation}</p>
            </div>
            {vehicule.statut !== "actif" && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 mt-1 ${
                vehicule.statut === "gele"
                  ? "bg-[#D5E2F6] text-[#2A6FDB] border border-[#B3C8EF]"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {vehicule.statut === "gele" ? "Gelé" : "En attente"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="text-[11px]">{typeLabel}</Badge>
          </div>
        </div>
      </Card>

      <Card className="p-5 shadow-card border-border/60 mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Informations</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Row label="Marque" value={vehicule.marque} />
          <Row label="Modèle" value={vehicule.modele} />
          <Row label="Immatriculation" value={vehicule.immatriculation} />
          <Row label="Type" value={typeLabel} />
          <Row label="Année" value={vehicule.annee != null ? String(vehicule.annee) : null} />
          <Row label="Couleur" value={vehicule.couleur} />
          <Row label="Kilométrage" value={vehicule.kilometrage != null ? `${vehicule.kilometrage.toLocaleString("fr-FR")} km` : null} />
        </dl>
        {vehicule.notes && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{vehicule.notes}</p>
          </div>
        )}
      </Card>

      {(vehicule.type_pack_souhaite || vehicule.contrat_id) && (
        <Card className="p-5 shadow-card border-border/60 mb-5">
          <h2 className="font-semibold text-foreground mb-3">Bonus inclus</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Gauge className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-foreground">Vérification pneus</span>
            </li>
            <li className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-foreground">Carnet entretien numérique</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bientôt disponible</p>
              </div>
            </li>
            {vehicule.type_pack_souhaite === "pack_vtc" && (
              <li className="flex items-start gap-3">
                <Droplets className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground">Lave-glace gratuit</span>
              </li>
            )}
          </ul>
        </Card>
      )}

      <Card className="p-5 shadow-card border-border/60 mb-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Passages ce mois
        </h3>
        {quotaMensuel.quota === 0 ? (
          <p className="text-sm text-muted-foreground">Pack non défini</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">
                  {quotaMensuel.pris}
                </span>
                <span className="text-xs text-muted-foreground">Pris</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-muted-foreground">
                  {quotaMensuel.realises}
                </span>
                <span className="text-xs text-muted-foreground">Réalisés</span>
              </div>
              <div className="flex flex-col">
                <span className={`text-2xl font-bold ${Math.max(0, quotaMensuel.quota - quotaMensuel.pris) === 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {Math.max(0, quotaMensuel.quota - quotaMensuel.pris)}
                </span>
                <span className="text-xs text-muted-foreground">Restants / {quotaMensuel.quota}</span>
              </div>
            </div>
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={() => navigate({ to: "/client/prestations" })}
            >
              Voir tous les rendez-vous →
            </Button>
          </>
        )}
      </Card>


      {(() => {
        const today = new Date();
        const fmt = (s: string) =>
          new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
        const gelEnCours = demandesGelActives.find(
          (d) =>
            d.statut === "active" &&
            new Date(d.date_debut) <= today &&
            new Date(d.date_fin_prevue) >= today,
        );
        const gelProgramme = demandesGelActives.find(
          (d) => d.statut === "validee" && new Date(d.date_debut) > today,
        );
        const demandeEnAttente = demandesGelActives.find((d) => d.statut === "en_attente");
        const hasAnyDemandeGel = !!(gelEnCours || gelProgramme || demandeEnAttente);

        let gelBtnLabel = "Demander un gel";
        if (gelEnCours) gelBtnLabel = "Véhicule actuellement en gel";
        else if (gelProgramme) gelBtnLabel = "Gel déjà programmé";
        else if (demandeEnAttente) gelBtnLabel = "Gel en cours de validation";

        return (
          <>
            {vehicule.contrat_id && vehicule.statut === "actif" && gelProgramme && (
              <div className="rounded-lg bg-[#D5E2F6] border border-[#B3C8EF] p-3 mb-2 text-xs text-[#1A4E9C]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CalendarIcon className="h-3.5 w-3.5" /> Gel programmé
                </div>
                <div className="mt-1 text-[#2A6FDB]">
                  Du {fmt(gelProgramme.date_debut)} au {fmt(gelProgramme.date_fin_prevue)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-[#B3C8EF] text-destructive hover:bg-destructive/5"
                  onClick={() => {
                    setDemandeCibleId(gelProgramme.id);
                    setAnnulerOpen(true);
                  }}
                >
                  Annuler le gel programmé
                </Button>
              </div>
            )}
            {vehicule.contrat_id && vehicule.statut === "actif" && demandeEnAttente && !gelProgramme && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-2 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Clock className="h-3.5 w-3.5" /> Demande de gel en attente de validation admin
                </div>
                <div className="mt-1 text-amber-700">
                  Créée le {fmt(demandeEnAttente.created_at)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-amber-200 text-destructive hover:bg-destructive/5"
                  onClick={() => {
                    setDemandeCibleId(demandeEnAttente.id);
                    setAnnulerOpen(true);
                  }}
                >
                  Annuler la demande de gel
                </Button>
              </div>
            )}
            {vehicule.statut === "gele" && gelEnCours && (
              <div className="rounded-lg bg-[#D5E2F6] border border-[#B3C8EF] p-3 mb-2 text-xs text-[#1A4E9C]">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Snowflake className="h-3.5 w-3.5" /> Gel en cours
                </div>
                <div className="mt-1 text-[#2A6FDB]">
                  Du {fmt(gelEnCours.date_debut)} au {fmt(gelEnCours.date_fin_prevue)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 border-[#B3C8EF] text-amber-700 hover:bg-amber-50"
                  onClick={() => {
                    setDemandeCibleId(gelEnCours.id);
                    setLeverOpen(true);
                  }}
                >
                  Mettre fin au gel anticipativement
                </Button>
              </div>
            )}

            {vehicule.contrat_id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                {vehicule.statut === "actif" ? (
                  <>
                    <Button variant="default" onClick={() => setRdvOpen(true)}>
                      <CalendarPlus className="h-4 w-4" /> Demander un RDV
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setGelOpen(true)}
                      disabled={hasAnyDemandeGel}
                    >
                      <Snowflake className="h-4 w-4" /> {gelBtnLabel}
                    </Button>
                  </>
                ) : vehicule.statut === "gele" ? (
                  <Button variant="outline" disabled>
                    RDV indisponible
                  </Button>
                ) : null}
              </div>
            )}
          </>
        );
      })()}

      <div className="flex gap-2">
        <Button variant="izox" className="flex-1" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
        <Button variant="destructive" className="flex-1" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
      </div>

      <CreerDemandeRdvDialog
        open={rdvOpen}
        onOpenChange={setRdvOpen}
        defaultVehiculeId={vehicule.id}
        onSubmitted={load}
      />

      {vehicule.contrat_id && profile?.entreprise_id && (
        <DemanderGelDialog
          open={gelOpen}
          onOpenChange={setGelOpen}
          contratId={vehicule.contrat_id}
          entrepriseId={profile.entreprise_id}
          defaultVehiculeId={vehicule.id}
          onSubmitted={load}
        />
      )}

      <AddVehiculeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onCreated={load}
        vehicule={vehicule}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le véhicule {vehicule.immatriculation} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AnnulerDemandeDialog
        open={annulerOpen}
        onOpenChange={setAnnulerOpen}
        demandeType="gel"
        demandeId={demandeCibleId ?? ""}
        onSuccess={load}
      />

      <LeverGelAnticipeDialog
        open={leverOpen}
        onOpenChange={setLeverOpen}
        demandeId={demandeCibleId ?? ""}
        onSuccess={load}
      />

      <FacturationPrealableDialog
        state={billingState}
        onClose={() => setBillingState(null)}
        onResolved={() => navigate({ to: "/client/flotte" })}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</dt>
      <dd className="text-foreground mt-0.5">{value || "—"}</dd>
    </div>
  );
}
