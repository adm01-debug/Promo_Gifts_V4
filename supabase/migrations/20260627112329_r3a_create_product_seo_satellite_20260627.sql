-- ═══════════════════════════════════════════════════════════════════
-- R3a · Satélite product_seo (1:1 com products)
-- fix_version: satellite_seo_20260627
-- Extrai 12 colunas de SEO/OG de products para tabela dedicada.
-- Colunas em products mantidas por compatibilidade (DROP = sprint futuro).
-- ═══════════════════════════════════════════════════════════════════

-- 1. Tabela satélite
CREATE TABLE IF NOT EXISTS public.product_seo (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id        uuid        NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  meta_title        text,
  meta_description  text,
  meta_keywords     text[],
  canonical_url     text,
  robots_meta       text        DEFAULT 'index, follow',
  og_title          text,
  og_description    text,
  og_image_url      text,
  schema_json       jsonb,
  seo_score         integer     DEFAULT 0,
  seo_issues        jsonb       DEFAULT '[]'::jsonb,
  seo_last_audit_at timestamptz,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.product_seo IS
'[fix_version:satellite_seo_20260627] Satélite 1:1 SEO/OG de products.
 Extrai meta_title, meta_description, meta_keywords, canonical_url, robots_meta,
 og_*, schema_json, seo_score, seo_issues. Sincronizado por trg_sync_product_seo.
 Colunas fonte em products mantidas até refactor do código frontend (DROP = sprint futuro).';

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_product_seo_score
  ON public.product_seo(seo_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_seo_audit
  ON public.product_seo(seo_last_audit_at DESC NULLS LAST);

-- 3. RLS
ALTER TABLE public.product_seo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_seo_anon_select ON public.product_seo;
CREATE POLICY product_seo_anon_select ON public.product_seo
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS product_seo_service_all ON public.product_seo;
CREATE POLICY product_seo_service_all ON public.product_seo
  TO service_role USING (true) WITH CHECK (true);

-- 4. Função de sync (AFTER INSERT/UPDATE em products)
CREATE OR REPLACE FUNCTION public.fn_sync_product_seo_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
-- fix_version: satellite_seo_20260627
-- anti-regression: manter SECURITY DEFINER + search_path=pg_catalog,public.
-- Não remover: este trigger mantém product_seo sincronizado com products.
BEGIN
  INSERT INTO public.product_seo (
    product_id, meta_title, meta_description, meta_keywords,
    canonical_url, robots_meta, og_title, og_description, og_image_url,
    schema_json, seo_score, seo_issues, seo_last_audit_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.meta_title, NEW.meta_description, NEW.meta_keywords,
    NEW.canonical_url, COALESCE(NEW.robots_meta,'index, follow'),
    NEW.og_title, NEW.og_description, NEW.og_image_url,
    NEW.schema_json, COALESCE(NEW.seo_score,0),
    COALESCE(NEW.seo_issues,'[]'::jsonb),
    NEW.seo_last_audit_at, now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    meta_title        = EXCLUDED.meta_title,
    meta_description  = EXCLUDED.meta_description,
    meta_keywords     = EXCLUDED.meta_keywords,
    canonical_url     = EXCLUDED.canonical_url,
    robots_meta       = EXCLUDED.robots_meta,
    og_title          = EXCLUDED.og_title,
    og_description    = EXCLUDED.og_description,
    og_image_url      = EXCLUDED.og_image_url,
    schema_json       = EXCLUDED.schema_json,
    seo_score         = EXCLUDED.seo_score,
    seo_issues        = EXCLUDED.seo_issues,
    seo_last_audit_at = EXCLUDED.seo_last_audit_at,
    updated_at        = now();
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.fn_sync_product_seo_on_change() IS
'[fix_version:satellite_seo_20260627] Trigger function: UPSERT em product_seo
 quando colunas SEO/OG de products mudam. Não remover.';

-- 5. Trigger em products (só dispara quando colunas SEO mudam)
DROP TRIGGER IF EXISTS trg_sync_product_seo ON public.products;
CREATE TRIGGER trg_sync_product_seo
  AFTER INSERT OR UPDATE OF
    meta_title, meta_description, meta_keywords, canonical_url, robots_meta,
    og_title, og_description, og_image_url, schema_json,
    seo_score, seo_issues, seo_last_audit_at
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_product_seo_on_change();

COMMENT ON TRIGGER trg_sync_product_seo ON public.products IS
'[fix_version:satellite_seo_20260627] Sincroniza product_seo. Dispara apenas nas colunas SEO.';

-- 6. Backfill inicial (todos os produtos com algum dado SEO)
INSERT INTO public.product_seo (
  product_id, meta_title, meta_description, meta_keywords,
  canonical_url, robots_meta, og_title, og_description, og_image_url,
  schema_json, seo_score, seo_issues, seo_last_audit_at
)
SELECT
  id,
  meta_title, meta_description, meta_keywords,
  canonical_url, COALESCE(robots_meta,'index, follow'),
  og_title, og_description, og_image_url,
  schema_json, COALESCE(seo_score,0),
  COALESCE(seo_issues,'[]'::jsonb),
  seo_last_audit_at
FROM products
WHERE meta_title IS NOT NULL
   OR seo_score > 0
   OR canonical_url IS NOT NULL
   OR og_title IS NOT NULL
ON CONFLICT (product_id) DO NOTHING;

-- 7. Sinalizar PostgREST
NOTIFY pgrst, 'reload schema';;
