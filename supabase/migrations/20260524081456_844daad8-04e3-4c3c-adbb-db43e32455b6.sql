ALTER TABLE public.interventions 
  DROP CONSTRAINT IF EXISTS interventions_type_prestation_check;

ALTER TABLE public.interventions 
  ADD CONSTRAINT interventions_type_prestation_check 
  CHECK (type_prestation IN ('pack_interieur', 'pack_standard', 'pack_vtc'));

COMMENT ON CONSTRAINT interventions_type_prestation_check ON public.interventions IS 
'Pack effectivement réalisé lors de l''intervention. Aligné sur les valeurs abonnement de prestations_catalogue (est_abonnement=true) et sur vehicules.type_pack_souhaite. Unification décidée en c.11.2.2.B.2 pour single source of truth pack_*. La colonne pourra être renommée en pack_realise lors d''un sprint cleanup futur (non bloquant).';