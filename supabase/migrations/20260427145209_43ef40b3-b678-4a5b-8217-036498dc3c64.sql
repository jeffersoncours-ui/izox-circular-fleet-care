-- Allow commercial role to read ALL vehicles (not just those of their assigned companies)
CREATE POLICY "vehicules_commercial_select_all"
ON public.vehicules
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'commercial'::app_role));

-- Allow commercial role to read ALL entreprises (needed for JOIN displaying client name)
CREATE POLICY "entreprises_commercial_select_all"
ON public.entreprises
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'commercial'::app_role));