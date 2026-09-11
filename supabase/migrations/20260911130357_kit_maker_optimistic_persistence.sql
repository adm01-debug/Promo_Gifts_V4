-- Kit Maker: forward-only optimistic persistence for custom_kits.
--
-- This migration is intentionally additive. It does not rewrite historical
-- snapshots, relax RLS, or alter any existing policy on custom_kits.
-- Apply only after reconciling the canonical migration ledger with this repo.

ALTER TABLE public.custom_kits
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.custom_kits'::regclass
       AND conname = 'custom_kits_revision_non_negative'
  ) THEN
    ALTER TABLE public.custom_kits
      ADD CONSTRAINT custom_kits_revision_non_negative CHECK (revision >= 0) NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.custom_kits
  VALIDATE CONSTRAINT custom_kits_revision_non_negative;

CREATE TABLE IF NOT EXISTS public.kit_save_requests (
  request_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kit_id uuid NOT NULL REFERENCES public.custom_kits(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kit_save_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kit_save_requests_select_own ON public.kit_save_requests;
CREATE POLICY kit_save_requests_select_own
  ON public.kit_save_requests
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS kit_save_requests_insert_own ON public.kit_save_requests;
CREATE POLICY kit_save_requests_insert_own
  ON public.kit_save_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.save_custom_kit_atomic(
  p_request_id uuid,
  p_kit_id uuid,
  p_expected_revision integer,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_kit public.custom_kits%ROWTYPE;
  v_existing_kit_id uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_request_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'request_id and object payload are required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_payload->'items_data', 'null'::jsonb)) <> 'array'
    OR jsonb_typeof(COALESCE(p_payload->'personalization_data', 'null'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'items_data must be an array and personalization_data must be an object'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE((p_payload->>'kit_quantity')::integer, 0) < 1
    OR COALESCE((p_payload->>'box_price')::numeric, -1) < 0
    OR COALESCE((p_payload->>'items_price')::numeric, -1) < 0
    OR COALESCE((p_payload->>'personalization_price')::numeric, -1) < 0
    OR COALESCE((p_payload->>'total_price')::numeric, -1) < 0
    OR COALESCE((p_payload->>'volume_usage_percent')::numeric, -1) < 0 THEN
    RAISE EXCEPTION 'kit quantity, prices and volume usage must be non-negative (quantity >= 1)'
      USING ERRCODE = '22023';
  END IF;

  SELECT kit_id
    INTO v_existing_kit_id
    FROM public.kit_save_requests
   WHERE request_id = p_request_id
     AND user_id = auth.uid();

  IF v_existing_kit_id IS NOT NULL THEN
    SELECT * INTO v_kit
      FROM public.custom_kits
     WHERE id = v_existing_kit_id
       AND user_id = auth.uid();
    RETURN to_jsonb(v_kit);
  END IF;

  v_status := COALESCE(p_payload->>'status', 'draft');
  IF v_status NOT IN ('draft', 'ready') THEN
    RAISE EXCEPTION 'Kit save accepts only draft or ready status' USING ERRCODE = '22023';
  END IF;

  IF p_kit_id IS NULL THEN
    INSERT INTO public.custom_kits (
      user_id, name, status, kit_type, box_data, items_data, personalization_data,
      kit_quantity, box_price, items_price, personalization_price, total_price,
      volume_usage_percent, color, icon, tag, description, is_favorite, revision
    ) VALUES (
      auth.uid(),
      COALESCE(NULLIF(btrim(p_payload->>'name'), ''), 'Kit sem nome'),
      v_status,
      COALESCE(NULLIF(p_payload->>'kit_type', ''), 'montado'),
      p_payload->'box_data',
      p_payload->'items_data',
      p_payload->'personalization_data',
      (p_payload->>'kit_quantity')::integer,
      (p_payload->>'box_price')::numeric,
      (p_payload->>'items_price')::numeric,
      (p_payload->>'personalization_price')::numeric,
      (p_payload->>'total_price')::numeric,
      (p_payload->>'volume_usage_percent')::numeric,
      COALESCE(NULLIF(p_payload->>'color', ''), '#3B82F6'),
      COALESCE(NULLIF(p_payload->>'icon', ''), 'Package'),
      NULLIF(p_payload->>'tag', ''),
      NULLIF(p_payload->>'description', ''),
      COALESCE((p_payload->>'is_favorite')::boolean, false),
      0
    )
    RETURNING * INTO v_kit;
  ELSE
    IF p_expected_revision IS NULL OR p_expected_revision < 0 THEN
      RAISE EXCEPTION 'expected revision is required to update a kit' USING ERRCODE = '22023';
    END IF;

    UPDATE public.custom_kits
       SET name = COALESCE(NULLIF(btrim(p_payload->>'name'), ''), name),
           status = v_status,
           kit_type = COALESCE(NULLIF(p_payload->>'kit_type', ''), kit_type),
           box_data = p_payload->'box_data',
           items_data = p_payload->'items_data',
           personalization_data = p_payload->'personalization_data',
           kit_quantity = (p_payload->>'kit_quantity')::integer,
           box_price = (p_payload->>'box_price')::numeric,
           items_price = (p_payload->>'items_price')::numeric,
           personalization_price = (p_payload->>'personalization_price')::numeric,
           total_price = (p_payload->>'total_price')::numeric,
           volume_usage_percent = (p_payload->>'volume_usage_percent')::numeric,
           color = COALESCE(NULLIF(p_payload->>'color', ''), color),
           icon = COALESCE(NULLIF(p_payload->>'icon', ''), icon),
           tag = NULLIF(p_payload->>'tag', ''),
           description = NULLIF(p_payload->>'description', ''),
           is_favorite = COALESCE((p_payload->>'is_favorite')::boolean, false),
           revision = revision + 1,
           updated_at = now()
     WHERE id = p_kit_id
       AND user_id = auth.uid()
       AND revision = p_expected_revision
     RETURNING * INTO v_kit;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kit was changed or is no longer accessible. Reload before saving again.'
        USING ERRCODE = '40001';
    END IF;
  END IF;

  INSERT INTO public.kit_save_requests (request_id, user_id, kit_id)
  VALUES (p_request_id, auth.uid(), v_kit.id);

  RETURN to_jsonb(v_kit);
END;
$$;

REVOKE ALL ON FUNCTION public.save_custom_kit_atomic(uuid, uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_custom_kit_atomic(uuid, uuid, integer, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_custom_kit_atomic(uuid, uuid, integer, jsonb) IS
  'Kit Maker optimistic save: idempotent by request_id and conflict-safe by revision.';
