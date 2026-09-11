
-- ============================================================
--  SM CATEGORY SCRAPING PIPELINE
--  Fase: descoberta de site_ids via páginas de categoria
--
--  Estratégia:
--  1. sm_category_pages: tabela de categorias a scraper
--  2. Seed via matriz_de_categorias do Bronze
--  3. fn_sm_category_enqueue: Jina requests para cada categoria
--  4. fn_sm_category_collect: extrai (site_id, slug) → fn_sm_url_map_from_site_urls
-- ============================================================

-- ── 1. Tabela sm_category_pages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sm_category_pages (
    id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name            text        NOT NULL,     -- ex.: "Copos, Canecas, Squeezes e Garrafas"
    slug            text        NOT NULL,     -- ex.: "copos-canecas-squeezes-e-garrafas"
    category_id     integer,                  -- site_id da categoria (descoberto via scrape)
    site_url        text GENERATED ALWAYS AS (
                      CASE WHEN category_id IS NOT NULL
                           THEN 'https://www.somarcas.com.br/'
                                || category_id::text
                                || '/categorias/'
                                || slug
                           ELSE NULL
                      END
                    ) STORED,
    -- Status do scraping
    status          text        NOT NULL DEFAULT 'pending',
    fetch_req_id    bigint,
    attempts        integer     NOT NULL DEFAULT 0,
    last_error      text,
    last_scraped_at timestamptz,
    products_found  integer     DEFAULT 0,    -- quantos produtos encontrados nesta página
    -- Paginação (SM categorias podem ter várias páginas)
    current_page    integer     NOT NULL DEFAULT 1,
    has_more_pages  boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT sm_category_pages_slug_uq UNIQUE (slug),
    CONSTRAINT sm_category_pages_status_chk
        CHECK (status IN ('pending','processing','done','failed','partial'))
);

CREATE INDEX IF NOT EXISTS sm_category_pages_status_idx ON public.sm_category_pages (status);
CREATE INDEX IF NOT EXISTS sm_category_pages_cid_idx    ON public.sm_category_pages (category_id)
    WHERE category_id IS NOT NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.fn_sm_category_set_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sm_category_updated ON public.sm_category_pages;
CREATE TRIGGER trg_sm_category_updated
    BEFORE UPDATE ON public.sm_category_pages
    FOR EACH ROW EXECUTE FUNCTION public.fn_sm_category_set_updated();

-- RLS
ALTER TABLE public.sm_category_pages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename='sm_category_pages' AND policyname='sm_cat_service_all') THEN
    EXECUTE 'CREATE POLICY sm_cat_service_all ON public.sm_category_pages
             FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY sm_cat_auth_read ON public.sm_category_pages
             FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

COMMENT ON TABLE public.sm_category_pages IS
    'Páginas de categoria do site Só Marcas a serem scrapeadas para descoberta de site_ids. '
    'Cada categoria tem múltiplos produtos — scraping em batch via Jina Reader.';


-- ── 2. fn_sm_category_seed: popula sm_category_pages a partir do Bronze ─
CREATE OR REPLACE FUNCTION public.fn_sm_category_seed()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sup    uuid := '841cd690-210a-422a-908c-7676828db272';
  v_ins    int  := 0;
  v_rows   int  := 0;
  v_name   text;
  v_slug   text;
BEGIN
  -- Explodir pipe-delimited, slugificar, desduplicar e inserir
  INSERT INTO public.sm_category_pages (name, slug)
  SELECT DISTINCT
    trim(cat)                      AS name,
    public.fn_slugify(trim(cat))   AS slug
  FROM supplier_products_raw,
       regexp_split_to_table(raw_data->>'matriz_de_categorias', '\|') cat
  WHERE supplier_id = v_sup
    AND raw_data->>'matriz_de_categorias' IS NOT NULL
    AND raw_data->>'matriz_de_categorias' != ''
    AND trim(cat) != ''
    AND public.fn_slugify(trim(cat)) IS NOT NULL
    AND length(public.fn_slugify(trim(cat))) > 3
  ON CONFLICT (slug) DO NOTHING;

  GET DIAGNOSTICS v_ins = ROW_COUNT;

  RETURN jsonb_build_object(
    'categories_seeded', v_ins,
    'total_in_table',    (SELECT count(*) FROM sm_category_pages),
    'ts', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_sm_category_seed() TO service_role;


-- ── 3. fn_sm_category_enqueue: dispara Jina Reader para cada categoria ──
CREATE OR REPLACE FUNCTION public.fn_sm_category_enqueue(
    p_limit     integer DEFAULT 3,
    p_jina_key  text    DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  v_jina_key  text := p_jina_key;
  v_headers   jsonb;
  rec         record;
  v_req       bigint;
  v_n         int := 0;
  v_url       text;
BEGIN
  -- Vault: Jina API key
  IF v_jina_key IS NULL THEN
    BEGIN
      SELECT decrypted_secret INTO v_jina_key
      FROM vault.decrypted_secrets WHERE name='jina_api_key' LIMIT 1;
      IF v_jina_key LIKE '__PLACEHOLDER%' THEN v_jina_key := NULL; END IF;
    EXCEPTION WHEN OTHERS THEN v_jina_key := NULL;
    END;
  END IF;

  -- Headers Jina (Return-Format: html para parsear produto listings)
  v_headers := jsonb_build_object('Accept', 'text/html');
  IF v_jina_key IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_jina_key);
  END IF;

  -- Watchdog: liberta 'processing' travado > 60 min
  UPDATE sm_category_pages
    SET status = 'pending', fetch_req_id = NULL
  WHERE status = 'processing'
    AND updated_at < now() - interval '60 minutes';

  -- Categorias com category_id descoberto → podem ser scrapeadas
  -- Categorias sem category_id → tentar via Jina Search
  FOR rec IN
    SELECT id, name, slug, category_id, site_url, current_page
    FROM sm_category_pages
    WHERE status IN ('pending','partial')
      AND (status <> 'failed' OR attempts < 3)
    ORDER BY CASE WHEN category_id IS NOT NULL THEN 0 ELSE 1 END,  -- com URL primeiro
             attempts, created_at
    LIMIT p_limit
  LOOP
    IF rec.site_url IS NOT NULL THEN
      -- Categoria com URL conhecida: scrape direto
      v_url := rec.site_url;
      IF rec.current_page > 1 THEN
        v_url := v_url || '?page=' || rec.current_page;
      END IF;
      v_url := 'https://r.jina.ai/' || v_url;
    ELSE
      -- Categoria sem URL: Jina Search para encontrar a URL
      v_url := 'https://s.jina.ai/site%3Asomarcas.com.br%2Fcategorias%20'
               || replace(rec.slug, '-', '+');
    END IF;

    SELECT net.http_get(
      url                  := v_url,
      headers              := v_headers,
      timeout_milliseconds := 45000
    ) INTO v_req;

    UPDATE sm_category_pages
      SET status       = 'processing',
          fetch_req_id = v_req,
          attempts     = attempts + 1
    WHERE id = rec.id;

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_sm_category_enqueue(integer, text) TO service_role;


-- ── 4. fn_sm_category_collect: processa respostas e extrai produtos ──────
CREATE OR REPLACE FUNCTION public.fn_sm_category_collect(p_max integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  rec          record;
  v_body       text;
  v_sc         int;
  v_m          text[];
  v_category_id int;
  v_urls       jsonb := '[]'::jsonb;
  v_url_item   jsonb;
  v_ok         int  := 0;
  v_fail       int  := 0;
  v_wait       int  := 0;
  v_total_urls int  := 0;
  v_matched    int  := 0;
  v_result     jsonb;
BEGIN
  FOR rec IN
    SELECT id, name, slug, category_id, fetch_req_id, site_url
    FROM sm_category_pages
    WHERE status = 'processing'
      AND fetch_req_id IS NOT NULL
    LIMIT p_max
  LOOP
    SELECT status_code, content INTO v_sc, v_body
    FROM net._http_response WHERE id = rec.fetch_req_id;

    IF NOT FOUND THEN
      v_wait := v_wait + 1;
      CONTINUE;
    END IF;

    IF v_sc <> 200 OR length(COALESCE(v_body,'')) < 200 THEN
      UPDATE sm_category_pages
        SET status='failed', last_error='HTTP '||COALESCE(v_sc::text,'?'),
            fetch_req_id=NULL
      WHERE id = rec.id;
      v_fail := v_fail + 1;
    ELSE
      -- 1. Se não tem category_id, tenta descobrir pela URL no markdown
      IF rec.category_id IS NULL THEN
        v_m := regexp_match(v_body,
          'somarcas\.com\.br/([0-9]+)/categorias/(' || rec.slug || ')');
        IF v_m IS NOT NULL THEN
          UPDATE sm_category_pages
            SET category_id = v_m[1]::int
          WHERE id = rec.id;
          -- Re-enqueue para scrape completo da categoria (agora com URL)
          UPDATE sm_category_pages
            SET status='pending', fetch_req_id=NULL
          WHERE id = rec.id;
          v_ok := v_ok + 1;
          DELETE FROM net._http_response WHERE id = rec.fetch_req_id;
          CONTINUE;
        END IF;
      END IF;

      -- 2. Extrai todos os (site_id, slug) de produtos na página
      v_urls := '[]'::jsonb;
      FOR v_m IN
        SELECT regexp_matches(v_body,
          'somarcas\.com\.br/([0-9]+)/produto/([a-z0-9][a-z0-9-]+)', 'g')
      LOOP
        v_urls := v_urls || jsonb_build_object(
          'site_id', v_m[1]::int,
          'slug',    v_m[2]
        );
      END LOOP;

      -- Desduplicar por site_id
      SELECT jsonb_agg(DISTINCT item) INTO v_urls
      FROM jsonb_array_elements(v_urls) item;

      v_total_urls := v_total_urls + COALESCE(jsonb_array_length(v_urls), 0);

      -- 3. Slug-match → sm_site_url_map
      IF jsonb_array_length(v_urls) > 0 THEN
        v_result := public.fn_sm_url_map_from_site_urls(v_urls);
        v_matched := v_matched + COALESCE((v_result->>'resolved')::int, 0);
      END IF;

      -- 4. Verificar paginação (simplificado — se encontrou produtos, marcar done)
      UPDATE sm_category_pages
        SET status          = 'done',
            products_found  = COALESCE(jsonb_array_length(v_urls), 0),
            last_scraped_at = now(),
            fetch_req_id    = NULL
      WHERE id = rec.id;

      v_ok := v_ok + 1;
    END IF;

    DELETE FROM net._http_response WHERE id = rec.fetch_req_id;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',         v_ok,
    'fail',       v_fail,
    'wait',       v_wait,
    'urls_found', v_total_urls,
    'matched',    v_matched,
    'ts',         now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_sm_category_collect(integer) TO service_role;

COMMENT ON FUNCTION public.fn_sm_category_enqueue IS
    'Enfileira Jina Reader para páginas de categoria SM. '
    'Categorias com URL conhecida: scrape direto. Sem URL: Jina Search.';
COMMENT ON FUNCTION public.fn_sm_category_collect IS
    'Coleta respostas de categorias, extrai (site_id, slug) dos produtos '
    'e chama fn_sm_url_map_from_site_urls para atualizar o mapa.';
;
