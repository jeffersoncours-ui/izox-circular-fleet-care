-- target_id is optional: not every transactional email relates to a specific
-- target row (e.g. a public password-reset request, where we don't want to
-- leak/look up a user id). Making it nullable stops log inserts from silently
-- failing inside edge functions' try/catch blocks (which previously dropped
-- every welcome_account / password_reset log row on the floor).
ALTER TABLE public.email_logs ALTER COLUMN target_id DROP NOT NULL;
