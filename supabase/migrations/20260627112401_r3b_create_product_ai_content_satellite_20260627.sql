-- ═══════════════════════════════════════════════════════════════════
-- R3b · Satélite product_ai_content (1:1 com products)
-- fix_version: satellite_ai_20260627
-- Extrai 6 colunas AI de products (ai_title, ai_description, ai_summary,
-- ai_version, ai_model, ai_generated_at) para tabela dedicada.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_ai_content (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id      uuid        NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  ai_title        text,
  ai_description  text,
  ai_summary      text,
  ai_version      integer     DEFAULT 0,
  ai_model        varchar(100),
  ai_generated_at timestamptz,
  -- Colunas adicionais para enriquecimento futuro (pipeline AI)
  key_benefits    text[],
  use_cases       text[],
  ai_keywords     text[],
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.product_ai_content IS
'[fix_version:satellite_ai_20260627] Satélite 1:1 de conteúdo gerado por AI.
 Colunas: ai_title, ai_description, ai_summary, ai_version, ai_model, ai_generated_at.
 Colunas extras para roadmap: key_benefits[], use_cases[], ai_keywords[].
 Sincronizado por trg_sync_product_ai_content.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_product_ai_content_version
  ON public.product_ai_content(ai_version DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_product_ai_content_generated
  ON public.product_ai_content(ai_generated_at DESC NULLS LAST);

-- RLS
ALTER TABLE public.product_ai_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_ai_anon_select ON public.product_ai_content;
CREATE POLICY product_ai_anon_select ON public.product_ai_content
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS product_ai_service_all ON public.product_ai_content;
CREATE POLICY product_ai_service_all ON public.product_ai_content
  TO service_role USING (true) WITH CHECK (true);

-- Trigger function
CREATE OR REPLACE FUNCTION public.fn_sync_product_ai_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
-- fix_version: satellite_ai_20260627
-- anti-regression: manter SECURITY DEFINER + search_path.
BEGIN
  INSERT INTO public.product_ai_content (
    product_id, ai_title, ai_description, ai_summary,
    ai_version, ai_model, ai_generated_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.ai_title, NEW.ai_description, NEW.ai_summary,
    COALESCE(NEW.ai_version,0), NEW.ai_model, NEW.ai_generated_at, now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    ai_title        = EXCLUDED.ai_title,
    ai_description  = EXCLUDED.ai_description,
    ai_summary      = EXCLUDED.ai_summary,
    ai_version      = EXCLUDED.ai_version,
    ai_model        = EXCLUDED.ai_model,
    ai_generated_at = EXCLUDED.ai_generated_at,
    updated_at      = now();
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.fn_sync_product_ai_on_change() IS
'[fix_version:satellite_ai_20260627] Trigger: UPSERT em product_ai_content. Não remover.';

DROP TRIGGER IF EXISTS trg_sync_product_ai_content ON public.products;
CREATE TRIGGER trg_sync_product_ai_content
  AFTER INSERT OR UPDATE OF
    ai_title, ai_description, ai_summary, ai_version, ai_model, ai_generated_at
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_product_ai_on_change();

COMMENT ON TRIGGER trg_sync_product_ai_content ON public.products IS
'[fix_version:satellite_ai_20260627] Sincroniza product_ai_content. Não remover.';

-- Backfill
INSERT INTO public.product_ai_content (
  product_id, ai_title, ai_description, ai_summary,
  ai_version, ai_model, ai_generated_at
)
SELECT
  id, ai_title, ai_description, ai_summary,
  COALESCE(ai_version,0), ai_model, ai_generated_at
FROM products
WHERE ai_description IS NOT NULL
   OR ai_title IS NOT NULL
   OR ai_version > 0
ON CONFLICT (product_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';;
