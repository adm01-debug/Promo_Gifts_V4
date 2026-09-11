-- ═══════════════════════════════════════════════════════════════════════
-- SEO M5: Tabela content_articles — pilar de conteúdo / Topical Authority
-- fix_version: seo_content_articles_v1_20260627
-- Documentada em DOC_MODULO_SEO_COMPLETO.md mas nunca criada em produção.
-- RLS: anon lê publicados; authenticated com role admin gerencia.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.content_articles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT        NOT NULL,
  slug                TEXT        UNIQUE NOT NULL,
  content             TEXT,
  excerpt             TEXT,
  status              TEXT        NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','published','archived')),
  published_at        TIMESTAMPTZ,
  author_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  category_slug       TEXT,                              -- soft-ref a categories.slug
  featured_image_url  TEXT,
  meta_title          TEXT        CHECK (meta_title IS NULL OR (LENGTH(meta_title) BETWEEN 10 AND 70)),
  meta_description    TEXT        CHECK (meta_description IS NULL OR (LENGTH(meta_description) BETWEEN 50 AND 170)),
  schema_json         JSONB,
  tags                TEXT[],
  view_count          INTEGER     NOT NULL DEFAULT 0,
  read_time_minutes   INTEGER,
  seo_score           INTEGER     DEFAULT 0 CHECK (seo_score BETWEEN 0 AND 100),
  is_deleted          BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_content_articles_published
  ON public.content_articles (published_at DESC)
  WHERE status = 'published' AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_content_articles_slug
  ON public.content_articles (slug)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_content_articles_category
  ON public.content_articles (category_slug)
  WHERE status = 'published' AND is_deleted = false;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.trg_content_articles_updated_at()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_content_articles_set_updated_at ON public.content_articles;
CREATE TRIGGER trg_content_articles_set_updated_at
  BEFORE UPDATE ON public.content_articles
  FOR EACH ROW EXECUTE FUNCTION public.trg_content_articles_updated_at();

-- RLS
ALTER TABLE public.content_articles ENABLE ROW LEVEL SECURITY;

-- Leitura pública: apenas artigos publicados e não deletados
CREATE POLICY "content_articles_anon_select"
  ON public.content_articles FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND is_deleted = false);

-- Gestão pelo autor (authenticated): INSERT/UPDATE/DELETE dos próprios artigos
CREATE POLICY "content_articles_author_insert"
  ON public.content_articles FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "content_articles_author_update"
  ON public.content_articles FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "content_articles_author_delete"
  ON public.content_articles FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

COMMENT ON TABLE public.content_articles IS
'SEO M5 (2026-06-27): Artigos de blog para Topical Authority.
Documentada em DOC_MODULO_SEO_COMPLETO.md como "content_articles" mas nunca criada.
fix_version: seo_content_articles_v1_20260627
Lovable bot: NÃO alterar constraints de status nem remover RLS policies.';;
