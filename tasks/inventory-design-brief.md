# IZOX — Inventaire complet des pages et brief design
*Généré le 2026-06-03 — Session 13*

---

## Résumé exécutif

Application B2B SaaS de gestion de flottes automobiles (nettoyage éco-responsable) organisée en **3 portails** + auth + settings :

| Portail | URL | Rôles | Description |
|---------|-----|-------|-------------|
| Admin | `/admin` | admin, staff, commercial | Gestion complète |
| Client | `/client` | client | Self-service |
| Terrain | `/terrain` | operateur, admin | Exécution |
| Auth | `/login`, `/reset-password` | tous | Authentification |
| Settings | `/settings` | tous | Paramètres perso |

---

## PORTAIL AUTHENTIFICATION

### `/login`
- **But** : Authentification + récupération mot de passe
- **Sections** : Logo, formulaire email/mdp, section "mot de passe oublié" (email uniquement), lien support
- **CTAs** : Se connecter · Envoyer le lien · Retour connexion
- **Données** : Aucune (statique)
- **Dialogs** : Aucun

### `/reset-password`
- **But** : Définir un nouveau mot de passe (depuis lien email)
- **Sections** : Logo, formulaire nouveau mdp + confirmation, états erreur (lien expiré)
- **CTAs** : Définir mon mot de passe · Retour connexion (si erreur)
- **Données** : Token hash dans URL
- **Dialogs** : Aucun

---

## PORTAIL ADMIN `/admin`
*Layout : sidebar nav (desktop) + header mobile*

### `/admin` — Dashboard
- **But** : Vue d'ensemble KPIs + raccourcis
- **Sections** : Salutation, grille 4 KPIs (Clients actifs, Véhicules, RDV à venir, Interventions du mois), cartes raccourcis
- **CTAs** : Cartes KPI cliquables → sous-pages
- **Données** : counts entreprises, vehicules, stats planning

### `/admin/clients` — Liste clients
- **But** : Annuaire des entreprises clientes
- **Sections** : Header (titre + count), barre recherche, grille cartes clients (logo, nom, ville, email, badges type+statut)
- **CTAs** : Nouveau client (dialog) · Clic carte → fiche
- **Données** : `v_entreprises_actives`
- **Dialogs** : CreateClientDialog

### `/admin/clients/$id` — Fiche client
- **But** : Dossier complet d'un client
- **Sections** : Header (nom, badges), infos contact, onglets Véhicules / Contrats / Factures* / Interventions*
- **Onglet Véhicules** : grille groupée par statut (actif/gel/attente), actions par ligne
- **Onglet Contrats** : liste contrats avec palier/véhicules/mensualité, accordéon détail
- **CTAs** : Ajouter véhicule · Modifier entreprise · Reset MDP · Archiver · Réassigner commercial
- **Données** : entreprises, vehicules, contrats, profiles
- **Dialogs** : AddVehiculeDialog · EditEntrepriseDialog · ArchiverEntrepriseDialog · ReassignCommercialDialog · FacturationPrealableDialog

### `/admin/vehicules` — Tous les véhicules
- **But** : Vue transversale de tous les véhicules, filtrée par client
- **Sections** : Header (stats totales + MRR), filtres (recherche, statut, commercial, tri), liste clients pliables (accordion)
- **Chaque client expand** : lignes véhicules (photo, immat, pack, statut, actions)
- **CTAs** : Expand client · Ajouter véhicule · Clic véhicule → fiche
- **Données** : `v_entreprises_vehicules_resume`, vehicules lazy-loaded
- **Dialogs** : AddVehiculeDialog

### `/admin/vehicules/$id` — Fiche véhicule
- **But** : Détail complet + gestion gel + actions
- **Sections** : Photo grande, header (marque/immat/badges), cards Entreprise / Infos / Bonus inclus / État gel
- **CTAs** : Geler · Modifier · Supprimer · Lever le gel (si actif)
- **Données** : vehicules, entreprises, contrats, storage URL
- **Dialogs** : GelerVehiculeAdminDialog · AddVehiculeDialog (edit) · AlertDialog · FacturationPrealableDialog

### `/admin/contrats` — Liste contrats
- **But** : Tous les contrats avec actions rapides
- **Sections** : Header (count par statut), filtres, tableau desktop / cartes mobile
- **Colonnes** : Entreprise · Packs · Véh. actifs · Palier · Mensualité HT · Passages restants · Statut · Actions
- **CTAs** : Voir · Mettre en veille · Réactiver · Résilier
- **Données** : contrats + entreprise + lignes + vehicules counts
- **Dialogs** : ResiliationContratDialog · GelContratDialog · ReactiverContratDialog

### `/admin/contrats/$id` — Fiche contrat
- **But** : Détail contrat + véhicules + historique + actions
- **Sections** : Header (numéro + lien client + statut), bannière gel si actif, onglets Infos / Véhicules / Historique / Factures*
- **Onglet Infos** : dates, mode paiement, mensualité (grande), palier badge, remise, breakdown lignes
- **Onglet Véhicules** : actifs + demandes en attente (valider/refuser)
- **Onglet Historique** : timeline avec icônes, dates, auteurs
- **CTAs** : Mettre en veille · Réactiver · Résilier · Modifier la remise · Valider/Refuser véhicule
- **Données** : contrats, vehicules, admin_actions_log, profiles
- **Dialogs** : ResiliationContratDialog · GelContratDialog · ReactiverContratDialog · RemiseCommercialeDialog · ValidateVehiculeDialog · RefuseVehiculeDialog

### `/admin/planning` — Hub Planning & RDV
*3 sous-onglets, 1 seule page*

**Onglet Demandes** (tous rôles admin) :
- **But** : Gérer les demandes RDV entrantes
- **Sections** : Filtres statut, liste cartes demandes (client, véhicules, créneaux demandés, statut)
- **CTAs** : Clic carte → dialog contextuel (en_attente → AssignerRdvDialog, confirmee → GererRdvConfirmeDialog)
- **Données** : demandes_rdv + vehicules + entreprises

**Onglet Planning** (admin only) :
- **But** : Calendrier visuel des interventions par opérateur/créneau
- **Sections** : Sélecteur semaine, grille opérateur × créneaux, blocs interventions cliquables
- **CTAs** : Clic bloc → fiche intervention
- **Données** : operators, interventions planifiées

**Onglet Interventions** (tous rôles admin) :
- **But** : Suivi toutes interventions
- **Sections** : Filtres statut, liste avec badges couleur, clic → fiche
- **CTAs** : Clic ligne → `/admin/interventions/$id`
- **Données** : interventions + vehicules + entreprises

### `/admin/planning/map` — Carte routes (admin only)
- **But** : Visualisation géographique interventions du jour
- **Sections** : Carte Leaflet, marqueurs par opérateur, légende
- **CTAs** : Retour planning
- **Données** : interventions du jour avec GPS

### `/admin/demandes-gel` — Demandes de gel
- **But** : Traiter demandes gel contrats/véhicules clients
- **Sections** : Header (count en attente), filtre statut, liste cartes (entreprise, type, dates, quota, statut)
- **CTAs** : Clic carte en_attente → GererDemandeGelDialog
- **Données** : `v_demandes_gel_with_quota`
- **Dialogs** : GererDemandeGelDialog

### `/admin/interventions/$id` — Fiche intervention (review)
- **But** : Valider ou refuser une prestation soumise par l'opérateur
- **Sections** : Planification (opérateur + date + lieu), contrôle pré-intervention, photos avant/après par zone, checklists int./ext., notes, signature client
- **CTAs** : Valider (→ statut validee + emails + impact) · Refuser avec motif
- **Données** : interventions, intervention_photos, operators (via storage signedURLs)
- **Dialogs** : Dialog motif refus inline

### `/admin/equipe` — Équipe (placeholder)
- Card "Bientôt disponible"

### `/admin/facturation` — Facturation (placeholder, admin only)
- Card "Bientôt disponible"

### `/admin/impact` — Impact RSE
- **But** : Gérer coefficients + valider records d'impact
- **Sections** : Onglets Coefficients / File de validation
- **Tab Coefficients** : table (code, label, catégorie, valeur, unité, ESRS, source), edit
- **Tab Validation** : records en attente (intervention, quantités, catégories), bouton AR
- **CTAs** : Modifier coefficient · Accuser réception
- **Données** : impact_coefficients, impact_records

---

## PORTAIL CLIENT `/client`
*Layout : header top + contenu + bottom nav mobile*

### `/client` — Dashboard
- **But** : Vue d'ensemble + accès rapide
- **Sections** : Bannière passages reportés (si applicable), salutation, grille 4 KPIs (Véhicules, Prochain RDV, Dernière prestation, Palier), card Impact RSE, card Mon compte
- **CTAs** : KPIs cliquables · Impact RSE · Modifier mes infos · Changer mdp
- **Données** : vehicules count, contrats (palier), demandes_rdv (prochain), interventions (dernier)
- **Dialogs** : ChangePasswordDialog · EditMyInfoDialog

### `/client/flotte` — Ma flotte
- **But** : Liste de mes véhicules
- **Sections** : Bannière passages, header (count + bouton ajouter), groupes par statut (actifs / gelés / en attente), chaque véhicule = ligne cliquable (immat, pack, statut)
- **CTAs** : Ajouter véhicule · Clic véhicule → fiche
- **Données** : vehicules (filtrés par entreprise)
- **Dialogs** : AddVehiculeDialog

### `/client/flotte/$id` — Fiche véhicule
- **But** : Détail + actions RDV + gel
- **Sections** : Photo grande, header (marque/immat/badges), cards Infos / Packs+Bonus / Quota mensuel / Demandes gel actives
- **CTAs** : Modifier · Supprimer · Demander un RDV · Demander un gel · Annuler (gel) · Lever anticipé (gel actif)
- **Données** : vehicules, interventions (quota), demandes_rdv, demandes_gel, contrats
- **Dialogs** : AddVehiculeDialog (edit) · CreerDemandeRdvDialog · DemanderGelDialog · AnnulerDemandeDialog · LeverGelAnticipeDialog · FacturationPrealableDialog · AlertDialog

### `/client/prestations` — Mes prestations
- **But** : Historique RDV et interventions
- **Sections** : Bannière passages, onglets (Prochains RDV / Historique), filtres statut, cartes par item
- **CTAs** : Clic item → détail (dialog ou inline)
- **Données** : demandes_rdv + interventions (enterprise-wide)
- **Dialogs** : DetailDemandeRdvDialog

### `/client/contrats/$id` — Mon contrat
- **But** : Détail contrat (vue lecture)
- **Sections** : Numéro, statut, infos (dates/mode paiement/passages), véhicules couverts, packs, mensualité
- **Données** : contrats, vehicules, lignes

### `/client/documents` — Documents (placeholder)
- Card "Aucun document partagé"

### `/client/factures` — Factures (placeholder)
- Card "Aucune facture disponible"

### `/client/impact` — Mon impact RSE
- **But** : Visualiser l'impact environnemental de mes prestations
- **Sections** : Header, onglets Résumé / Détails
- **Tab Résumé** : 4 KPIs (Eau économisée, Pollution évitée, Compost, GHG), filtres période + véhicule
- **Tab Détails** : graphe temporel area chart, liste records, export CSV
- **CTAs** : Période filter · Véhicule filter · Export CSV
- **Données** : impact_records, impact_coefficients

---

## PORTAIL TERRAIN `/terrain`
*Layout : fullscreen mobile-first, pas de sidebar*

### `/terrain` — Dashboard opérateur
*4 onglets : Planning | Interventions | Suivi | Profil*

**Tab Planning** :
- Calendrier interventions assignées (groupées par date), clic → fiche
- Données : interventions assigned to operator

**Tab Interventions** :
- Liste toutes interventions avec filtres statut, clic → `/terrain/intervention/$id`
- Données : interventions assigned to operator (tous statuts)

**Tab Suivi** :
- Stats interventions réalisées ce mois, timeline actions récentes

**Tab Profil** :
- Infos opérateur (nom, email, tel), bouton Déconnexion

### `/terrain/intervention/$id` — Stepper intervention
- **But** : Formulaire multi-étapes pour exécuter et soumettre une prestation
- **Étapes** :
  1. Info + prise en charge (date, lieu, véhicule, CTA "Commencer")
  2. Avant (photos avant par zone, checklists, contrôles objets/dégradations/clés)
  3. Pendant (notes opérateur, checklist détaillée)
  4. Après (photos après, signature client)
  5. Résumé + soumettre
- **CTAs** : Next / Back · Commencer (RPC prendre_en_charge) · Soumettre final
- **Données** : interventions, vehicules, entreprises + upload Storage
- **Dialogs** : Aucun (stepper fullscreen)

---

## PORTAIL SETTINGS `/settings`
*Accessible à tous les rôles*

### `/settings/security`
- Lien vers 2FA

### `/settings/security/2fa`
- Setup TOTP (QR code, code vérification, codes récupération)
- CTAs : Activer 2FA · Back

---

## MATRICE RELATIONS INTER-PORTAILS

### Flux principal : RDV → Intervention → Validation

```
CLIENT /client/flotte/$id
  → CreerDemandeRdvDialog (INSERT demandes_rdv, statut=en_attente)
    ↓
ADMIN /admin/planning (onglet Demandes)
  → AssignerRdvDialog (RPC assigner_rdv → INSERT interventions, statut=planifiee)
  → Email "rdv_confirmee" → CLIENT
    ↓
OPÉRATEUR /terrain/intervention/$id
  → Stepper : prise en charge → photos/checklists → signature → soumettre
  → UPDATE interventions, statut=en_revision
    ↓
ADMIN /admin/interventions/$id
  → Valider (statut=validee) → Email "intervention_close" → CLIENT + generateImpactRecords()
  → Refuser (renvoie à opérateur, statut=en_cours)
    ↓
CLIENT /client/impact
  → Voir impact RSE cumulé
```

### Flux gel véhicule

```
CLIENT /client/flotte/$id
  → DemanderGelDialog (INSERT demandes_gel, statut=en_attente)
    ↓
ADMIN /admin/demandes-gel
  → GererDemandeGelDialog (Valider / Refuser)
  → Email "gel_validee" → CLIENT
  → Cron quotidien active le gel à date_debut
    ↓
CLIENT /client/flotte/$id → peut lever anticipé
ADMIN /admin/vehicules/$id → peut lever directement (annuler_gel_vehicule_admin)
```

### Tableau miroirs fonctionnels

| Fonctionnalité | Admin | Client | Terrain |
|----------------|-------|--------|---------|
| Voir planning | `/admin/planning` board | `/client/prestations` timeline | `/terrain` tab Planning |
| Ajouter véhicule | `/admin/clients/$id` | `/client/flotte` | — |
| Modifier véhicule | `/admin/vehicules/$id` | `/client/flotte/$id` | — |
| Demander RDV | Assigne directement | `/client/flotte/$id` | — |
| Exécuter prestation | — | — | `/terrain/intervention/$id` |
| Valider prestation | `/admin/interventions/$id` | — | — |
| Voir impact RSE | `/admin/impact` (coefficients + AR) | `/client/impact` (résumé + chart) | — |
| Geler véhicule | `/admin/vehicules/$id` (direct) | `/client/flotte/$id` (demande) | — |
| Changer mdp | Via fiche client (admin-reset-password) | `/client` → ChangePasswordDialog | `/settings/security` |

### Entités partagées (DB)

| Entité | Admin | Client | Terrain |
|--------|-------|--------|---------|
| entreprises | CRUD | Read (own) | Read (linked) |
| vehicules | CRUD + validation | CRUD (own) | Read (assigned) |
| contrats | Read + actions | Read (own) | — |
| demandes_rdv | Assign + schedule | Create + Cancel | Read (assigned) |
| interventions | Validate/refuse | Read | Create + Fill |
| demandes_gel | Validate/refuse | Create + Cancel | — |
| impact_records | Create (auto) + AR | Read (own) | — |

---

## PAGES PLACEHOLDER (à développer)

| Page | Portail | Statut |
|------|---------|--------|
| `/admin/facturation` | Admin | Placeholder "Bientôt" |
| `/admin/equipe` | Admin | Placeholder "Bientôt" |
| `/admin/clients/$id` onglet Factures | Admin | "Bientôt disponible" |
| `/admin/clients/$id` onglet Interventions | Admin | "Bientôt disponible" |
| `/admin/contrats/$id` onglet Factures | Admin | "Bientôt disponible" |
| `/client/documents` | Client | Placeholder vide |
| `/client/factures` | Client | Placeholder vide |

---

## NOTES POUR CLAUDE DESIGN

**Priorités redesign suggérées (3 portails, ordre recommandé) :**
1. `/admin` — le plus complexe, le plus utilisé par l'équipe IZOX
2. `/client` — interface client finale (important pour l'expérience B2B)
3. `/terrain` — déjà refondu en session 10, peut servir de référence design

**Contraintes techniques :**
- Mobile-first obligatoire pour `/terrain` (opérateurs en déplacement)
- `/admin/planning` a une vue desktop (board calendrier) ET une vue mobile (liste jours)
- Photos signées via Supabase Storage (TTL 1h) — pas de CDN direct
- Bottom nav mobile sur `/client`, sidebar desktop sur `/admin`

**Statuts visuels à harmoniser :**
- Interventions : `planifiee` (bleu) · `en_cours` (jaune) · `en_revision` (ambre) · `validee` (vert) · `refusee` (rouge) · `annulee` (gris)
- Contrats : `actif` · `gelé` · `résilié`
- Véhicules : `actif` · `gele` · `en_attente_validation` · `resilie`
- Demandes RDV : `en_attente` · `confirmee` · `refusee` · `annulee` · `annulee_admin`
- Demandes gel : `en_attente` · `validee` · `active` · `close` · `refusee` · `annulee`
