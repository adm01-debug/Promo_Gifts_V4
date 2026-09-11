-- Substitui a implementação v2 (que inseria em silver_products/silver_variants dropadas)
-- pelo redirecionamento ao pipeline v1 (fn_standardize_raw + fn_standardize_variant + promote).
-- Remove fn_clean_spot_name (SPOT-specific) e classify_xbz_category (fallback XBZ inapropriado).
CREATE OR REPLACE FUNCTION public.fn_sm_to_silver(p_bronze_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_spr         public.supplier_products_raw%ROWTYPE;
  v_result_std  jsonb;
  v_result_var  jsonb;
  v_pad_id      uuid;
  v_parent_ref  text;
BEGIN
  -- ── 1. Carregar bronze ────────────────────────────────────────────────────
  SELECT * INTO v_spr FROM public.supplier_products_raw WHERE id = p_bronze_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'bronze_nao_encontrado',
      'id',      p_bronze_id
    );
  END IF;

  -- ── 2. v1 — padronizar produto (usa supplier_field_mappings SM) ───────────
  v_result_std := public.fn_standardize_raw(p_bronze_id);

  -- ── 3. v1 — padronizar variante (cor, estoque, faixas de preço) ──────────
  v_result_var := public.fn_standardize_variant(p_bronze_id);

  -- ── 4. Promover ao Gold se padronização OK ────────────────────────────────
  v_pad_id := (v_result_std->>'padronizacao_id')::uuid;

  IF v_pad_id IS NOT NULL
     AND COALESCE((v_result_std->>'success')::boolean, true) IS NOT FALSE
  THEN
    -- Promove produto
    PERFORM public.fn_promote_padronizacao(v_pad_id);

    -- Promove variante(s) — SM é 1:1, mas chama padrão
    v_parent_ref := public.fn_derive_parent_ref(
                      v_spr.supplier_id,
                      v_spr.supplier_reference,
                      v_spr.raw_data
                    );
    PERFORM public.fn_promote_variants_of_parent(v_spr.supplier_id, v_parent_ref);
  END IF;

  -- ── 5. Marcar bronze como processado ─────────────────────────────────────
  UPDATE public.supplier_products_raw
  SET    status       = 'processed',
         processed_at = now()
  WHERE  id = p_bronze_id;

  RETURN jsonb_build_object(
    'success',         true,
    'pipeline',        'v1',
    'bronze_id',       p_bronze_id,
    'reference',       v_spr.supplier_reference,
    'padronizacao_id', v_pad_id,
    'campos',          v_result_std->>'campos',
    'variante',        v_result_var->>'variante_id',
    'note',            'v2→v1: silver_products/silver_variants depreciados; fn_clean_spot_name e classify_xbz_category removidos'
  );

EXCEPTION WHEN OTHERS THEN
  -- Registrar erro sem crash
  UPDATE public.supplier_products_raw
  SET last_error = jsonb_build_object(
                     'fn',  'fn_sm_to_silver',
                     'msg', SQLERRM,
                     'ts',  now()
                   ),
      attempts   = COALESCE(attempts, 0) + 1
  WHERE id = p_bronze_id;

  RETURN jsonb_build_object(
    'success',   false,
    'error',     SQLERRM,
    'bronze_id', p_bronze_id
  );
END;
$fn$;;
