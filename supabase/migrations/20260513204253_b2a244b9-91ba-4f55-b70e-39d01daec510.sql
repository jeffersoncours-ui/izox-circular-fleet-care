-- ==========================================================
-- 3.A.6.2.c.1 - Table notifications_internes + enum + RLS + index
-- ==========================================================

-- A. ENUM
CREATE TYPE notification_statut_enum AS ENUM (
  'non_lu',
  'vu',
  'priorite',
  'archive'
);

COMMENT ON TYPE notification_statut_enum IS
'Cycle de vie d''une notification interne : non_lu (defaut) -> vu (consultee) -> archive (traitee). Priorite = epinglee en haut, necessite une action.';

-- B. TABLE
CREATE TABLE notifications_internes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Destinataire
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Source
  source_action text NOT NULL,
  source_log_id uuid REFERENCES admin_actions_log(id) ON DELETE SET NULL,

  -- Contenu
  titre text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  link_url text,

  -- Cycle de vie
  statut notification_statut_enum NOT NULL DEFAULT 'non_lu',
  action_requise boolean NOT NULL DEFAULT false,
  severite text NOT NULL DEFAULT 'info',

  -- Horodatage
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  archived_at timestamptz,

  CONSTRAINT chk_notif_severite_valide
    CHECK (severite IN ('info', 'warning', 'critical')),

  CONSTRAINT chk_notif_read_at_coherent
    CHECK (
      (statut = 'non_lu' AND read_at IS NULL)
      OR (statut <> 'non_lu' AND read_at IS NOT NULL)
    ),

  CONSTRAINT chk_notif_archived_at_coherent
    CHECK (
      (statut <> 'archive' AND archived_at IS NULL)
      OR (statut = 'archive' AND archived_at IS NOT NULL)
    )
);

COMMENT ON TABLE notifications_internes IS
'Centre de notifications interne pour l''equipe IZOX (admin/staff/commercial). Chaque evenement significatif genere des notifications ciblees. RLS stricte : chaque user ne voit que ses propres notifications. Deep link (link_url) pour navigation directe en 1 clic. Prevoir une purge automatique des notifications archivees > 6 mois (cron futur V2).';

COMMENT ON COLUMN notifications_internes.source_action IS
'Type d''action qui a declenche la notification (gel_contrat, cron_cloture_mensuelle, etc.). Correspond a admin_actions_log.action.';

COMMENT ON COLUMN notifications_internes.link_url IS
'Deep link vers la page concernee (ex: /admin/contrats/uuid). Permet la navigation directe en 1 clic depuis le centre de notifications.';

COMMENT ON COLUMN notifications_internes.action_requise IS
'Si true, la notification ne peut pas etre simplement marquee "vu" : elle reste epinglee tant qu''elle n''est pas archivee apres traitement. Utilisee pour les dormants a relancer, vehicules a valider, erreurs a corriger.';

COMMENT ON COLUMN notifications_internes.severite IS
'Niveau de severite visuelle : info (bleu/neutre, evenement informatif), warning (orange, attention requise), critical (rouge, action urgente). Determine la couleur et l''icone dans l''UI.';

-- C. INDEX
CREATE INDEX idx_notif_user_actives
  ON notifications_internes(user_id, created_at DESC)
  WHERE statut <> 'archive';

CREATE INDEX idx_notif_user_non_lues
  ON notifications_internes(user_id)
  WHERE statut = 'non_lu';

CREATE INDEX idx_notif_user_priorite
  ON notifications_internes(user_id, created_at DESC)
  WHERE statut = 'priorite';

CREATE INDEX idx_notif_source_log
  ON notifications_internes(source_log_id)
  WHERE source_log_id IS NOT NULL;

CREATE UNIQUE INDEX idx_notif_dedup
  ON notifications_internes(user_id, source_log_id)
  WHERE source_log_id IS NOT NULL;

-- D. RLS
ALTER TABLE notifications_internes ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_notif_select_own
  ON notifications_internes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY p_notif_update_own
  ON notifications_internes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY p_notif_insert_admin
  ON notifications_internes
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY p_notif_delete_admin
  ON notifications_internes
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
