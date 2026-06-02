# Lessons Learned — IZOX

## Auth / Supabase

- **SMTP Supabase cassé** → ne jamais utiliser le SMTP natif. Toujours passer par les edge functions + API HTTP Resend.
- **Flow implicit vs PKCE** : l'app tourne en implicit (confirmé logs). Les liens recovery arrivent avec `#access_token=...&type=recovery` dans le hash, pas `?code=`.
- **Race condition login + recovery** : avoir `isRecovery` dans `auth-context.tsx` (via `detectAuthCallback()`) empêche le redirect automatique quand une session existe déjà.
- **Page dédiée `/reset-password`** : bien plus robuste que gérer la recovery dans `/login`. Aucune logique de redirect conflictuelle, gestion propre des liens expirés.
- **Microsoft Defender scanner** : fait des requêtes HEAD sur les liens `/verify` de Supabase → retourne 405, n'invalide PAS le token. Normal.
- **Supabase redirect URLs** : tout nouveau path utilisé comme `redirect_to` doit être ajouté dans Auth > URL Configuration du dashboard Supabase.
- **`routeTree.gen.ts`** : auto-généré par TanStack Router au build Vercel. Éditer manuellement uniquement pour que la route soit connue avant le premier build — le build le régénère ensuite.

## Vercel / Déploiement

- **Vercel MCP** : `list_projects` peut retourner vide même si le projet est live (problème de scope OAuth). L'app est bien déployée sur `izox-circular-fleet-care.vercel.app`.
- **Déploiement auto** : chaque merge sur `main` déclenche un déploiement Vercel automatiquement.

## Sécurité / RoleGuard

- **UI filtering ≠ route guard** : masquer un lien dans la sidebar (ex. `adminOnly: true`) ne protège pas la page. Un staff/commercial peut naviguer directement vers `/admin/planning` par URL. Toujours ajouter un `RoleGuard` au niveau du composant route en plus du filtre UI.
- **Liens de retour dynamiques** : ne jamais hardcoder `/admin` dans un lien "Retour" accessible à tous les rôles. Utiliser `rolePath(profile?.role)` pour que chaque rôle soit renvoyé vers sa page d'accueil correcte.

## Pricing / Facturation

- **Deux catalogues de prix — toujours les garder en sync** : `src/lib/pricing.ts` (`PACKS_CATALOG`) est le catalogue frontend ; `prestations_catalogue` est le catalogue DB utilisé par les RPCs Supabase (`valider_vehicule`, `appliquer_remise_commerciale`). Si l'un diverge de l'autre, les montants affichés et stockés seront différents. Tout changement de tarif doit faire l'objet d'une migration SQL + mise à jour `PACKS_CATALOG`.
- **Ne jamais afficher `contrat.montant_net_mensuel` (cache DB) directement** : calculer dynamiquement depuis `facture.totalBrutHt` et `facture.tauxPalier` pour éviter les dérives de cache. Le cache DB peut être stale si la ligne du contrat a changé sans que la RPC de recalcul ait tourné.
- **`RemiseCommercialeDialog` doit recevoir les valeurs `facture.*`** (frontend), pas `contrat.montant_brut_mensuel` / `contrat.remise_pct` (DB). La RPC Supabase recalculera depuis la DB après application — l'important est que la prévisualisation dans le dialog soit correcte.
- **Labels packs** : toujours utiliser `getPackLabel(type_pack)` depuis `@/lib/pricing`. Ne jamais afficher le code raw (`pack_interieur`) avec CSS `capitalize` — ça donne "Pack_interieur" au lieu de "Pack Intérieur".

## Architecture gel véhicule

- **Deux mécanismes de gel distincts** : le gel client passe par `demandes_gel` (workflow validé par l'admin) ; le gel admin direct utilise les colonnes `gel_admin_*` sur `vehicules` (action immédiate, sans workflow). Ne pas mélanger les deux.
- **Le client peut geler véhicule(s) OU contrat complet** : `DemanderGelDialog` s'ouvre depuis la fiche contrat client et propose le choix `type_demande = 'vehicules' | 'contrat'`. Ce n'est PAS limité aux véhicules individuels.
- **Gel admin : 3 colonnes sur `vehicules`** : `gel_admin_date_debut`, `gel_admin_date_fin`, `gel_admin_motif`. Présence de `gel_admin_date_debut IS NOT NULL` = gel admin en cours ou programmé. `statut='gele'` = actif, `statut='actif'` avec colonnes remplies = programmé.
- **Cron quotidien étendu** : `cron_maintenance_quotidienne()` gère automatiquement l'activation des gels admin programmés (date_debut atteinte) et l'expiration des gels actifs (date_fin passée). Toujours étendre cette fonction plutôt qu'en créer une nouvelle.
- **RPCs gel admin** : `geler_vehicule_admin(p_vehicule_id, p_date_debut, p_date_fin, p_motif)` et `annuler_gel_vehicule_admin(p_vehicule_id)`. Admin/staff uniquement. Loggent dans `admin_actions_log`.
- **Layout bouton gel** : le bouton Geler doit être pleine largeur (`w-full`) **au-dessus** de la rangée Modifier/Supprimer — cohérence avec le layout client (`space-y-2` + div séparée pour les 2 boutons du bas).

## Planning / RDV / Opérateurs

- **Vérifier le schéma avant de planifier une feature géo** : on a supposé qu'un « lieu d'intervention » distinct de l'adresse de facturation existait sur `demandes_rdv`. **Faux au départ** : seule `entreprises` portait une adresse. Colonnes `adresse_intervention`/`ville_intervention`/`code_postal_intervention`/`latitude`/`longitude` ajoutées sur `demandes_rdv` (session 4) et propagées vers `interventions` via `assigner_rdv`. Toujours auditer les migrations avant de bâtir un plan sur une hypothèse de données.
- **Lieu d'intervention ≠ adresse de facturation** : le bon design est un champ `adresse_intervention` sur `demandes_rdv` (la flotte peut être garée ailleurs que le siège), pré-rempli avec l'adresse entreprise mais modifiable. À construire (backlog GPS).
- **`operators` (planning) ≠ `profiles.role=operateur` (terrain)** : deux entités décorrélées. `interventions.operator_id` → `operators` (planning admin) ; `interventions.operateur_id` → `auth.users` (workflow terrain). Ne pas les confondre. Tant qu'il n'y a qu'un seul opérateur réel, garder un seul row dans `operators`, sans nom de personne (label neutre « Opérateur »).
- **Rendu opérateurs dynamique** : `PlanningCalendar`, `AssignerRdvDialog` et `RouteMap` lisent `operators` depuis la DB — ne jamais coder en dur les 3 opérateurs seed (Karim/Sofia/Yann). Réduire le seed à 1 réduit automatiquement les colonnes/sélecteurs.
- **Carte des routes morte sans GPS** : `RouteMap` filtre sur `latitude/longitude IS NOT NULL`, jamais alimentées → toujours vide. Ne dépend que de la propagation des coords (backlog GPS). Les colonnes `lat`/`lon` existent maintenant sur `demandes_rdv` et `interventions` — prêtes à être remplies par le géocodage.
- **Workflow RDV : deux chemins, un seul correct** : `GererDemandeRdvDialog` appelait `confirmer_demande_rdv_multi` qui créait des interventions sans `operator_id` ni `time_slot` → invisibles dans le board. L'unique chemin correct est `assigner_rdv` (qui définit opérateur + créneau + adresse en une transaction). Supprimer tout bouton "Confirmer" qui ne passe pas par l'assignation.
- **Consolider les dialogs admin : 1 dialog par demande** : avoir `GererDemandeRdvDialog` (confirmation directe) + `AssignerRdvDialog` (assignation) créait une confusion UI et un split du refus dans deux endroits. Solution : `AssignerRdvDialog` seul, avec section détails + refus + calendrier + email en un seul composant. La dette UI de deux dialogs parallèles faisait trou noir côté admin.
- **Fusion onglets ≠ fusion permissions** : `/admin/rendez-vous` et `/admin/interventions` sont accessibles à staff/commercial ; `/admin/planning` (board) est admin-only. En fusionnant, garder l'onglet accessible à tous les rôles admin mais protéger le sous-onglet board + carte par `RoleGuard allowed={["admin"]}`. Ne jamais élargir/réduire un accès par effet de bord d'un refactor de navigation.

## Workflow Git

- **Branches de travail** : supprimer après merge pour garder le repo propre. Impossible via `git push --delete` depuis le container (403) — le faire depuis GitHub UI.
- **Rebase avant merge** : si main a avancé, `git rebase origin/main` avant de créer la PR pour éviter les conflits.
- **Commits déjà upstream** : lors d'un rebase, git "drop" automatiquement les commits dont le contenu est déjà dans main — c'est normal.

## Données / Environnement de test

- **Purge données app** : supprimer dans l'ordre (enfants avant parents) : `intervention_photos` → `interventions` → `demandes_rdv` → `demandes_gel` → `factures_lignes` → `factures` → `avoirs` → `contrat_avenants` → `contrat_lignes` → `contrats` → `vehicules` → `parrainages` → `notifications_internes` → `email_logs` → `admin_actions_log` → puis `entreprise_acces_commerciaux` → `user_roles` (clients à supprimer) → `profiles` → `entreprises` → `auth.users`.
- **Ne pas purger** : `prestations_catalogue`, `app_config`, `seuils_planning`, `operators`, `disponibilites_operateurs` — ce sont des données de configuration, pas des données app.
- **Réinitialiser `contrat_sequences`** : `UPDATE contrat_sequences SET derniere_sequence = 0` après purge pour que la numérotation reparte proprement.
- **Compte client de test** : `jeffersonjouenne@outlook.com` — seul compte client conservé après purge.
