
-- ═══════════════════════════════════════════════════════════════════
-- fn_promote_notebook_specs — Função mestre que:
-- 1. Identifica produtos Gold que são material gráfico
-- 2. Extrai todos os atributos via parsers
-- 3. Faz UPSERT em product_notebook_specs
-- 4. Sincroniza product_notebook_features
--
-- Modo de uso:
-- fn_promote_notebook_specs()            — processa todos pending
-- fn_promote_notebook_specs(p_product_id) — processa 1 produto
-- fn_promote_notebook_specs(p_limit := N) — processa até N produtos
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_promote_notebook_specs(
  p_product_id uuid    DEFAULT NULL,  -- NULL = processa todos
  p_limit      int     DEFAULT 500,   -- max por execução
  p_force      boolean DEFAULT false  -- re-processa mesmo se já existe
)
RETURNS jsonb  -- {processed, inserted, updated, features_added, errors, skipped}
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_processed   int := 0;
  v_inserted    int := 0;
  v_updated     int := 0;
  v_feat_added  int := 0;
  v_skipped     int := 0;
  v_errors      int := 0;
  v_error_sample text[] := ARRAY[]::text[];

  -- Cursor de produtos
  r RECORD;

  -- Valores extraídos
  v_format_code   text;
  v_ruling_code   text;
  v_weight_gsm    int;
  v_color_code    text;
  v_binding_code  text;
  v_binding_color text;
  v_cover_type    text;
  v_cover_mat     text;
  v_cover_finish  text;
  v_sheets        int;
  v_feature_codes text[];
  v_confidence    numeric;

  -- IDs das lookup tables
  v_format_id    uuid; v_ruling_id   uuid; v_weight_id   uuid;
  v_color_id     uuid; v_binding_id  uuid; v_bcolor_id   uuid;
  v_ctype_id     uuid; v_cmat_id     uuid; v_cfinish_id  uuid;
  v_feat_id      uuid;
  v_spec_id      uuid;

  v_lock_key     bigint := 88675432;  -- advisory lock para evitar runs paralelos
BEGIN
  -- ── Advisory lock (não-blocking) ─────────────────────────────
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN jsonb_build_object('skipped','already_running');
  END IF;

  -- ── Cursor de produtos a processar ───────────────────────────
  FOR r IN (
    SELECT DISTINCT
      p.id                         AS product_id,
      p.supplier_id,
      s.name                       AS supplier_name,
      pp.supplier_reference,
      pp.supplier_subtype,
      pp.supplier_subtype_code,
      pp.name,
      pp.description,
      pp.combined_sizes,
      pp.materials,
      pp.tags,
      pp.meta_keywords,
      pp.is_textil
    FROM products p
    JOIN suppliers s ON s.id = p.supplier_id
    -- Pegar dados do Silver (último promoted para este product_id)
    JOIN LATERAL (
      SELECT pp2.*
      FROM produtos_padronizacao pp2
      WHERE pp2.product_id = p.id
        AND pp2.status = 'promoted'
      ORDER BY pp2.promoted_at DESC NULLS LAST
      LIMIT 1
    ) pp ON true
    -- Filtrar por produto específico OU todos sem spec (ou force=true)
    WHERE (p_product_id IS NULL OR p.id = p_product_id)
      AND p.is_active = true
      AND fn_is_graphic_material(
            pp.supplier_subtype, pp.supplier_subtype_code,
            pp.name, pp.meta_keywords, pp.tags, pp.is_textil
          ) = true
      AND (
        p_force = true
        OR NOT EXISTS (
          SELECT 1 FROM product_notebook_specs pns WHERE pns.product_id = p.id
        )
      )
    ORDER BY p.id
    LIMIT p_limit
  ) LOOP

    BEGIN  -- Per-product exception block
      v_processed := v_processed + 1;

      -- ── Extrair todos os atributos ──────────────────────────
      v_format_code  := fn_parse_paper_format(r.tags, r.name, r.description, r.combined_sizes);
      v_ruling_code  := fn_parse_paper_ruling(r.tags, r.name, r.description);
      v_weight_gsm   := fn_parse_paper_weight(r.description);
      v_color_code   := fn_parse_paper_color_code(r.tags, r.description);
      v_binding_code := fn_parse_binding_type_code(r.name, r.description);
      v_cover_type   := fn_parse_cover_type_code(r.name, r.description);
      v_cover_mat    := fn_parse_cover_material_code(r.materials, r.name, r.description);
      v_cover_finish := NULL;  -- extraído via COVER_FINISHES na v2
      v_sheets       := fn_parse_sheet_count(r.description);
      v_feature_codes := fn_extract_notebook_feature_codes(r.tags, r.description, r.name);

      -- ── Resolver binding color ──────────────────────────────
      v_binding_color := fn_parse_binding_color_code(r.description);

      -- ── Calcular confidence score ───────────────────────────
      v_confidence := (
        (CASE WHEN v_format_code  IS NOT NULL THEN 0.20 ELSE 0 END) +
        (CASE WHEN v_cover_mat    IS NOT NULL THEN 0.20 ELSE 0 END) +
        (CASE WHEN v_ruling_code  IS NOT NULL THEN 0.15 ELSE 0 END) +
        (CASE WHEN v_cover_type   IS NOT NULL THEN 0.15 ELSE 0 END) +
        (CASE WHEN v_sheets       IS NOT NULL THEN 0.15 ELSE 0 END) +
        (CASE WHEN v_weight_gsm   IS NOT NULL THEN 0.10 ELSE 0 END) +
        (CASE WHEN v_binding_code IS NOT NULL THEN 0.05 ELSE 0 END)
      )::numeric(3,2);

      -- ── Resolver IDs das lookup tables ─────────────────────
      SELECT id INTO v_format_id   FROM paper_formats   WHERE code = v_format_code;
      SELECT id INTO v_ruling_id   FROM paper_rulings   WHERE code = v_ruling_code;
      SELECT id INTO v_weight_id   FROM paper_weights   WHERE weight_gsm = v_weight_gsm;
      SELECT id INTO v_color_id    FROM paper_colors    WHERE code = v_color_code;
      SELECT id INTO v_binding_id  FROM binding_types   WHERE code = v_binding_code;
      SELECT id INTO v_bcolor_id   FROM binding_colors  WHERE code = v_binding_color;
      SELECT id INTO v_ctype_id    FROM cover_types     WHERE code = v_cover_type;
      SELECT id INTO v_cmat_id     FROM cover_materials WHERE code = v_cover_mat;
      -- cover_finish: detectar MATTE/SOFT_TOUCH/GLOSSY via nome/descrição
      SELECT id INTO v_cfinish_id FROM cover_finishes WHERE code = (
        CASE 
          WHEN lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%soft touch%' THEN 'SOFT_TOUCH'
          WHEN lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%fosco%' THEN 'MATTE'
          WHEN lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%brilhante%' THEN 'GLOSSY'
          WHEN lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%metalizado%' THEN 'METALLIC'
          WHEN lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%alto relevo%' OR
               lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%emboss%' THEN 'EMBOSSED'
          WHEN lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%baixo relevo%' OR
               lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%deboss%' THEN 'DEBOSSED'
          WHEN lower(coalesce(r.name,'') || ' ' || coalesce(r.description,'')) ILIKE '%uv%' THEN 'UV_SPOT'
          ELSE NULL
        END
      );

      -- ── UPSERT em product_notebook_specs ───────────────────
      INSERT INTO product_notebook_specs (
        product_id, paper_format_id, paper_ruling_id, paper_weight_id,
        paper_color_id, binding_type_id, binding_color_id,
        cover_type_id, cover_material_id, cover_finish_id,
        sheet_count, source_supplier, confidence_score
      ) VALUES (
        r.product_id, v_format_id, v_ruling_id, v_weight_id,
        v_color_id, v_binding_id, v_bcolor_id,
        v_ctype_id, v_cmat_id, v_cfinish_id,
        v_sheets, r.supplier_name, v_confidence
      )
      ON CONFLICT (product_id) DO UPDATE SET
        paper_format_id   = EXCLUDED.paper_format_id,
        paper_ruling_id   = EXCLUDED.paper_ruling_id,
        paper_weight_id   = EXCLUDED.paper_weight_id,
        paper_color_id    = EXCLUDED.paper_color_id,
        binding_type_id   = EXCLUDED.binding_type_id,
        binding_color_id  = EXCLUDED.binding_color_id,
        cover_type_id     = EXCLUDED.cover_type_id,
        cover_material_id = EXCLUDED.cover_material_id,
        cover_finish_id   = EXCLUDED.cover_finish_id,
        sheet_count       = EXCLUDED.sheet_count,
        source_supplier   = EXCLUDED.source_supplier,
        confidence_score  = EXCLUDED.confidence_score,
        updated_at        = now()
      WHERE product_notebook_specs.manually_reviewed = false
      RETURNING id INTO v_spec_id;

      IF v_spec_id IS NOT NULL THEN
        v_inserted := v_inserted + 1;
      ELSE
        -- updated (ON CONFLICT hit mas NOT RETURNING = manually reviewed, skip)
        v_updated := v_updated + 1;
      END IF;

      -- ── Sincronizar product_notebook_features ───────────────
      -- Remove features antigas não-manuais e reinsere
      DELETE FROM product_notebook_features
      WHERE product_id = r.product_id;

      FOREACH v_format_code IN ARRAY coalesce(v_feature_codes, ARRAY[]::text[]) LOOP
        SELECT id INTO v_feat_id FROM notebook_features WHERE code = v_format_code;
        IF v_feat_id IS NOT NULL THEN
          INSERT INTO product_notebook_features (product_id, feature_id)
          VALUES (r.product_id, v_feat_id)
          ON CONFLICT (product_id, feature_id) DO NOTHING;
          v_feat_added := v_feat_added + 1;
        END IF;
      END LOOP;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      v_error_sample := array_append(v_error_sample,
        format('%s: %s', r.supplier_reference, SQLERRM)
      );
      IF array_length(v_error_sample, 1) > 5 THEN EXIT; END IF;
    END;

  END LOOP;

  v_skipped := p_limit - v_processed;
  IF v_skipped < 0 THEN v_skipped := 0; END IF;

  RETURN jsonb_build_object(
    'processed',      v_processed,
    'inserted',       v_inserted,
    'updated',        v_updated,
    'features_added', v_feat_added,
    'errors',         v_errors,
    'error_samples',  v_error_sample,
    'confidence_avg', (
      SELECT round(avg(confidence_score)::numeric, 2)
      FROM product_notebook_specs
      WHERE updated_at > now() - interval '5 minutes'
    )
  );
END;
$$;

COMMENT ON FUNCTION public.fn_promote_notebook_specs IS
  'Promove specs de material gráfico do Silver → Gold. 
   Usa advisory lock. Idempotente. Respeita manually_reviewed=true.
   Retorna jsonb com métricas de execução.';
;
