-- Allow commercial role to view vehicule photos for entreprises they manage
CREATE POLICY "vehicules_storage_commercial_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicules'
    AND public.has_role(auth.uid(), 'commercial')
    AND (
      -- Path = {entreprise_id}/{vehicule_id}/photo.jpg
      ((storage.foldername(name))[1])::uuid IN (
        SELECT id FROM public.entreprises WHERE commercial_id = auth.uid()
      )
    )
  );