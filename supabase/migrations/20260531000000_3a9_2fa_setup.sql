-- ===========================================================================
-- FEATURE 1 — 2FA Setup: tables user_2fa_settings + user_2fa_recovery_codes
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table des paramètres 2FA par utilisateur
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  method text CHECK (method IN ('sms', 'totp')),
  phone text,
  totp_secret text,
  enabled boolean DEFAULT false,
  activated_at timestamptz,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_2fa_settings_own ON public.user_2fa_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_2fa_settings_admin_all ON public.user_2fa_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER user_2fa_settings_updated_at
  BEFORE UPDATE ON public.user_2fa_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Table des codes de récupération (hachés avec bcrypt via pgcrypto)
CREATE TABLE IF NOT EXISTS public.user_2fa_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  code_hash text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_2fa_recovery_codes_user
  ON public.user_2fa_recovery_codes(user_id)
  WHERE used = false;

ALTER TABLE public.user_2fa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_2fa_recovery_codes_own ON public.user_2fa_recovery_codes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_2fa_recovery_codes_admin_all ON public.user_2fa_recovery_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- RPC: setup_2fa — enregistre méthode + secret/phone (avant vérification)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.setup_2fa(
  p_method text,
  p_totp_secret text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF p_method NOT IN ('sms', 'totp') THEN
    RAISE EXCEPTION 'Méthode invalide : %', p_method;
  END IF;
  IF p_method = 'totp' AND p_totp_secret IS NULL THEN
    RAISE EXCEPTION 'Secret TOTP requis pour la méthode totp';
  END IF;
  IF p_method = 'sms' AND p_phone IS NULL THEN
    RAISE EXCEPTION 'Numéro de téléphone requis pour la méthode sms';
  END IF;

  INSERT INTO user_2fa_settings (user_id, method, totp_secret, phone, enabled)
  VALUES (v_uid, p_method, p_totp_secret, p_phone, false)
  ON CONFLICT (user_id) DO UPDATE SET
    method = EXCLUDED.method,
    totp_secret = EXCLUDED.totp_secret,
    phone = EXCLUDED.phone,
    enabled = false,
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = now();

  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.setup_2fa(text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: record_2fa_attempt — gère échecs (lockout après 3 tentatives)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_2fa_attempt(p_success boolean)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_attempts int;
  v_locked boolean;
BEGIN
  IF p_success THEN
    UPDATE user_2fa_settings
    SET failed_attempts = 0,
        locked_until = NULL,
        enabled = true,
        activated_at = now(),
        updated_at = now()
    WHERE user_id = v_uid;
    RETURN json_build_object('success', true, 'locked', false, 'attempts', 0);
  ELSE
    UPDATE user_2fa_settings
    SET
      failed_attempts = failed_attempts + 1,
      locked_until = CASE
        WHEN failed_attempts + 1 >= 3 THEN now() + interval '15 minutes'
        ELSE locked_until
      END,
      updated_at = now()
    WHERE user_id = v_uid
    RETURNING failed_attempts INTO v_attempts;

    v_locked := (v_attempts >= 3);
    RETURN json_build_object('success', false, 'locked', v_locked, 'attempts', v_attempts);
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_2fa_attempt(boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: store_2fa_recovery_codes — remplace les codes existants (hachés bcrypt)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.store_2fa_recovery_codes(p_codes text[])
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
BEGIN
  IF array_length(p_codes, 1) IS NULL OR array_length(p_codes, 1) = 0 THEN
    RAISE EXCEPTION 'Aucun code fourni';
  END IF;

  DELETE FROM user_2fa_recovery_codes WHERE user_id = v_uid;

  FOREACH v_code IN ARRAY p_codes LOOP
    INSERT INTO user_2fa_recovery_codes (user_id, code_hash)
    VALUES (v_uid, crypt(v_code, gen_salt('bf', 8)));
  END LOOP;

  RETURN json_build_object('success', true, 'count', array_length(p_codes, 1));
END;
$$;
GRANT EXECUTE ON FUNCTION public.store_2fa_recovery_codes(text[]) TO authenticated;

COMMENT ON TABLE public.user_2fa_settings IS
  'Paramètres 2FA par utilisateur. Une ligne par user. Vérification TOTP côté client avec otpauth, lockout géré via record_2fa_attempt().';
COMMENT ON TABLE public.user_2fa_recovery_codes IS
  'Codes de récupération 2FA hachés via pgcrypto (bcrypt). Affichés en clair une seule fois.';
