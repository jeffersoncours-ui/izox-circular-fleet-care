-- ============================================================
-- Messagerie opérateur ↔ admin (V1 — texte, offline-first)
-- ============================================================

-- 1. Table
CREATE TABLE public.operateur_messages (
  id                        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_operator_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id                 UUID        NOT NULL REFERENCES auth.users(id),
  content                   TEXT,
  image_url                 TEXT,
  client_local_id           UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at_admin             TIMESTAMPTZ,
  read_at_operator          TIMESTAMPTZ,
  CONSTRAINT chk_om_has_content CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

-- 2. Index perf
CREATE INDEX idx_om_conv_created ON public.operateur_messages (conversation_operator_id, created_at DESC);
CREATE INDEX idx_om_local_id     ON public.operateur_messages (client_local_id) WHERE client_local_id IS NOT NULL;

-- 3. RLS
ALTER TABLE public.operateur_messages ENABLE ROW LEVEL SECURITY;

-- Opérateur voit sa propre conversation
CREATE POLICY "om_select_own_conv" ON public.operateur_messages
  FOR SELECT
  USING (conversation_operator_id = auth.uid());

-- Admin / staff voient tout
CREATE POLICY "om_select_admin" ON public.operateur_messages
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

-- INSERT : sender_id = appelant, dans sa propre conv ou admin/staff dans n'importe quelle conv
CREATE POLICY "om_insert" ON public.operateur_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      conversation_operator_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role)
    )
  );

-- UPDATE (marquer lu) : opérateur sur sa conv
CREATE POLICY "om_update_operator" ON public.operateur_messages
  FOR UPDATE
  USING (conversation_operator_id = auth.uid());

-- UPDATE (marquer lu) : admin/staff partout
CREATE POLICY "om_update_admin" ON public.operateur_messages
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  );

-- 4. Trigger SECURITY DEFINER (bypass RLS pour INSERT dans notifications_internes)
CREATE OR REPLACE FUNCTION public.tg_message_notify_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_sender_role TEXT;
  v_sender_name TEXT;
BEGIN
  SELECT
    COALESCE(prenom || ' ' || nom, 'Opérateur'),
    role::text
  INTO v_sender_name, v_sender_role
  FROM public.profiles
  WHERE id = NEW.sender_id;

  IF v_sender_role = 'operateur' THEN
    -- Opérateur → notifier tous les admin/staff (sauf soi-même)
    INSERT INTO public.notifications_internes
      (user_id, source_action, titre, severite, link_url, details, statut)
    SELECT
      ur.user_id,
      'nouveau_message',
      'Message de ' || v_sender_name,
      'info',
      '/admin/equipe',
      jsonb_build_object(
        'conversation_operator_id', NEW.conversation_operator_id,
        'message_id', NEW.id
      ),
      'non_lu'::notification_statut_enum
    FROM public.user_roles ur
    WHERE ur.role IN ('admin'::public.app_role, 'staff'::public.app_role)
      AND ur.user_id <> NEW.sender_id;
  ELSE
    -- Admin/staff → notifier l'opérateur
    INSERT INTO public.notifications_internes
      (user_id, source_action, titre, severite, link_url, details, statut)
    VALUES (
      NEW.conversation_operator_id,
      'nouveau_message',
      'Nouveau message de ' || v_sender_name,
      'info',
      '/terrain',
      jsonb_build_object('message_id', NEW.id),
      'non_lu'::notification_statut_enum
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_message_notify
  AFTER INSERT ON public.operateur_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_message_notify_fn();
