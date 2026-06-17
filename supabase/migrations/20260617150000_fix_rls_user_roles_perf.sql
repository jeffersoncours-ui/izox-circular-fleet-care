-- Perf fix: wrap auth.uid() in (SELECT ...) so PostgreSQL evaluates it once
-- per query instead of once per row. Logic is strictly identical — zero regression.
ALTER POLICY user_roles_self_select ON public.user_roles
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY user_roles_admin_all ON public.user_roles
  USING (has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'admin'::app_role));

ALTER POLICY user_roles_staff_select ON public.user_roles
  USING (has_role((SELECT auth.uid()), 'staff'::app_role));
