import { supabase } from "@/integrations/supabase/client";

const VEHICULES_BUCKET = "vehicules";
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Returns a signed URL for a vehicule photo stored in the private `vehicules` bucket.
 * Returns null if the path is empty or if the signing fails (e.g. RLS denied / object missing).
 *
 * Centralised helper — all components must use this to load vehicule photos.
 */
export async function getVehiculePhotoUrl(
  photoPath: string | null | undefined
): Promise<string | null> {
  if (!photoPath) return null;
  const { data, error } = await supabase.storage
    .from(VEHICULES_BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
