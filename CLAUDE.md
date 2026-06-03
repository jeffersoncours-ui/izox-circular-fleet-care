# IZOX — Circular Fleet Care

Application de gestion de flotte automobile (nettoyage éco-responsable).
Stack : TanStack Start (SSR) + Supabase + Vercel + Resend.

---

## Lecture obligatoire à chaque session

- **`tasks/todo.md`** — tâches en cours et backlog
- **`tasks/lessons.md`** — erreurs passées et leçons apprises, à consulter avant de coder

---

## Principes de travail (System Instructions)

### 1. Principes fondamentaux
- **Simplicité** : solution la plus simple et efficace. Minimum de code et de complexité architecturale.
- **Pas de patches** : chercher la cause racine, pas le contournement. Standard ingénieur senior.
- **Impact minimal** : modifier uniquement ce qui est nécessaire. Éviter les bugs régressifs et les effets de bord.

### 2. Planification
- Pour toute tâche non triviale (3+ étapes ou changement architectural) : écrire le plan dans `tasks/todo.md` avant de coder.
- Si l'exécution dévie du plan : STOP, réévaluer, re-planifier. Ne pas forcer une approche qui échoue.

### 3. Exécution
- Utiliser des subagents pour la recherche, l'analyse parallèle et les tâches exploratoires (garder le contexte principal propre).
- Corriger les erreurs CI/CD de manière autonome : analyser les logs, tracer les erreurs, résoudre sans demander d'aide.

### 4. Qualité
- **Vérification avant "terminé"** : jamais marquer une tâche comme faite sans preuve empirique (logs, tests, démo).
- **Auto-correction** : relire son travail avant de le présenter. Question : "Un staff engineer approuverait-il ça ?"
- **Validation empirique obligatoire** : après toute implémentation (migration SQL, RPC, RLS, composant) et **avant** de présenter les résultats, effectuer des tests réels :
  1. Tester en base via MCP `execute_sql` : appeler les RPCs, vérifier les RLS, contrôler les données retournées.
  2. Créer les données de test nécessaires (valeurs temporaires) pour le cas nominal, les cas limites, et les cas d'erreur attendus (ex. : contrainte violée, accès refusé).
  3. **Mettre la conception en défaut** : tester ce qui ne devrait *pas* fonctionner (ex. : double prise en charge → EXCEPTION ? Opérateur sans liaison → bloqué ?).
  4. Nettoyer les données de test après, sauf si elles sont utiles aux tests manuels de l'utilisateur.
  5. Inclure les résultats (requêtes SQL, valeurs retournées) dans la réponse comme preuve.

### 5. Amélioration continue
- Après toute correction de l'utilisateur : mettre à jour `tasks/lessons.md` immédiatement.
- Développer des règles pour prévenir les erreurs récurrentes.

### 6. Workflow tâches
1. Écrire le plan dans `tasks/todo.md` avec des items actionnables et cochables
2. Marquer les items comme terminés au fil de l'avancement
3. Ajouter une section "Review" à `tasks/todo.md` à la fin
4. Mettre à jour `tasks/lessons.md` avec les enseignements clés

### 7. Purge obligatoire avant chaque merge sur main

**Règle absolue : l'application doit toujours être mergée dans un état vierge de données de test.**

Avant tout merge sur `main`, exécuter via MCP `execute_sql` la purge complète dans cet ordre :

```sql
-- Tables de données métier (ordre FK)
DELETE FROM notifications_internes;
DELETE FROM operateur_observations;
DELETE FROM admin_actions_log;
DELETE FROM email_logs;
DELETE FROM intervention_photos;
DELETE FROM interventions;
DELETE FROM demandes_rdv;
DELETE FROM demandes_gel;
DELETE FROM factures_lignes;
DELETE FROM factures;
DELETE FROM avoirs;
DELETE FROM contrat_sequences;
DELETE FROM contrat_avenants;
DELETE FROM contrat_lignes;
DELETE FROM contrats;
DELETE FROM vehicules;
UPDATE profiles SET entreprise_id = NULL WHERE entreprise_id IS NOT NULL;
DELETE FROM entreprises;
-- Supprimer aussi les comptes client (role='client') de auth.users
DELETE FROM profiles WHERE role = 'client';
DELETE FROM auth.users WHERE id IN (
  SELECT id FROM auth.users
  WHERE email NOT IN (
    'admin.test@izox.fr',
    'staff.test@izox.fr',
    'commercial.test@izox.fr',
    'operateur.test@izox.fr'
  )
);
```

**Comptes à conserver impérativement (4 comptes techniques) :**
- `admin.test@izox.fr` → admin
- `staff.test@izox.fr` → staff
- `commercial.test@izox.fr` → commercial
- `operateur.test@izox.fr` → operateur

**Le compte client est toujours recréé depuis l'interface admin** (`/admin` → "Créer un compte client") en début de chaque cycle de test — il ne doit jamais être hardcodé ici.

Vérifier après purge que toutes les tables sont à 0 et que `SELECT COUNT(*) FROM auth.users` retourne exactement 4.

---

## Infos projet critiques

- **Supabase project ID** : `kddoyjbfvaakfbegzjyt` (région eu-west-3)
- **Vercel team** : `team_p96xUWAJNjEQKceK3ukiU2gK`
- **App URL** : `https://izox-circular-fleet-care.vercel.app`
- **Email provider** : Resend (domaine `izox.fr` vérifié OVH avec DKIM/SPF/DMARC)
- **Email from** : `IZOX <noreply@izox.fr>` — variable env `EMAIL_FROM`

## Architecture auth

Supabase Auth avec flow **implicit** (pas PKCE — confirmé dans les logs).

- `isRecovery` géré dans `src/lib/auth-context.tsx` via `detectAuthCallback()`
- Les liens de reset/invite redirigent vers `/reset-password` (page dédiée)
- `/reset-password` est dans la liste des redirect URLs Supabase (à maintenir)

### Rôles utilisateurs
`admin` | `staff` | `commercial` → `/admin`
`operateur` → `/terrain`
`client` → `/client`

## Edge functions Supabase

| Fonction | JWT | Usage |
|---|---|---|
| `request-password-reset` | non (public) | "Mot de passe oublié" côté login |
| `admin-reset-password` | oui (admin only) | Reset depuis la fiche client admin |
| `create-client-account` | oui (admin/staff) | Création entreprise + compte client |
| `geocode-address` | oui (authenticated) | Géocodage Nominatim — retourne `{latitude, longitude}` depuis `{adresse, ville, code_postal}` |

Toutes envoient les emails via l'API HTTP Resend (pas SMTP natif Supabase — SMTP était cassé "535 Authentication credentials invalid").
`geocode-address` : appel Nominatim server-side (User-Agent `IZOX-CircularFleetCare/1.0`), fire-and-forget côté client — ne bloque jamais la création de demande.

Logs d'envoi dans la table `email_logs` (type, target_id, email_to, status, error_message).

## Architecture pricing

Deux catalogues à garder **toujours synchronisés** :

| Source | Fichier | Utilisé par |
|--------|---------|-------------|
| Frontend | `src/lib/pricing.ts` → `PACKS_CATALOG` | Calculs UI, aperçu facture, `calculerFactureFlotte()` |
| DB | `prestations_catalogue` | RPCs Supabase (`valider_vehicule`, `appliquer_remise_commerciale`) |

Prix V2 (mai 2026) : **pack_interieur=130€, pack_standard=170€, pack_vtc=240€** (HT).

- `montant_brut_mensuel` / `montant_net_mensuel` en DB = cache calculé par les RPCs. Ne pas les afficher directement : calculer dynamiquement depuis `facture.*` pour éviter les dérives.
- Tout changement de tarif → migration SQL sur `prestations_catalogue` + mise à jour `PACKS_CATALOG`.

## Points de vigilance

- **Ne pas utiliser le SMTP natif Supabase** — toujours passer par les edge functions + Resend
- **`routeTree.gen.ts`** est auto-généré par TanStack Router au build — ne pas modifier manuellement en production
- **Variables d'env Supabase** nécessaires : `RESEND_API_KEY`, `SITE_URL`, `EMAIL_FROM`
- **Scanner email Microsoft Defender** : fait des requêtes HEAD sur les liens Supabase `/verify` (retourne 405, n'invalide pas le token)
- Les tokens de récupération sont à **usage unique** et expirent après 24h
- **Routes admin-only** (`/admin/planning`, `/admin/planning/map`, `/admin/equipe`, `/admin/facturation`) : protégées par `RoleGuard allowed={["admin"]}` en plus du filtre sidebar — ne jamais se fier au seul masquage UI
- **Lien "Retour" dans `/settings`** : utiliser `rolePath(profile?.role)` — `/settings` est accessible à tous les rôles, hardcoder `/admin` casserait la nav operateur/client
- **`getPackLabel(type)`** depuis `@/lib/pricing` : toujours l'utiliser pour afficher un type de pack. Ne jamais afficher le code brut (`pack_standard`) avec CSS `capitalize`.
- **Types Supabase** (`src/integrations/supabase/types.ts`) : régénérer via MCP `generate_typescript_types` après toute migration qui touche au schéma. Le fichier généré arrive sous forme JSON `{"types":"..."}` — extraire le contenu TS avec `python3 -c "import json; ..."`.
- **`admin.interventions.tsx` = layout pur** : `component: () => <Outlet/>`, PAS de `beforeLoad`. Le redirect `/admin/planning` est dans `admin.interventions.index.tsx` (path exact). Un `beforeLoad` dans le parent s'applique aussi à `$id` → fiches non cliquables. Même pattern que `admin.planning.tsx` / `admin.planning.index.tsx`.
- **Emails RDV** : types supportés dans `src/lib/email.ts` → `"rdv_confirmee"` | `"rdv_annule_client"` | `"rdv_annule_admin"` | `"rdv_modifie"`. Edge function `send-email` v9 gère tous ces types.

## Architecture gel véhicule

Deux mécanismes coexistent — **ne pas les confondre** :

| Acteur | Mécanisme | Table | RPC |
|--------|-----------|-------|-----|
| Client | Demande → validation admin | `demandes_gel` | `demander_gel` / `valider_gel` |
| Admin | Action directe (immédiate ou programmée) | `vehicules.gel_admin_*` | `geler_vehicule_admin` / `annuler_gel_vehicule_admin` |

Colonnes admin sur `vehicules` : `gel_admin_date_debut`, `gel_admin_date_fin`, `gel_admin_motif`.
- `gel_admin_date_debut IS NOT NULL` + `statut='actif'` → gel programmé (pas encore actif)
- `gel_admin_date_debut IS NOT NULL` + `statut='gele'` → gel actif

Le cron `cron_maintenance_quotidienne()` active/expire automatiquement les gels admin (et les gels clients via `demandes_gel`). Toujours étendre cette fonction pour toute nouvelle automatisation quotidienne.

## Architecture planning & RDV

Les 3 onglets admin `Rendez-vous`, `Planning` et `Interventions` ont été fusionnés
en **un seul onglet** hébergé sur `/admin/planning`, avec 3 sous-onglets :

| Sous-onglet | Composant | Accès | Rôle |
|---|---|---|---|
| Demandes | `DemandesRdvList` | tous rôles admin | gérer les demandes RDV entrantes |
| Planning (board) | `PlanningCalendar` | **admin only** | drag-drop interventions par opérateur/créneau |
| Interventions | `InterventionsListPanel` | tous rôles admin | suivi des fiches d'intervention |

- Carte des routes : `/admin/planning/map` (`RouteMap`, admin only).
- Le param `?demande=<uuid>` ouvre automatiquement une demande (`useAutoOpenFromSearch`) — à préserver.
- `/admin/rendez-vous`, `/admin/interventions`, `/admin/demandes-rdv` redirigent vers l'onglet unifié (compat liens).

### Flow RDV admin — `AssignerRdvDialog`

**`AssignerRdvDialog`** (`src/components/admin/AssignerRdvDialog.tsx`) est le seul dialog admin pour traiter une demande **en_attente** :
- Affiche : créneaux demandés par le client, lieu d'intervention, commentaires
- **Créneau verrouillé** : l'admin ne peut PAS choisir une date libre — il sélectionne uniquement parmi les `creneaux_preferes` du client
- **Heure précise** : après avoir sélectionné un créneau, l'admin saisit une heure de début (`heure_intervention`) validée dans la plage (08:00–12:00 matin, 14:00–18:00 après-midi)
- Permet : refus (avec motif min. 5 car.) → RPC `refuser_demande_rdv`
- Permet : assignation opérateur + créneau + heure → RPC `assigner_rdv(demande_id, operator_id, date, time_slot, heure)` + `sendEmail("rdv_confirmee")`
- `GererDemandeRdvDialog` a été supprimé — le chemin "confirmation directe sans opérateur" n'est plus accessible en UI.

### Flow RDV admin — `GererRdvConfirmeDialog` (RDV confirmé)

**`GererRdvConfirmeDialog`** (`src/components/admin/GererRdvConfirmeDialog.tsx`) gère les demandes **confirmee** :
- Action par défaut : **replanifier l'heure** (créneau verrouillé, seule l'heure change) → RPC `modifier_heure_rdv(p_demande_id, p_heure)` + `sendEmail("rdv_modifie")`
- Action secondaire (lien "Annuler le RDV…") : annulation avec motif → RPC `annuler_rdv_admin` + `sendEmail("rdv_annule_admin")`
- Remplace `AnnulerRdvAdminDialog` (supprimé) — consolider sur 1 dialog par demande
- Accessible depuis `DemandesRdvList` (clic sur carte confirmée) ET depuis la fiche intervention admin (bouton "Modifier l'horaire" → `/admin/planning?tab=demandes&demande=<id>`)
- `AdminDemandeRdv` inclut `assigned_time_slot?: string | null` (champ requis pour `slotKey` et `HEURE_OPTIONS`)

**RPC `modifier_heure_rdv`** :
- SECURITY DEFINER, admin/staff uniquement
- Valide heure dans la plage du créneau (08–12 matin / 14–18 après-midi)
- Bloque si une intervention liée est déjà `validee` (déjà facturée)
- Met à jour `demandes_rdv.assigned_heure` + `interventions.heure_intervention` (statuts `planifiee`/`en_cours`/`en_revision`)
- Logge dans `admin_actions_log` (action `'rdv_heure_modifiee'`)

### Statuts interventions (tous valeurs valides en DB)

`planifiee` | `en_cours` | `en_revision` | `validee` | `refusee`

- `planifiee` : créée par `assigner_rdv`, en attente d'exécution par l'opérateur → badge bleu
- `en_cours` : prise en charge par l'opérateur terrain
- `en_revision` : soumise par l'opérateur, en attente de validation admin → badge ambre
- `validee` : validée par l'admin → déclenche `sendEmail("intervention_close")` + `generateImpactRecords()`
- `refusee` : refusée par l'admin (renvoyée à l'opérateur avec motif)

### Type prestation sur interventions — ATTENTION

**`interventions.type_prestation` a deux sémantiques selon l'origine de l'intervention :**

| Origine | Valeurs possibles | Affichage |
|---------|-------------------|-----------|
| Créée manuellement (terrain) | `exterieur` / `interieur` / `complet` | scope direct |
| Créée par `assigner_rdv` (RDV) | `pack_standard` / `pack_interieur` / `pack_vtc` | label via `getPackLabel()` |

- Pour l'affichage : toujours `getPackLabel(type_prestation)` — gère les deux cas avec fallback
- Pour les checklists/photos : utiliser `typeScope(t)` qui mappe les packs → `'complet'` (pack_standard et pack_vtc incluent intérieur + extérieur)
- **Ne jamais appliquer `type_prestation` directement à `zonesFor()` ou aux conditions `showInt/showExt`** sans passer par `typeScope()` d'abord

### Heure d'intervention

- `interventions.heure_intervention TIME` : heure précise de début (nullable, optionnelle)
- `demandes_rdv.assigned_heure TIME` : heure assignée par l'admin, copiée vers les interventions
- Plages : matin = 08:00–12:00, après-midi = 14:00–18:00

### Modèle opérateurs

- **`operators`** (table planning admin : `name`, `initials`, `color_hex`) ≠ **`profiles.role=operateur`** (compte terrain Supabase Auth). Décorrélés.
- `interventions.operator_id` → `operators` (planning). `interventions.operateur_id` → `auth.users` (terrain).
- **Un seul opérateur réel pour l'instant** : `operators` ne contient qu'un row, label neutre « Opérateur » (pas de nom de personne). Le rendu UI est dynamique — ne jamais coder en dur les opérateurs.
- **Board cliquable** : clic sur un bloc du `PlanningCalendar` → `/admin/interventions/$id`. Drag via grip icon uniquement (listeners dnd-kit isolés sur l'icône grip).

### Lieu d'intervention & GPS

- `demandes_rdv` porte `adresse_intervention`, `ville_intervention`, `code_postal_intervention`, `latitude`, `longitude`.
- `interventions` porte aussi `adresse_intervention`, `ville_intervention`, `code_postal_intervention`, `latitude`, `longitude`, `heure_intervention` (tous copiés depuis la demande par `assigner_rdv`).
- `creer_demande_rdv` exige les 3 champs adresse + accepte `p_latitude`/`p_longitude` (DEFAULT NULL, rétrocompat). Géocodage effectué côté client avant le submit via edge function `geocode-address`.
- **`AssignerRdvDialog`** : badge ⚠️ "Adresse non géocodée" + bouton "Géocoder" si `demande.latitude IS NULL`. Appelle `geocode-address` + UPDATE en DB.
- **`RouteMap`** : centre adaptatif — si interventions GPS existent → `fitBounds`. Sinon → dernier point GPS en DB → Paris `[48.8566, 2.3522]` zoom 10 en fallback.

### Détail intervention admin (`/admin/interventions/$id`)

Affiche en haut une section **Planification** :
- Opérateur assigné (nom + badge couleur depuis table `operators`)
- Date + créneau (matin/après-midi) + heure précise
- Lieu d'intervention (adresse/ville/CP)
- Bouton **"Modifier l'horaire du RDV"** : visible si `profile.role === "admin"` + `demande_rdv_id` présent + statut `planifiee`/`en_cours`. Redirige vers `/admin/planning?tab=demandes&demande=<demande_rdv_id>` → ouvre `GererRdvConfirmeDialog` via `useAutoOpenFromSearch`.

Puis : contrôle pré-intervention, photos avant/après, checklists, notes, signature.
Actions admin (sticky bas) : visible uniquement si `statut = 'en_revision'` → Valider / Refuser.

### Créneaux préférés client (`creneaux_preferes`)

Stocké en JSONB sur `demandes_rdv`. Format :
```json
[
  { "date": "2026-06-18", "creneau": "matin", "plage": "matin", "debut": "08:00", "fin": "12:00" },
  { "date": "2026-06-25", "creneau": "apres_midi", "plage": "apres-midi", "debut": "14:00", "fin": "18:00" }
]
```
- `creneau` : `"matin"` | `"apres_midi"` (clé interne)
- `plage` : `"matin"` | `"apres-midi"` (affichage — utiliser `isMatin(plage)` pour normaliser)
- Le formulaire client (`CreerDemandeRdvDialog`) impose **min. 2 créneaux sur des jours différents** (jusqu'à 3 max). `hasSameDayCreneaux` bloque si 2 créneaux ont la même date.
- Créneaux saturés grisés : `get_creneaux_disponibles(date_debut, date_fin)` → `(slot_date, time_slot, nb_interventions, capacite_totale)`. Capacite = `COUNT(operators)*2`. Calendar grise dates full-saturées ; RadioGroup grise la demi-journée saturée.
- Guard race condition dans `creer_demande_rdv` : exception SQL si tous les créneaux proposés sont saturés au moment du submit.

## Comptes de test (après purge 2026-06-02)

| Email | Rôle |
|-------|------|
| `admin.test@izox.fr` | admin |
| `staff.test@izox.fr` | staff |
| `commercial.test@izox.fr` | commercial |
| `operateur.test@izox.fr` | operateur |
| `jeffersonjouenne@outlook.com` | client (seul compte client conservé) |

## Commandes utiles

```bash
# Déployer une edge function
supabase functions deploy <nom> --project-ref kddoyjbfvaakfbegzjyt

# Vérifier le build TypeScript (après npm install)
npx tsc --noEmit --skipLibCheck

# Build complet
npm run build

# Extraire les types Supabase générés (le MCP renvoie un JSON wrapper)
python3 -c "
import json
with open('src/integrations/supabase/types.ts') as f: content = f.read()
data = json.loads(content)
open('src/integrations/supabase/types.ts','w').write(data['types'])
"
```
