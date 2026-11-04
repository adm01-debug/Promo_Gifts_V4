CREATE OR REPLACE FUNCTION public.fn_sm_url_map_build()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'extensions'
AS $function$
DECLARE
  v_sup      uuid := '841cd690-210a-422a-908c-7676828db272';
  v_seeded   int  := 0;
  v_resolved int  := 0;
  v_coverage numeric;
BEGIN

  -- ── STEP 1: Seed — insere todos os SM do Bronze no mapa (idempotente) ──
  -- Para cada produto, pré-popula com slug derivado do título canônico.
  -- site_id fica NULL até ser resolvido.
  INSERT INTO public.sm_site_url_map (
    supplier_id, codigo, slug, source, confidence
  )
  SELECT
    v_sup,
    raw_data->>'codigo'                           AS codigo,
    public.fn_slugify(raw_data->>'titulo')        AS slug,
    'bronze_seed',
    'low'    -- baixa confiança até termos o site_id real
  FROM supplier_products_raw
  WHERE supplier_id = v_sup
    AND (raw_data->>'codigo') IS NOT NULL
    AND btrim(raw_data->>'codigo') <> ''
  ON CONFLICT (supplier_id, codigo) DO UPDATE
    SET slug = COALESCE(sm_site_url_map.slug, EXCLUDED.slug)
    -- nunca sobrescreve slug já confirmado; só preenche NULL
  WHERE sm_site_url_map.slug IS NULL;

  GET DIAGNOSTICS v_seeded = ROW_COUNT;

  -- ── STEP 2: Similares parse ─────────────────────────────────────────────
  -- A. Explode produtos_similares em (codigo, site_id) via CTE
  -- B. JOIN com Bronze para obter o slug do título canônico
  -- C. UPSERT com site_id real + confidence='high'
  WITH

  raw_rows AS (
    SELECT raw_data->>'produtos_similares' AS sim_raw
    FROM supplier_products_raw
    WHERE supplier_id = v_sup
      AND raw_data->>'produtos_similares' IS NOT NULL
      AND raw_data->>'produtos_similares' NOT IN ('Nenhum', '', 'nenhum')
  ),

  -- Explode por ';'
  entries AS (
    SELECT btrim(entry) AS entry
    FROM raw_rows,
    LATERAL unnest(string_to_array(sim_raw, ';')) AS entry
    WHERE btrim(entry) <> ''
  ),

  -- Parse pipe-delimited: [codigo, hex, site_id, img, titulo]
  parsed AS (
    SELECT
      parts[1]                                          AS codigo,
      parts[3]                                          AS site_id_str
    FROM entries,
    LATERAL (SELECT string_to_array(entry, '|') AS parts) p
    WHERE array_length(string_to_array(entry, '|'), 1) >= 3
  ),

  -- Validar e desduplicar; descartar site_id=0 ou inválidos
  validated AS (
    SELECT DISTINCT ON (codigo)
      btrim(codigo) AS codigo,
      site_id_str::int AS site_id
    FROM parsed
    WHERE codigo IS NOT NULL
      AND btrim(codigo) <> ''
      AND codigo ~ '^[A-Z]{2,3}-[0-9]+'     -- formato esperado: AS-00610, IP-00503, KT-90397…
      AND site_id_str ~ '^[1-9][0-9]*$'     -- inteiro positivo (exclui 0)
    ORDER BY codigo, site_id_str::int DESC  -- pega o maior site_id em duplicatas (mais recente)
  ),

  -- JOIN com Bronze: slug derivado do título CANÔNICO (não abreviado do similares)
  enriched AS (
    SELECT
      v.codigo,
      v.site_id,
      COALESCE(
        public.fn_slugify(spr.raw_data->>'titulo'),  -- título completo do Bronze
        public.fn_slugify(v.codigo)                  -- fallback: slug do próprio código
      ) AS slug_canonico
    FROM validated v
    LEFT JOIN supplier_products_raw spr
      ON  spr.supplier_id = v_sup
      AND spr.raw_data->>'codigo' = v.codigo
  )

  INSERT INTO public.sm_site_url_map (
    supplier_id, codigo, site_id, slug, source, confidence, last_verified_at
  )
  SELECT
    v_sup, e.codigo, e.site_id, e.slug_canonico, 'produtos_similares', 'high', now()
  FROM enriched e
  ON CONFLICT (supplier_id, codigo) DO UPDATE
    SET
      site_id          = EXCLUDED.site_id,
      slug             = EXCLUDED.slug,
      source           = EXCLUDED.source,
      confidence       = EXCLUDED.confidence,
      last_verified_at = EXCLUDED.last_verified_at
    -- Atualiza sempre que a nova fonte tem site_id confirmado
    WHERE sm_site_url_map.site_id IS DISTINCT FROM EXCLUDED.site_id
       OR sm_site_url_map.slug    IS DISTINCT FROM EXCLUDED.slug;

  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  -- ── STEP 3: Cobertura ──────────────────────────────────────────────────
  SELECT round(100.0 *
    (SELECT count(*) FROM public.sm_site_url_map
     WHERE supplier_id=v_sup AND site_id IS NOT NULL)
    /
    NULLIF((SELECT count(*) FROM supplier_products_raw WHERE supplier_id=v_sup), 0)
  , 1)
  INTO v_coverage;

  RETURN jsonb_build_object(
    'step1_seed_upserted',   v_seeded,
    'step2_resolved',        v_resolved,
    'total_in_map',          (SELECT count(*) FROM sm_site_url_map WHERE supplier_id=v_sup),
    'with_site_id',          (SELECT count(*) FROM sm_site_url_map WHERE supplier_id=v_sup AND site_id IS NOT NULL),
    'without_site_id',       (SELECT count(*) FROM sm_site_url_map WHERE supplier_id=v_sup AND site_id IS NULL),
    'coverage_pct',          v_coverage,
    'bronze_total',          (SELECT count(*) FROM supplier_products_raw WHERE supplier_id=v_sup),
    'ts',                    now()
  );
END;
$function$
