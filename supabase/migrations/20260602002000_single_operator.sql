-- ===========================================================================
-- Réduction à un seul opérateur (un seul opérateur réel pour l'instant)
-- Deploy: 2026-06-02
-- ---------------------------------------------------------------------------
-- Contexte : la table operators était seedée avec 3 opérateurs fictifs
-- (Karim B., Sofia T., Yann L.). Il n'y a qu'un seul opérateur réel pour le
-- moment. On ne garde qu'un row, avec un label neutre (pas de nom de personne).
-- Idempotent : réduit toujours à un row puis normalise le label.
-- ===========================================================================

-- Garde uniquement le plus ancien row (déterministe), supprime les autres.
DELETE FROM public.operators
WHERE id NOT IN (
  SELECT id FROM public.operators ORDER BY created_at ASC LIMIT 1
);

-- Label neutre, sans nom de personne, couleur neutre.
UPDATE public.operators
SET name = 'Opérateur',
    initials = 'OP',
    color_hex = '#475569';
