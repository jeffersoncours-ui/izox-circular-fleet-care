# Task Tracking

## Current Task: Auth SMTP — Resend Integration

### Objectif
Brancher tous les flux d'authentification (création compte, reset MDP) sur Resend pour des emails brandés IZOX, sans jamais exposer de mot de passe temporaire en clair.

### Plan

#### Edge Functions
- [x] `create-client-account`: générer un recovery link + envoyer email de bienvenue via Resend
- [x] `admin-reset-password`: accepter `user_id` en plus de `email`, envoyer reset email via Resend automatiquement

#### Frontend
- [x] `login.tsx`: gérer l'événement `PASSWORD_RECOVERY` de Supabase → afficher un formulaire "Définir mon mot de passe"
- [x] `CreateClientDialog.tsx`: remplacer l'affichage mot de passe par "Email de bienvenue envoyé"
- [x] `admin.clients.$id.tsx`: ajouter bouton "Réinitialiser MDP"

#### Infra
- [ ] Configurer SMTP Resend en production : Dashboard Supabase → Auth → SMTP Settings
  - Host: smtp.resend.com | Port: 465 | User: resend | Pass: RESEND_API_KEY
  - Sender: IZOX <noreply@izox.fr>
- [ ] Ajouter `SITE_URL` dans les secrets Supabase Edge Functions (valeur: URL de prod Vercel)

### Vérification
- [ ] Créer un client → vérifier que l'email de bienvenue est reçu et que le lien fonctionne
- [ ] Cliquer le lien → vérifier que le formulaire "Définir mot de passe" s'affiche
- [ ] Réinitialiser MDP depuis la fiche client → vérifier l'email reçu

### Review
*(À remplir après complétion)*
