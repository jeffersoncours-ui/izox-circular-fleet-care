# Lessons Learned — IZOX

## Refonte visuelle — design system + 3 portails (sessions 14-15)

- **Tailwind v4 CSS-only** : plus de `tailwind.config.ts` — toute la config (tokens, custom colors, shadows, fonts) se fait dans `src/styles.css` avec `@theme inline { --color-... }`. Ne jamais créer de `tailwind.config.ts` dans ce projet.
- **Ordre des tokens CSS** : déclarer les variables sémantiques (`--color-primary`, `--shadow-card`) dans `@theme inline` *après* les variables hex raw. Sinon les utilitaires Tailwind générés n'ont pas accès aux valeurs.
- **`PageHeader` comme composant boundary** : créer un composant `PageHeader` réutilisable (`src/components/ui/page-header.tsx`) avec `crumbs`, `title`, `sub`, et `right` permet d'homogénéiser toutes les pages admin sans duplication. L'ajouter dans le barrel export si on a un `ui/index.ts`.
- **Ne jamais toucher la logique métier lors d'une refonte CSS** : tout changement de classe Tailwind sur un composant qui fait des appels Supabase doit être fait en ciblant uniquement les classes CSS. Les props de données (RPCs, hooks, useState) restent intacts. Si le composant est trop enchevêtré, isoler le shell HTML/CSS dans un sous-composant de présentation.
- **`flex flex-col min-h-full` pour les pages avec PageHeader sticky** : le PageHeader est `sticky top-0 z-10`. Le parent doit être `flex flex-col min-h-full` pour que le contenu dessous occupe la hauteur restante correctement. Sans ça, les pages courtes ont un PageHeader qui "flotte" visuellement.
- **Fermeture de `</div>` après refactor** : quand on remplace `<div className="p-6 max-w-5xl mx-auto">` par `<div flex-col min-h-full><PageHeader/><div p-6 max-w-5xl>`, il faut ajouter une fermeture `</div>` supplémentaire en fin de JSX. Oubli fréquent = erreur TS immédiate sur les balises déséquilibrées.
- **Edit sans Read préalable = erreur** : le tool `Edit` exige un `Read` préalable dans la session. Toujours lire avant de modifier, même si le contenu est connu via le résumé de session.
- **`PageHeader` dans les pages de détail async** : ne pas placer le `PageHeader` avant le guard de chargement (`if (loading) return <Loader/>`). Le placer dans le bloc `return` principal pour que les données (`entreprise.nom`, `vehicule.immatriculation`) soient disponibles quand il se rend.
- **Statuts visuels — tokens design cohérents** : actif = `bg-[#E7EFEA] text-primary border-[#CBDDD2]`, gelé = `bg-[#D5E2F6] text-[#2A6FDB] border-[#B3C8EF]`, en_attente = `bg-amber-50 text-amber-700 border-amber-200`. Ne jamais mélanger les couleurs Tailwind générique (`sky-*`, `blue-*`) avec les tokens custom — toujours partir des valeurs hex du design system.
- **Font Outfit sur les titres** : ajouter `font-family: var(--font-display)` via `@layer base { h1,h2,h3,h4 { font-family: ... } }` dans `styles.css`. La classe utilitaire `.font-display` + Tailwind `font-bold` suffit pour les titres isolés. Ne pas oublier de charger la fonte via le `<link>` Google Fonts dans `root.tsx`.
- **Client portal mobile-first** : les pages `/client/*` n'ont pas de sidebar — layout `px-4 py-5 max-w-2xl mx-auto pb-24`. Le `pb-24` est crucial pour éviter que le bottom nav masque le contenu. Ne jamais le retirer.
- **`Vercel MCP list_projects` peut retourner vide** malgré un projet live — problème de scope OAuth du token. Passer par le dashboard Vercel directement pour trouver le lien de preview. Déploiements auto branch = `https://<projet>-git-<branch>-<team>.vercel.app`.

## Audit sécurité et correctifs (session 13)

- **`routeTree.gen.ts` ne se régénère qu'au build** : après création d'une route index (`terrain.index.tsx`), `routeTree.gen.ts` n'est pas mis à jour localement → erreur TS silencieuse `keyof FileRoutesByPath`. Toujours lancer `npm run build` (ou au minimum vérifier avec `tsc --noEmit`) après création d'une nouvelle route. Le build Vercel régénère automatiquement, mais pas l'environnement de développement.

- **Bug de sous-ensemble d'email type : toujours vérifier la synchronisation EmailType frontend ↔ edge function** : `rdv_modifie` était dans `src/lib/email.ts` (type union frontend) mais absent du switch de `send-email`. Résultat : l'email tombait dans `default: throw new Error("Type email inconnu")` → erreur 500 silencieuse (fire-and-forget). Règle : tout nouveau type ajouté à `EmailType` dans `email.ts` doit SIMULTANÉMENT avoir un `case` dans l'edge function.

- **Vérification de rôle dans les edge functions** : authentification ≠ autorisation. Vérifier le JWT (auth.getUser()) prouve que l'utilisateur est connecté, pas qu'il a le droit d'appeler ce type d'action. Ajouter un lookup `profiles.role` après l'auth check pour limiter les types d'email par rôle (client ne peut appeler que ses propres types).

- **Casts `as any` sur tables/RPCs non typés = dette à nettoyer à chaque regen** : après chaque `generate_typescript_types`, vérifier les fichiers qui utilisaient `(supabase.from as any)("table_nouvellement_typée")` et supprimer les casts. Le regen résout la cause racine, les casts sont des symptômes.

- **Validation MIME côté client pour les uploads** : `file.type.startsWith("image/")` avant toute compression/upload. La vérification côté client ne remplace pas la validation storage policy (Supabase Storage), mais évite les erreurs de compression sur des non-images et améliore le feedback UX.

## Bug routing TanStack Router — terrain fiches non cliquables (session 12c)

- **`terrain.tsx` pleine page sans `<Outlet/>` = fiches enfants invisibles** : même bug qu'`admin.interventions` (session 8, documenté dans CLAUDE.md). `terrain.intervention.$id.tsx` est un enfant de `terrain.tsx` dans TanStack Router (file-based routing par notation `.`). Quand le parent n'a pas `<Outlet/>`, le composant enfant n'a nulle part où se rendre — le clic navigue (URL change) mais l'écran reste identique. Résolution identique à admin.interventions : `terrain.tsx` → `component: () => <Outlet/>`, dashboard → `terrain.index.tsx` avec `createFileRoute("/terrain/")`.
- **Règle systématique à l'ajout d'une route enfant** : dès qu'on crée `parent.child.tsx`, vérifier que `parent.tsx` exporte `<Outlet/>`. Si `parent.tsx` est un composant pleine page, splitter en `parent.tsx` (layout) + `parent.index.tsx` (contenu) avant de créer l'enfant. Ne pas attendre un test post-déploiement pour découvrir le bug.

## Correctifs post-tests + audit liaisons (session 12b)

- **Toujours prouver un "bug" par les timestamps avant de coder** : le client signalait un quota dépassé (3 RDV pour un pack à 2). En base, la demande #2 a été annulée **59 secondes** avant la création de la #3 → le garde-fou avait bien fonctionné (1 actif + 1 nouveau = 2). La perception utilisateur ≠ réalité base. Reconstruire la chronologie (`created_at`/`updated_at`) avant de toucher au code évite de "corriger" du code sain.
- **Bug RLS récurrent : tables jointes sans policy pour le rôle** (3ᵉ occurrence après vehicules en session 10). L'onglet Suivi opérateur affichait 0 client car `entreprises` n'avait **aucune policy `operateur`** → le join `entreprises(id,nom)` renvoyait NULL. Règle : pour CHAQUE rôle qui lit une table via un join PostgREST, vérifier qu'une policy SELECT existe sur la table jointe, pas seulement la table racine.
- **Quota mensuel : vérifier sur le mois CIBLE, pas `NOW()`** : `creer_demande_rdv` comparait au mois courant (`DATE_TRUNC('month', NOW())`). Une réservation faite en juin pour juillet était comptée sur juin. Fix : mois de référence = mois du créneau proposé le plus proche (`MIN((c->>'date')::date)`), et compter les demandes en_attente dont un créneau tombe dans ce mois.
- **Verrou métier = UI + serveur** : le verrou horaire (démarrage d'intervention) n'existait que côté React. Une RPC `SECURITY DEFINER` doit ré-appliquer la règle (ici `prendre_en_charge_intervention` recalcule l'heure de déverrouillage `date+heure AT TIME ZONE 'Europe/Paris'`). Idem `modifier_heure_rdv` : interdire jour J/passé + `en_cours` côté SQL, pas seulement masquer le bouton.
- **Fuseau horaire dans les verrous SQL** : `(date_intervention + heure)::timestamp AT TIME ZONE 'Europe/Paris'` pour matcher la logique UI (`new Date('YYYY-MM-DDTHH:MM')` = heure locale navigateur). Comparer ensuite à `now()` (timestamptz). Ne pas comparer un timestamp naïf à `now()`.
- **Tester les RPC en impersonation via `set_config('request.jwt.claims', ...)`** : `auth.uid()` lit `request.jwt.claims->>'sub'`. En posant ce GUC (is_local=true) + `SET LOCAL ROLE authenticated`, on teste RPC et RLS sous l'identité d'un rôle réel. Pour capturer une exception attendue sans casser la transaction : bloc `BEGIN...EXCEPTION WHEN others THEN` (savepoint implicite) qui écrit `SQLERRM` dans une temp table.
- **Fiche admin : ne montrer le compte-rendu que si la prestation est faite** : afficher photos/checklists/signature vides sur une intervention `planifiee` n'a pas de sens. Garde `["en_revision","validee","refusee"]` — surtout PAS `validee` seul, car l'admin doit voir les photos pendant `en_revision` pour valider.

## Refonte terrain + téléphone + observations (session 12)

- **Nom du trigger `updated_at` à vérifier avant chaque migration** : le trigger fonction s'appelle `public.tg_set_updated_at()` dans ce projet, **pas** `public.update_updated_at_column()`. Cette dernière n'existe qu'en schéma `storage`. Toujours vérifier avec `SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE '%updated_at%'` avant d'écrire un `CREATE TRIGGER ... EXECUTE FUNCTION`.
- **`DROP FUNCTION` avant `CREATE OR REPLACE` quand la signature change** : PostgreSQL distingue les fonctions par leur signature complète. Ajouter un paramètre DEFAULT en fin de liste nécessite un `DROP` préalable pour éviter la surcharge ambiguë. La rétrocompat est garantie par `DEFAULT NULL` en fin de liste — les anciens appels sans ce paramètre continuent de fonctionner.
- **`apply_migration` est atomique** : si la migration échoue à mi-chemin, aucune des instructions n'est persistée. Relancer la migration corrigée est sûr sans risquer d'état partiel.
- **RLS deny-by-default pour nouveaux rôles** : ne pas créer de policy pour le rôle `client` sur `operateur_observations` suffit à bloquer l'accès. RLS + `ENABLE ROW LEVEL SECURITY` = deny by default pour tout rôle sans policy. Pas besoin d'une policy `DENY` explicite.
- **Countdown `useEffect` — nettoyage strict** : tout `setInterval` dans un composant React doit retourner `() => clearInterval(timer)` dans le cleanup. Oublier le cleanup provoque des fuites mémoire et des mises à jour de state sur des composants démontés. Conditionner le `setInterval` à `isOpen && isLocked` pour ne pas le démarrer inutilement.
- **Bottom sheet vs route dédiée** : pour les détails d'une card dans un onglet mobile, préférer un composant inline (bottom sheet, drawer) plutôt qu'une nouvelle route. Évite la gestion du `back` et les états de chargement redondants sur mobile.

## Bugs terrain post-déploiement (session 10 — correctifs)

- **RLS vehicules manquante pour opérateur** : `vehicules` n'avait aucune policy SELECT pour le rôle `operateur`. Le join PostgREST dans la requête `interventions` (`.select("..., vehicules(immatriculation, marque...)")`) retournait `null` silencieusement → immatriculation "—" dans tout le dashboard. Toujours vérifier les RLS de **toutes les tables jointes**, pas seulement la table principale.
- **`todayCount` qui ignore les `en_cours` d'autres dates** : une intervention peut être `en_cours` avec `date_intervention` = demain (planifiée pour demain, prise en charge aujourd'hui). Compter `en_cours` indépendamment de la date (ils sont actifs *maintenant*), et `planifiée` uniquement si `date_intervention === today`. Formule correcte : `enCours.length + avenir.filter(i => i.date_intervention === today).length`.
- **AvenirCard non cliquable** : `<div>` wrapper ne propage pas les clics. L'opérateur ne pouvait pas voir les détails (adresse, prestation) d'une fiche planifiée avant de la prendre en charge. Solution : wrapper `<button>` avec `onClick → navigate`, et `e.stopPropagation()` sur le bouton "Prendre en charge" imbriqué pour éviter la navigation au clic du CTA.
- **Contrainte "1 à la fois" absente** : le RPC `prendre_en_charge_intervention` ne vérifiait pas si une `en_cours` existait déjà. Ajouter `IF EXISTS (SELECT 1 FROM interventions WHERE operateur_id = auth.uid() AND statut='en_cours') THEN RAISE EXCEPTION`. Côté UI : prop `hasEnCours` → bouton désactivé + libellé "Intervention en cours...".
- **Tester les RLS de toutes les tables impliquées dans un join** : avant de déclarer un composant terminé, vérifier systématiquement que l'utilisateur cible (ici `operateur`) a bien un accès SELECT sur chaque table référencée dans le `.select()` — y compris les tables de lookup (vehicules, entreprises, operators...).

## Compte opérateur terrain (session 10)

- **`operator_id` ≠ `operateur_id` — deux FK distinctes** : `operator_id` (FK → `operators`, planning admin) est rempli par `assigner_rdv`. `operateur_id` (FK → `auth.users`) est rempli par l'opérateur terrain lui-même. La RLS originale ne couvrait que `operateur_id = auth.uid()` → interventions planifiées **entièrement invisibles** pour l'opérateur terrain. Fix : `user_id` sur `operators` + RLS étendue avec `OR operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid())`.
- **RPC `prendre_en_charge_intervention`** : séparer la lecture (vue planifiée : date, lieu, véhicule) du démarrage (prise en charge). Le RPC valide opérateur lié + statut=planifiee + operator_id correct → `operateur_id = auth.uid()` + `statut = en_cours`. Simple, atomique.
- **Storage policies à mettre à jour en même temps que les RLS table** : les policies storage font `EXISTS (SELECT 1 FROM interventions WHERE ...)`. Sans la mise à jour, l'upload photos échoue silencieusement après prise en charge.
- **`typeScope()` obligatoire pour les packs commerciaux** : `type_prestation` des interventions RDV vaut `pack_standard`/`pack_vtc`/`pack_interieur`. `zonesFor()` attend `exterieur|interieur|complet`. Sans `typeScope()`, checklists et photos disparaissent. Toujours `zonesFor(typeScope(intervention.type_prestation))`.
- **Step dashboard depuis localStorage** : le stepper stocke l'étape dans `localStorage`. Le dashboard lit `izox_intervention_${id}` pour afficher "step X/3" sans requête DB supplémentaire.
- **Zones photos : changement de clés = photos historiques orphelines** : passer de 2 → 6 zones change les clés DB. Les photos existantes avec les anciennes clés ne s'affichent plus. Acceptable en dev/test, nécessite une migration de clés en production.

## Créneaux RDV & Saturation (session 9)

- **Validation 2 jours différents vs 2 créneaux distincts** : la règle "jours différents" est plus stricte que "pas de doublon exact". Un seul check `hasSameDayCreneaux` (clé = date ISO) remplace les deux anciens checks et couvre tous les cas. Initialiser le state avec 2 créneaux vides force la saisie sans message d'erreur intrusif au premier rendu.
- **`get_creneaux_disponibles` : capacité scalable** : retourner `capacite_totale = COUNT(operators) * 2` au lieu d'une constante en dur rend la RPC multi-opérateurs ready sans changer l'interface client. Slots non retournés = 0 interventions = disponibles (join implicite).
- **Guard race condition dans `creer_demande_rdv`** : le vrai verrou transactionnel reste `assigner_rdv` (FOR UPDATE sur la demande + COUNT interventions). Ajouter un check "au moins 1 créneau disponible" dans `creer_demande_rdv` donne un feedback propre au client au moment du submit, sans remplacer le guard admin. `GREATEST(COUNT(*)*2, 2)` évite un fallback = 0 si la table `operators` est vide.
- **Mapping vocabulaire slots** : DB utilise `'morning'`/`'afternoon'` (anglais, migration 20260531010000). Form client utilise `'matin'`/`'apres_midi'` (français). Toujours passer par le mapping explicite dans les deux sens — ne pas supposer une normalisation globale.

## Géocodage & Carte (session 9)

- **Nominatim server-side** : appel depuis une edge function (pas depuis le navigateur) — User-Agent identifiant l'app obligatoire, pas de quota IP navigateur, CORS géré. Fire-and-forget côté client : si Nominatim échoue, la demande est créée sans coords (la carte sera vide pour ce point, pas bloquant).
- **`creer_demande_rdv` : extension rétrocompatible** : ajouter `p_latitude DEFAULT NULL` / `p_longitude DEFAULT NULL` en fin de signature évite de casser les appels existants. Toujours `DROP FUNCTION` avant `CREATE OR REPLACE` quand on change le nombre de paramètres (PostgreSQL les distingue par signature).
- **Centre carte adaptatif** : ne pas hardcoder `[48.8566, 2.3522]` comme unique centre. Logique en cascade : AutoFitBounds quand routes GPS existent → dernier point connu en DB → Paris fallback. Le fallback statique est légitime mais doit être le dernier recours, pas le seul.
- **Badge géocodage admin** : indicateur ⚠️ "Adresse non géocodée" + bouton "Géocoder" dans `AssignerRdvDialog` quand `latitude IS NULL`. Pattern : mutation optimiste sur `demande` locale (`demande.latitude = data.latitude`) pour feedback immédiat sans refetch.

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

## Interventions créées depuis un RDV (assigner_rdv)

- **`statut='planifiee'` est une valeur DB valide** (CHECK étendu en migration `20260523115532`) mais absente du frontend jusqu'à cette session. Toujours garder `Statut` en sync avec les valeurs DB.
- **`type_prestation` = pack commercial** sur les interventions RDV (ex: `'pack_standard'`), pas le scope (`exterieur/interieur/complet`). Utiliser `getPackLabel()` pour l'affichage, et une fonction `typeScope()` pour mapper vers le scope quand les checklists/photos en ont besoin.
- **Verrouiller l'admin sur les créneaux client** : supprimer le calendrier libre dans `AssignerRdvDialog`, afficher uniquement les créneaux `creneaux_preferes` du client comme boutons. L'admin ne choisit que l'opérateur + l'heure précise dans la plage.
- **Heure précise dans un créneau** : `<input type="time" min="08:00" max="12:00">` avec validation frontend (`heureValid()`) et colonne `heure_intervention TIME` en DB. Plage matin = 08h-12h, après-midi = 14h-18h.
- **Clic vs drag sur un board dnd-kit** : séparer le grip (`{...listeners}` sur l'icône grip uniquement) du clic navigation (bouton imbriqué sur le texte). Ne pas mettre `onClick` sur le div `ref={setNodeRef}` — ça entre en conflit avec le drag.

## Routing TanStack (file-based à plat)

- **Un `beforeLoad`/redirect sur `X.tsx` s'applique AUSSI à `X.$id.tsx`** : en routing à plat, `admin.interventions.$id.tsx` est un enfant de `admin.interventions.tsx`. Si le parent throw un `redirect` dans `beforeLoad`, le détail enfant est redirigé lui aussi → fiche « non cliquable » (on revient instantanément en arrière). Symptôme trompeur : les `onClick`/`navigate` sont pourtant corrects.
- **Pattern correct** : séparer layout et index, comme `admin.planning.tsx` (`component: () => <Outlet/>`) + `admin.planning.index.tsx`. Mettre le redirect dans `X.index.tsx` (path exact) et faire de `X.tsx` un layout pur `<Outlet/>`. Ainsi `X.$id` n'hérite plus du redirect.
- **Régénérer `routeTree.gen.ts`** : `npm run build` (vite + `@tanstack/router-plugin`) le régénère. Vérifier le `getParentRoute` des routes `$id` après tout changement de structure.

## Replanification RDV (session 8)

- **`modifier_heure_rdv(p_demande_id, p_heure)`** : verrouille date + `assigned_time_slot` (créneau client), ne change que l'heure, valide la plage (matin 08–12 / après-midi 14–18), propage `heure_intervention` à toutes les interventions liées `IN ('planifiee','en_cours','en_revision')`, bloque si une intervention est `validee` (facturée). Admin/staff only.
- **Email `rdv_modifie`** (→ client) : ajouté à l'edge function send-email (v9) + union `EmailType` de `email.ts`. Réutilise `email_status`/`email_sent_at` sur `demandes_rdv` comme `rdv_confirmee`.
- **Dialog consolidé `GererRdvConfirmeDialog`** : remplace `AnnulerRdvAdminDialog`. Un seul dialog pour un RDV confirmé = replanifier l'heure (action par défaut) OU annuler (lien secondaire). Cohérent avec « 1 dialog par demande ».
- **Tester un RPC SECURITY DEFINER sans session** : `execute_sql` tourne sans `auth.uid()`. Simuler via `PERFORM set_config('request.jwt.claims', json_build_object('sub', <uid>,'role','authenticated')::text, true)` dans un bloc `DO` (même transaction) — permet de jouer client puis admin et de tester les garde-fous.

## Workflow Git

- **Branches de travail** : supprimer après merge pour garder le repo propre. Impossible via `git push --delete` depuis le container (403) — le faire depuis GitHub UI.
- **Rebase avant merge** : si main a avancé, `git rebase origin/main` avant de créer la PR pour éviter les conflits.
- **Commits déjà upstream** : lors d'un rebase, git "drop" automatiquement les commits dont le contenu est déjà dans main — c'est normal.

## Données / Environnement de test

- **Purge données app** : supprimer dans l'ordre (enfants avant parents) : `intervention_photos` → `interventions` → `demandes_rdv` → `demandes_gel` → `factures_lignes` → `factures` → `avoirs` → `contrat_avenants` → `contrat_lignes` → `contrats` → `vehicules` → `parrainages` → `notifications_internes` → `email_logs` → `admin_actions_log` → puis `entreprise_acces_commerciaux` → `user_roles` (clients à supprimer) → `profiles` → `entreprises` → `auth.users`.
- **Ne pas purger** : `prestations_catalogue`, `app_config`, `seuils_planning`, `operators`, `disponibilites_operateurs` — ce sont des données de configuration, pas des données app.
- **Réinitialiser `contrat_sequences`** : `UPDATE contrat_sequences SET derniere_sequence = 0` après purge pour que la numérotation reparte proprement.
- **Compte client de test** : `jeffersonjouenne@outlook.com` — seul compte client conservé après purge.

## Bugs PostgREST / Supabase

- **Erreurs PostgREST silencieuses** : si on fait `const { data }` sans capturer `error`, une erreur 400 (colonne inexistante) retourne `data = null`. Le composant affiche alors "introuvable" pour TOUS les éléments — symptôme trompeur. Toujours capturer ET logger l'erreur dans les selects critiques.
- **Colonne inexistante dans SELECT** : PostgREST renvoie 400 si une colonne du SELECT n'existe pas. En session 6, `refus_motif` n'existait pas sur `demandes_rdv` → toutes les demandes retournaient "introuvable". Solution : enlever la colonne du SELECT, vérifier en DB avant de coder.
- **`date_confirmee` est un TIMESTAMPTZ** : stocker "minuit UTC" donne "02h00" à Paris. Ne jamais extraire l'heure depuis un champ timestamp qui représente une date. Toujours utiliser une colonne TIME dédiée (`assigned_heure`) pour les heures métier.

## Annulation RDV (sessions 6-7)

- **Statut `annulee` vs quota** : les interventions annulées (`statut='annulee'`) ne doivent pas compter dans le quota mensuel. Le filtre "tous" dans `InterventionsListPanel` les exclut aussi (bruit opérationnel) — filtre dédié "Annulées" pour les consulter.
- **Règle 48h côté client** : la vérification du délai est en DB (RPC `annuler_rdv_client` vérifie `assigned_date <= CURRENT_DATE + 1` → EXCEPTION). Le frontend calcule `annulable` pour désactiver le bouton avant même l'appel, mais la DB reste la source de vérité.
- **Propagation statut annulee → interventions** : `annuler_rdv_client` et `annuler_rdv_admin` mettent à jour `interventions.statut='annulee'` pour toutes les interventions liées encore actives. L'admin ne peut pas annuler si une intervention est déjà `validee` (déjà facturée).
- **Emails d'annulation bi-directionnels** : `rdv_annule_client` (déclenché par le client) → envoyé à l'admin IZOX ; `rdv_annule_admin` (déclenché par l'admin) → envoyé au client. Toujours fire-and-forget (`void sendEmail(...)`) pour ne pas bloquer l'UX si Resend échoue.

## Composants réutilisables

- **`PasswordInput`** (`src/components/ui/password-input.tsx`) : wrapper autour de `<Input>` avec bouton Eye/EyeOff. Patron utile : `forwardRef` + `Omit<React.ComponentProps<"input">, "type">` pour forwarder toutes les props sans exposer `type`. `tabIndex={-1}` sur le bouton toggle pour ne pas casser la navigation clavier.

## Planning responsive

- **Vue mobile ≠ vue desktop** : pour un board de planning, le scroll horizontal sur mobile est rédhibitoire. Solution retenue : `md:hidden` = sélecteur de jour (5 chips) + 4 créneaux empilés verticalement ; `hidden md:block` = grille semaine classique. Les deux vues partagent les mêmes données.
- **Supprimer drag-drop simplifie massivement** : dnd-kit (DndContext, DragOverlay, useDraggable, useDroppable) ajoute beaucoup de complexité pour peu de valeur métier dans ce contexte (un seul opérateur, rien à réordonner). Si le drag ne porte pas de sémantique métier réelle, le remplacer par un simple clic vers la fiche.

## Types Supabase générés

- **Après chaque migration schéma** : régénérer via MCP `generate_typescript_types`. La RPC renvoie `{"types":"..."}` (JSON wrapper) — extraire avec `python3 -c "import json; open('src/integrations/supabase/types.ts','w').write(json.loads(open('...').read())['types'])"`. Sans regen, les nouveaux RPCs ne sont pas typés et les appels `supabase.rpc(...)` déclenchent des erreurs TS.
- **Cast temporaire `as never`** : acceptable pendant le développement si les types ne sont pas encore régénérés, mais toujours régénérer et supprimer les casts avant le commit final.
