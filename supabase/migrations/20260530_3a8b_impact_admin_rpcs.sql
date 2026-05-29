-- ============================================================
-- Module 3.A.8b — RPCs admin Impact RSE
-- Bypass du schema cache PostgREST pour impact_coefficients
-- et impact_records (opérations admin)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. get_impact_coefficients() — lecture admin/staff
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_impact_coefficients()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN (
    SELECT COALESCE(
      json_agg(row_to_json(c) ORDER BY c.category, c.code),
      '[]'::json
    )
    FROM impact_coefficients c
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_impact_coefficients() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_impact_coefficients() FROM anon;


-- ────────────────────────────────────────────────────────────
-- 2. update_impact_coefficient(id, updates JSONB) — admin/staff
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_impact_coefficient(
  p_id      UUID,
  p_updates JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  UPDATE impact_coefficients SET
    label      = CASE WHEN p_updates ? 'label'      THEN p_updates->>'label'               ELSE label      END,
    value      = CASE WHEN p_updates ? 'value'      THEN (p_updates->>'value')::NUMERIC     ELSE value      END,
    unit       = CASE WHEN p_updates ? 'unit'       THEN p_updates->>'unit'                ELSE unit       END,
    source     = CASE WHEN p_updates ? 'source'     THEN p_updates->>'source'              ELSE source     END,
    esrs_topic = CASE WHEN p_updates ? 'esrs_topic' THEN p_updates->>'esrs_topic'          ELSE esrs_topic END,
    active     = CASE WHEN p_updates ? 'active'     THEN (p_updates->>'active')::BOOLEAN   ELSE active     END,
    updated_at = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_impact_coefficient(UUID, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_impact_coefficient(UUID, JSONB) FROM anon;


-- ────────────────────────────────────────────────────────────
-- 3. get_estimated_impact_records() — lecture admin/staff
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_estimated_impact_records()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id',                   r.id,
        'intervention_id',      r.intervention_id,
        'contrat_id',           r.contrat_id,
        'entreprise_id',        r.entreprise_id,
        'coefficient_id',       r.coefficient_id,
        'coefficient_snapshot', r.coefficient_snapshot,
        'category',             r.category,
        'quantity',             r.quantity,
        'unit',                 r.unit,
        'status',               r.status,
        'validated_by',         r.validated_by,
        'validated_at',         r.validated_at,
        'created_at',           r.created_at,
        'interventions', json_build_object(
          'date_intervention', i.date_intervention,
          'vehicules', json_build_object('immatriculation', v.immatriculation)
        ),
        'entreprises', json_build_object('nom', e.nom)
      ) ORDER BY r.created_at DESC
    ), '[]'::json)
    FROM impact_records r
    LEFT JOIN interventions i ON i.id = r.intervention_id
    LEFT JOIN vehicules     v ON v.id = i.vehicule_id
    LEFT JOIN entreprises   e ON e.id = r.entreprise_id
    WHERE r.status = 'estimated'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_estimated_impact_records() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_estimated_impact_records() FROM anon;


-- ────────────────────────────────────────────────────────────
-- 4. validate_impact_records_by_intervention(id, user) — admin/staff
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_impact_records_by_intervention(
  p_intervention_id UUID,
  p_validated_by    UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role::text IN ('admin','staff')
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  UPDATE impact_records SET
    status       = 'validated',
    validated_by = p_validated_by,
    validated_at = now()
  WHERE intervention_id = p_intervention_id
    AND status = 'estimated';
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_impact_records_by_intervention(UUID, UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_impact_records_by_intervention(UUID, UUID) FROM anon;
