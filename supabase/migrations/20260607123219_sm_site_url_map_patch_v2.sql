
-- ============================================================
--  SM JINA PIPELINE — FASE 0 PATCH v2
--  Corrige constraint e adiciona colunas faltantes
-- ============================================================

-- 1. Adicionar colunas faltantes (idempotente)
ALTER TABLE public.sm_site_url_map
    ADD COLUMN IF NOT EXISTS hex_color  text,
    ADD COLUMN IF NOT EXISTS nome_site  text,
    ADD COLUMN IF NOT EXISTS validated  boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Preencher timestamps para linhas existentes
UPDATE public.sm_site_url_map
SET created_at = COALESCE(discovered_at, now()),
    updated_at = COALESCE(last_verified_at, discovered_at, now())
WHERE created_at = now();   -- só recém-adicionadas (default foi now())

-- 3. Constraint de source incluindo todos os valores existentes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sm_site_url_map_source_chk'
      AND conrelid = 'public.sm_site_url_map'::regclass
  ) THEN
    ALTER TABLE public.sm_site_url_map
      ADD CONSTRAINT sm_site_url_map_source_chk
        CHECK (source IN (
          'produtos_similares', 'category_scrape', 'jina_search',
          'manual', 'unknown', 'bronze_seed', 'related_products'
        ));
  END IF;
END $$;

-- 4. Índices
CREATE INDEX IF NOT EXISTS sm_site_url_map_validated_idx ON public.sm_site_url_map (validated);
CREATE INDEX IF NOT EXISTS sm_site_url_map_source_idx    ON public.sm_site_url_map (source);
CREATE INDEX IF NOT EXISTS sm_site_url_map_site_id_idx   ON public.sm_site_url_map (site_id)
    WHERE site_id IS NOT NULL;

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION public.fn_sm_url_map_set_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_sm_site_url_map_updated ON public.sm_site_url_map;
CREATE TRIGGER trg_sm_site_url_map_updated
    BEFORE UPDATE ON public.sm_site_url_map
    FOR EACH ROW EXECUTE FUNCTION public.fn_sm_url_map_set_updated();

-- 6. Comentários
COMMENT ON TABLE  public.sm_site_url_map IS
    'Mapa codigo SM → URL canônica (site_id + slug). '
    '1230+ mapeamentos descobertos via bronze_seed, produtos_similares, '
    'related_products e category_scrape. Alimenta o SM Jina Scraping Pipeline.';
COMMENT ON COLUMN public.sm_site_url_map.validated IS
    'true após 1º scrape bem-sucedido retornar dados do produto correto.';
COMMENT ON COLUMN public.sm_site_url_map.hex_color IS
    'Cor hex do produto neste mapeamento (ex.: #FFFFFF). Extraída dos produtos_similares.';
COMMENT ON COLUMN public.sm_site_url_map.nome_site IS
    'Nome do produto como aparece no site SM. Extraído dos produtos_similares.';

-- 7. RLS
ALTER TABLE public.sm_site_url_map ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'sm_url_map_service_all'
      AND tablename  = 'sm_site_url_map'
  ) THEN
    EXECUTE 'CREATE POLICY sm_url_map_service_all ON public.sm_site_url_map
             FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'sm_url_map_auth_read'
      AND tablename  = 'sm_site_url_map'
  ) THEN
    EXECUTE 'CREATE POLICY sm_url_map_auth_read ON public.sm_site_url_map
             FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;
;
