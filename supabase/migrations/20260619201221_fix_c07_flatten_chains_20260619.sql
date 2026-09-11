-- ── Repair: flatten chain 1 ────────────────────────────────────────────────────
UPDATE public.product_images
SET canonical_image_id   = '6ca5eddb-d923-401f-83bd-4a1b45b6391b',
    last_modified_source = 'migration',
    updated_at           = now()
WHERE id = 'abda0161-ae08-4212-a1fc-47a395afa3cf';

-- ── Repair: flatten chain 2 ────────────────────────────────────────────────────
UPDATE public.product_images
SET canonical_image_id   = '4cccd0e1-2676-4311-bbc2-c6edfe0f3fc8',
    last_modified_source = 'migration',
    updated_at           = now()
WHERE id = 'eab69176-0a91-4251-87b4-c5d3466a5813';

-- ── Repair: flatten chain 3 ────────────────────────────────────────────────────
UPDATE public.product_images
SET canonical_image_id   = '22d82e57-bf18-48d6-bcf7-e4a29c4047df',
    last_modified_source = 'migration',
    updated_at           = now()
WHERE id = '0004ae2c-278c-4937-a983-51798cd7210d';

-- ── Utility: general-purpose chain repair function ─────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_repair_canonical_chains(p_max_iterations int DEFAULT 10)
RETURNS TABLE(iterations_run int, chains_repaired bigint)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_iteration  int := 0;
  v_repaired   bigint;
  v_total      bigint := 0;
BEGIN
  LOOP
    v_iteration := v_iteration + 1;
    EXIT WHEN v_iteration > p_max_iterations;

    WITH chains AS (
      SELECT
        child.id                         AS child_id,
        mid.canonical_image_id           AS true_root_id
      FROM public.product_images child
      JOIN public.product_images mid ON mid.id = child.canonical_image_id
      WHERE child.canonical_image_id IS NOT NULL
        AND mid.canonical_image_id IS NOT NULL
        AND child.deleted_at IS NULL
      LIMIT 10000
    )
    UPDATE public.product_images pi
    SET canonical_image_id   = c.true_root_id,
        last_modified_source = 'migration',
        updated_at           = now()
    FROM chains c
    WHERE pi.id = c.child_id;

    GET DIAGNOSTICS v_repaired = ROW_COUNT;
    v_total := v_total + v_repaired;

    EXIT WHEN v_repaired = 0;
  END LOOP;

  RETURN QUERY SELECT v_iteration, v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_repair_canonical_chains(int) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_repair_canonical_chains(int) TO service_role;

-- ── Self-test: verify C07 = 0 after repair ─────────────────────────────────────
DO $$
DECLARE v_chains bigint;
BEGIN
  SELECT COUNT(*) INTO v_chains
  FROM public.product_images pi_child
  JOIN public.product_images pi_root ON pi_root.id = pi_child.canonical_image_id
  WHERE pi_child.canonical_image_id IS NOT NULL
    AND pi_root.canonical_image_id IS NOT NULL;

  IF v_chains <> 0 THEN
    RAISE EXCEPTION 'post-repair C07 assertion failed: % chains remain', v_chains;
  END IF;
END;
$$;;
