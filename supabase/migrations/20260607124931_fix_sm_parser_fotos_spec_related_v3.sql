
-- ============================================================
--  BUG FIX 5+6+7: fn_parse_sm_site_markdown v3
--
--  BUG 6 (CRÍTICO): fotos_cdn capturava ALL URLs CDN incluindo
--    thumbnails m/ de produtos RELACIONADOS.
--    Fix: excluir /m/ prefix; manter apenas /g/, /p/, hash-files
--         e imagens_site/ (sem v4 subfolder)
--
--  BUG 7: spec_tecnica regex apenas .png — arquivo real é .jpg
--    Fix: aceitar .jpg e .png na regex de hash-filename
--
--  BUG 5: relacionados sem codigo eram ignorados no collect.
--    Fix no PARSER: emitir relacionados sem codigo também
--    (fn_sm_site_collect os insere na URL map via fn_sm_url_map_from_site_urls)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_parse_sm_site_markdown(
    p_md        text,
    p_source_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_codigo      text;
  v_video_url   text;
  v_spec_url    text;
  v_photos      text[];
  v_related     jsonb    := '[]'::jsonb;
  v_price_tiers jsonb;
  v_master      jsonb;
  v_ncm         text;
  v_ipi         numeric;
  v_estoque     int;
  v_m           text[];
  v_m2          text[];
  v_tiers       jsonb    := '[]'::jsonb;
  v_qtds        text[];
  v_p_si        text[];
  v_p_ci        text[];
  v_i           int;
  v_rel_sid     int;
  v_rel_slug    text;
  v_rel_codigo  text;
  v_ctx_start   int;
  v_ctx         text;
BEGIN
  IF p_md IS NULL OR length(btrim(p_md)) < 200 THEN
    RETURN jsonb_build_object('error','conteudo_vazio','len',length(COALESCE(p_md,'')));
  END IF;

  -- 1. Código do produto (SM código: AS-00610, LE-31723, etc.)
  v_m := regexp_match(p_md, '\b([A-Z]{2,3}-[0-9]{4,6}(?:-[0-9]+)?)\b');
  IF v_m IS NOT NULL THEN v_codigo := v_m[1]; END IF;

  -- 2. Vídeo YouTube
  v_m := regexp_match(p_md, 'youtube\.com/watch\?v=([A-Za-z0-9_-]{6,15})');
  IF v_m IS NOT NULL THEN
    v_video_url := 'https://www.youtube.com/watch?v=' || v_m[1];
  ELSE
    v_m := regexp_match(p_md, 'youtube\.com/embed/([A-Za-z0-9_-]{6,15})');
    IF v_m IS NOT NULL THEN
      v_video_url := 'https://www.youtube.com/watch?v=' || v_m[1];
    END IF;
  END IF;

  -- 3. Spec técnica (BUG 7 FIX: aceitar .jpg E .png no hash-filename)
  v_m := regexp_match(p_md,
    'Especifica[cç][oõ]es? T[eé]cnicas\]\((https://[^)]+\.(?:png|jpg|jpeg))\)', 'i');
  IF v_m IS NOT NULL THEN
    v_spec_url := v_m[1];
  ELSE
    -- Hash-filename: 30+ hex chars + extensão (.png ou .jpg)
    v_m := regexp_match(p_md,
      '(https://somarcascdn\.azureedge\.net/upload/imagens_site_v4/[a-f0-9]{30,}\.(?:png|jpg|jpeg))');
    IF v_m IS NOT NULL THEN v_spec_url := v_m[1]; END IF;
  END IF;

  -- 4. Fotos CDN (BUG 6 FIX: excluir thumbnails m/ de produtos relacionados)
  --    Aceitar apenas:
  --    • /imagens_site_v4/g/  ← fotos grandes do produto
  --    • /imagens_site_v4/p/  ← thumbnails do produto
  --    • /imagens_site_v4/{hash}.{ext}  ← spec técnica / hero
  --    • /imagens_site/{filename}  ← imagens legado
  --    EXCLUIR: /imagens_site_v4/m/ (thumbnails de relacionados)
  SELECT array_agg(DISTINCT m[1])
  INTO   v_photos
  FROM   regexp_matches(p_md,
    '(https://somarcas(?:cdn)?\.azureedge\.net/upload/(?:'
      'imagens_site_v4/[gp]/[^"\)\s]+\.(?:webp|jpg|png|jpeg)'
      '|imagens_site_v4/[a-f0-9]{20,}\.[a-z]+'    -- hash-filename spec
      '|imagens_site/[^"\)\s]+\.(?:webp|jpg|png|jpeg)'  -- legado sem v4
    '))', 'g') m
  WHERE m[1] NOT ILIKE '%/m/%';   -- guaraná extra: excluir /m/ explicitamente

  -- 5. Produtos relacionados (BUG 5 FIX: emitir TODOS, com ou sem codigo)
  FOR v_m IN
    SELECT regexp_matches(p_md,
      'somarcas\.com\.br/([0-9]+)/produto/([a-z0-9][a-z0-9-]+[a-z0-9])', 'g')
  LOOP
    v_rel_sid  := v_m[1]::int;
    v_rel_slug := v_m[2];
    v_rel_codigo := NULL;

    -- Tenta extrair codigo do contexto próximo (janela de 250 chars antes/depois)
    v_ctx_start := strpos(p_md, v_m[1] || '/produto/' || v_m[2]);
    IF v_ctx_start > 0 THEN
      v_ctx := substring(p_md FROM GREATEST(1, v_ctx_start - 250) FOR 280);
      -- Formato bold: **AS-00610**
      v_m2 := regexp_match(v_ctx, '\*\*([A-Z]{2,3}-[0-9]{4,6}(?:-[0-9]+)?)\*\*');
      IF v_m2 IS NOT NULL THEN v_rel_codigo := v_m2[1]; END IF;
    END IF;

    -- BUG 5 FIX: emitir SEMPRE (mesmo sem codigo)
    -- fn_sm_site_collect vai decidir o que fazer com cada tipo
    v_related := v_related || jsonb_build_object(
      'site_id', v_rel_sid,
      'slug',    v_rel_slug,
      'codigo',  v_rel_codigo   -- NULL quando não detectado — OK
    );
  END LOOP;

  -- Desduplicar por site_id
  IF jsonb_array_length(v_related) > 0 THEN
    SELECT jsonb_agg(r) INTO v_related
    FROM (
      SELECT DISTINCT ON ((r->>'site_id')::int) r
      FROM jsonb_array_elements(v_related) r
      ORDER BY (r->>'site_id')::int,
               CASE WHEN r->>'codigo' IS NOT NULL THEN 0 ELSE 1 END  -- prioriza com codigo
    ) s;
  END IF;

  -- 6. Tabela de preços (requer auth)
  IF position('50 un' IN p_md) > 0 AND position('Sem impostos' IN p_md) > 0 THEN
    v_m := regexp_match(p_md, 'Qualquer un\.[^\n]*([0-9]+\s*un[^\n]+)\n');
    IF v_m IS NOT NULL THEN
      SELECT array_agg(trim(q.q)) INTO v_qtds
      FROM regexp_split_to_table(v_m[1], '\|') q(q)
      WHERE trim(q.q) ~ '[0-9]+\s*un';
    END IF;
    v_m := regexp_match(p_md, 'Sem impostos[^\n]*\n([^\n]+)');
    IF v_m IS NOT NULL THEN
      SELECT array_agg(replace(m[1],',','.')) INTO v_p_si
      FROM regexp_matches(v_m[1], 'R\$\s*([0-9]+[,\.][0-9]+)', 'g') m;
    END IF;
    v_m := regexp_match(p_md, 'Com IPI[^\n]*\n([^\n]+)');
    IF v_m IS NOT NULL THEN
      SELECT array_agg(replace(m[1],',','.')) INTO v_p_ci
      FROM regexp_matches(v_m[1], 'R\$\s*([0-9]+[,\.][0-9]+)', 'g') m;
    END IF;
    IF v_qtds IS NOT NULL AND v_p_si IS NOT NULL THEN
      FOR v_i IN 1..LEAST(array_length(v_qtds,1), array_length(v_p_si,1)) LOOP
        v_tiers := v_tiers || jsonb_build_object(
          'qtd_label',     v_qtds[v_i],
          'preco_sem_ipi', v_p_si[v_i]::numeric,
          'preco_com_ipi', CASE WHEN v_p_ci IS NOT NULL
                                AND v_i <= array_length(v_p_ci,1)
                                THEN v_p_ci[v_i]::numeric ELSE NULL END
        );
      END LOOP;
      IF jsonb_array_length(v_tiers) > 0 THEN v_price_tiers := v_tiers; END IF;
    END IF;
  END IF;

  -- 7. Caixa Master
  DECLARE v_mq text[]; v_mw text[]; BEGIN
    v_m  := regexp_match(p_md, 'DIMENS[OÕ]ES[^\n]*CAIXA[^\n]*\n[^\n]*?([0-9].{5,25}cm)', 'i');
    v_mq := regexp_match(p_md, '([0-9]+)\s+unidades?\s+por\s+caixa', 'i');
    v_mw := regexp_match(p_md, 'PESO\s+TOTAL[^\n]*\n[^\n]*?([0-9]+[,.]?[0-9]*)\s*kg', 'i');
    IF v_m IS NOT NULL OR v_mq IS NOT NULL OR v_mw IS NOT NULL THEN
      v_master := jsonb_strip_nulls(jsonb_build_object(
        'dims',    CASE WHEN v_m  IS NOT NULL THEN v_m[1]  ELSE NULL END,
        'qtd',     CASE WHEN v_mq IS NOT NULL THEN v_mq[1]::int ELSE NULL END,
        'peso_kg', CASE WHEN v_mw IS NOT NULL THEN replace(v_mw[1],',','.')::numeric ELSE NULL END
      ));
      IF v_master = '{}'::jsonb THEN v_master := NULL; END IF;
    END IF;
  END;

  -- 8. NCM / IPI / Estoque
  v_m := regexp_match(p_md, '\bNCM\b[^\n]*?([0-9]{8})', 'i');
  IF v_m IS NOT NULL THEN v_ncm := v_m[1]; END IF;

  v_m := regexp_match(p_md, 'IPI[^0-9]*([0-9]+[,.]?[0-9]*)\s*%', 'i');
  IF v_m IS NOT NULL THEN v_ipi := replace(v_m[1],',','.')::numeric; END IF;

  v_m := regexp_match(p_md, 'Estoque\s+de\s+([0-9.]+)\s+unidades', 'i');
  IF v_m IS NOT NULL THEN v_estoque := replace(v_m[1],'.','')::int; END IF;

  RETURN jsonb_strip_nulls(jsonb_build_object(
    'scraped_at',        now(),
    'source_url',        p_source_url,
    'codigo_detectado',  v_codigo,
    'video_url',         v_video_url,
    'spec_tecnica_url',  v_spec_url,
    'fotos_cdn',         CASE WHEN v_photos IS NOT NULL THEN to_jsonb(v_photos) ELSE NULL END,
    'relacionados',      CASE WHEN jsonb_array_length(v_related) > 0 THEN v_related ELSE NULL END,
    'price_tiers',       v_price_tiers,
    'caixa_master',      v_master,
    'ncm_site',          v_ncm,
    'ipi_site',          v_ipi,
    'estoque_site',      v_estoque,
    'is_authenticated',  (v_price_tiers IS NOT NULL OR v_master IS NOT NULL)
  ));
END;
$$;

COMMENT ON FUNCTION public.fn_parse_sm_site_markdown IS
    'v3 — Fixes: '
    '(6) fotos_cdn exclui thumbnails m/ de relacionados; '
    '(7) spec_tecnica aceita .jpg e .png; '
    '(5) relacionados emitidos mesmo sem codigo; '
    'VOLATILE (usa now()).';
;
