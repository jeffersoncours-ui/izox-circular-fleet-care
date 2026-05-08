ALTER TABLE contrats 
  ADD COLUMN IF NOT EXISTS gel_commentaire text,
  ADD COLUMN IF NOT EXISTS gel_notifier_client boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN contrats.gel_commentaire IS
'Commentaire libre saisi par admin/staff lors de la declaration du gel. Complete gel_type (categorie) avec le contexte specifique. Vide si le gel n''a pas ete documente.';

COMMENT ON COLUMN contrats.gel_notifier_client IS
'Indique si un email de notification doit etre envoye au client lors du gel (sera branche en 3.A.7 avec Resend). True par defaut (transparence premium). Desactivable pour gels administratifs internes.';