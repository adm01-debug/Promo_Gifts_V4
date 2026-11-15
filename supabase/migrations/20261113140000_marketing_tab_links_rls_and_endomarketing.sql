-- Aba Marketing do produto (Admin > Produtos > editar > Marketing): todo clique dava "Erro ao salvar".
--
-- Causa raiz: a tela gravava um objeto de marketing em products.tags via UPDATE na VIEW
-- v_products_public (não atualizável; authenticated sem UPDATE). products.tags guarda as
-- palavras-chave de busca (7.529 produtos) — a tela nova nunca toca nessa coluna.
-- Os vínculos reais já existem: product_commemorative_dates (35.146 linhas) e
-- product_target_audiences (0 linhas), com RLS ligada e só policies de SELECT — ninguém
-- conseguia gravar por PostgREST.
--
-- Esta migration:
--   1. Escrita (INSERT/UPDATE/DELETE) em product_commemorative_dates e product_target_audiences
--      para quem pode editar o produto. Regra = a mesma de products_insert/update/delete e das
--      tabelas-filhas *_oa_* (ex.: product_category_assignments_oa_*): owner/admin da
--      organização dona do produto em user_organizations, com (SELECT auth.uid()).
--   2. SELECT extra em product_commemorative_dates para esse mesmo editor ver vínculos
--      inativos (pcd_read_public só mostra is_active = true). Sem ele, a tela não acha o
--      vínculo herdado que foi desligado e não consegue religar (UNIQUE product_id+data).
--      anon continua vendo só os ativos.
--   3. Endomarketing separado de marketing (decisão do dono): mestre public.endomarketing_themes
--      (seed com as 11 opções que a tela usava fixas no código) e vínculo public.product_endomarketing.
--
-- Sem SECURITY DEFINER novo. Idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS / ON CONFLICT).
-- Não altera dados existentes de vínculo nem products.tags.
--
-- Rollback: supabase/rollbacks/20261113140000_rollback.sql

-- ---------------------------------------------------------------------------
-- 1 e 2. Vínculos existentes: datas comemorativas e público-alvo
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "pcd_oa_read_all" ON public.product_commemorative_dates;
CREATE POLICY "pcd_oa_read_all" ON public.product_commemorative_dates
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_commemorative_dates.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

DROP POLICY IF EXISTS "pcd_oa_ins" ON public.product_commemorative_dates;
CREATE POLICY "pcd_oa_ins" ON public.product_commemorative_dates
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_commemorative_dates.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

DROP POLICY IF EXISTS "pcd_oa_upd" ON public.product_commemorative_dates;
CREATE POLICY "pcd_oa_upd" ON public.product_commemorative_dates
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_commemorative_dates.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_commemorative_dates.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

DROP POLICY IF EXISTS "pcd_oa_del" ON public.product_commemorative_dates;
CREATE POLICY "pcd_oa_del" ON public.product_commemorative_dates
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_commemorative_dates.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

DROP POLICY IF EXISTS "pta_oa_ins" ON public.product_target_audiences;
CREATE POLICY "pta_oa_ins" ON public.product_target_audiences
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_target_audiences.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

DROP POLICY IF EXISTS "pta_oa_upd" ON public.product_target_audiences;
CREATE POLICY "pta_oa_upd" ON public.product_target_audiences
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_target_audiences.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_target_audiences.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

DROP POLICY IF EXISTS "pta_oa_del" ON public.product_target_audiences;
CREATE POLICY "pta_oa_del" ON public.product_target_audiences
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_target_audiences.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

-- ---------------------------------------------------------------------------
-- 3. Endomarketing: mestre + vínculo
-- ---------------------------------------------------------------------------

-- soft-delete-exempt: cadastro de lookup (seed versionado em migration), tema desligado = is_active false, como commemorative_dates/target_audiences
CREATE TABLE IF NOT EXISTS public.endomarketing_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT endomarketing_themes_name_key UNIQUE (name),
  CONSTRAINT endomarketing_themes_slug_key UNIQUE (slug)
);

COMMENT ON TABLE public.endomarketing_themes IS
  'Temas de endomarketing (comunicação interna) para classificar produtos. Separado de datas comemorativas/público-alvo.';

-- soft-delete-exempt: tabela de vínculo N:N, mesmo contrato de product_commemorative_dates/product_target_audiences (herdado desliga via is_active, manual é DELETE físico pela aba Marketing)
CREATE TABLE IF NOT EXISTS public.product_endomarketing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES public.endomarketing_themes(id) ON DELETE CASCADE,
  source varchar(20) NOT NULL DEFAULT 'manual',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_endomarketing_source_check CHECK (source IN ('category', 'manual')),
  CONSTRAINT uq_product_endomarketing UNIQUE (product_id, theme_id)
);

COMMENT ON TABLE public.product_endomarketing IS
  'Vincula produtos a temas de endomarketing. source: manual (aba Marketing) ou category (herdado).';

-- O UNIQUE (product_id, theme_id) já cobre buscas por product_id; theme_id precisa do seu.
CREATE INDEX IF NOT EXISTS idx_product_endomarketing_theme_id
  ON public.product_endomarketing USING btree (theme_id);

DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.endomarketing_themes;
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.endomarketing_themes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.product_endomarketing;
CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON public.product_endomarketing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.endomarketing_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_endomarketing ENABLE ROW LEVEL SECURITY;

-- GRANT mínimo: o default do Supabase dá ALL para anon/authenticated em tabela nova.
REVOKE ALL ON TABLE public.endomarketing_themes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.product_endomarketing FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.endomarketing_themes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_endomarketing TO authenticated;
GRANT ALL ON TABLE public.endomarketing_themes TO service_role;
GRANT ALL ON TABLE public.product_endomarketing TO service_role;

-- Mestre: leitura para authenticated; cadastro de temas fica com service_role (migration).
DROP POLICY IF EXISTS "endomarketing_themes_auth_read" ON public.endomarketing_themes;
CREATE POLICY "endomarketing_themes_auth_read" ON public.endomarketing_themes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "product_endomarketing_auth_read" ON public.product_endomarketing;
CREATE POLICY "product_endomarketing_auth_read" ON public.product_endomarketing
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "product_endomarketing_oa_ins" ON public.product_endomarketing;
CREATE POLICY "product_endomarketing_oa_ins" ON public.product_endomarketing
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_endomarketing.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

DROP POLICY IF EXISTS "product_endomarketing_oa_upd" ON public.product_endomarketing;
CREATE POLICY "product_endomarketing_oa_upd" ON public.product_endomarketing
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_endomarketing.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_endomarketing.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

DROP POLICY IF EXISTS "product_endomarketing_oa_del" ON public.product_endomarketing;
CREATE POLICY "product_endomarketing_oa_del" ON public.product_endomarketing
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_endomarketing.product_id
      AND p.organization_id IN (
        SELECT uo.organization_id FROM public.user_organizations uo
        WHERE uo.user_id = (SELECT auth.uid())
          AND uo.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))));

-- Seed: as opções que a tela tinha fixas em src/data/mockData.ts (ENDOMARKETING), na mesma ordem.
INSERT INTO public.endomarketing_themes (name, slug, display_order) VALUES
  ('ONBOARDING | KIT BOAS-VINDAS', 'onboarding-kit-boas-vindas', 10),
  ('TEMPO DE CASA | ANIVERSÁRIO EMPRESA', 'tempo-de-casa-aniversario-empresa', 20),
  ('CIPA | SIPAT', 'cipa-sipat', 30),
  ('PREMIAÇÃO | INCENTIVO', 'premiacao-incentivo', 40),
  ('RECONHECIMENTO', 'reconhecimento', 50),
  ('INTEGRAÇÃO | TEAM BUILDING', 'integracao-team-building', 60),
  ('TREINAMENTO | CAPACITAÇÃO', 'treinamento-capacitacao', 70),
  ('FIM DE ANO | CONFRATERNIZAÇÃO', 'fim-de-ano-confraternizacao', 80),
  ('QUALIDADE DE VIDA', 'qualidade-de-vida', 90),
  ('CAMPANHA INTERNA', 'campanha-interna', 100),
  ('CONVENÇÃO DE VENDAS', 'convencao-de-vendas', 110)
ON CONFLICT (name) DO NOTHING;

-- ── Opções que a tela antiga oferecia e o cadastro não tem (auditoria 13/11) ──
-- A aba passa a listar os cadastros reais (41 datas / 38 públicos ativos). Estas 5 existiam só
-- na constante do código e sumiriam da tela. Inserção idempotente; nada é alterado se já existir.
-- ("DIA DA MULHER" do código = "Dia Internacional da Mulher", que já existe.)
INSERT INTO public.commemorative_dates (name, slug, date_day, date_month, is_fixed_date, description, is_active)
SELECT v.name, v.slug, v.dd, v.mm, true, v.descr, true
FROM (VALUES
  ('Dia do Homem', 'dia-do-homem', 15, 7, 'Dia do Homem (15/07)'),
  ('Setembro Amarelo', 'setembro-amarelo', 1, 9, 'Campanha de prevenção ao suicídio (mês de setembro)'),
  ('Outubro Rosa', 'outubro-rosa', 1, 10, 'Campanha de prevenção ao câncer de mama (mês de outubro)'),
  ('Novembro Azul', 'novembro-azul', 1, 11, 'Campanha de saúde do homem (mês de novembro)')
) AS v(name, slug, dd, mm, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM public.commemorative_dates c
  WHERE c.slug = v.slug OR lower(c.name) = lower(v.name)
);

INSERT INTO public.target_audiences (name, slug, is_active)
SELECT 'Produtor Rural', 'produtor-rural', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.target_audiences t
  WHERE t.slug = 'produtor-rural' OR lower(t.name) = 'produtor rural'
);

DO $$
BEGIN
  IF (SELECT count(*) FROM public.endomarketing_themes) < 11 THEN
    RAISE EXCEPTION 'endomarketing_themes: seed incompleto';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'product_commemorative_dates' AND policyname = 'pcd_oa_ins') THEN
    RAISE EXCEPTION 'product_commemorative_dates: policy de escrita não criada';
  END IF;
END
$$;
