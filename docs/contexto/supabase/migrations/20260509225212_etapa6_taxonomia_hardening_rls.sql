-- ============================================================
-- Etapa 6: Taxonomia/Catálogo — HARDENING RLS
--
-- Foco diferente do plano original:
-- - 5 tabelas "faltantes" (nichos, pantone_colors, gravacao_techniques,
--   product_favorites, recent_searches) NÃO são criadas: hooks usam localStorage
--   ou arquivos estáticos. Drift do plano antigo, código não exige.
-- - Encontrados 4 BUGS RLS críticos por sobreposição permissivo+restritivo
--   nas tabelas de catálogo de alto volume (44.000+ rows expostas)
-- - 3 tabelas de catálogo permitiam edição livre por qualquer authenticated
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- FASE 1: BACKFILL user_organizations (pré-requisito pra
-- as policies _select_org funcionarem após drop dos _public_read)
-- ════════════════════════════════════════════════════════════
-- Inserir os 4 users na organização única (5db5aee1-064b-4ef4-9193-345dcd8274ea)
-- Roles do enum org_role: owner > admin > member
INSERT INTO public.user_organizations (user_id, organization_id, role) 
VALUES
  -- adm01 (dev RBAC) → 'owner' org
  ('75921d8b-611f-4413-9ce5-afccdb733d26'::uuid, '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid, 'owner'),
  -- ti@ (supervisor RBAC) → 'admin' org
  ('697f84e2-c308-4e45-992c-c7762565ca65'::uuid, '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid, 'admin'),
  -- comercial03 (agente RBAC) → 'member' org
  ('3232c5ec-debf-49ba-9dd9-d33a46aff50f'::uuid, '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid, 'member'),
  -- comercial05 (agente RBAC) → 'member' org
  ('4e7b4bcc-9321-45e7-bc3b-df47721e2e95'::uuid, '5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid, 'member')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ════════════════════════════════════════════════════════════
-- FASE 2: DROP policies _public_read que ANULAM restrição org-based
-- ════════════════════════════════════════════════════════════
-- Bug: USING(true) em SELECT permissivo sobreposto a policy restritiva =
-- qualquer authenticated lê tudo. Pior caso: supplier_materials.public_read
-- libera pra ANON também (anônimo lê fornecedores).

DROP POLICY IF EXISTS "product_category_assignments_public_read" ON public.product_category_assignments;
DROP POLICY IF EXISTS "product_tags_public_read"                  ON public.product_tags;
DROP POLICY IF EXISTS "tags_public_read"                          ON public.tags;
DROP POLICY IF EXISTS "supplier_materials_public_read"            ON public.supplier_materials;

-- Após drop, as policies _select_org retomam o controle:
--   product_category_assignments_select_org → exige products do user.org
--   product_tags_select_org → exige products do user.org
--   tags_select_org → user_belongs_to_org(organization_id)
--   sm_select → suppliers do user.org

-- ════════════════════════════════════════════════════════════
-- FASE 3: RESTRINGIR edição livre de catálogo
-- (atualmente: qualquer authenticated edita ramo_atividade*)
-- ════════════════════════════════════════════════════════════
-- ramo_atividade
DROP POLICY IF EXISTS "Ramo atividade editável por autenticados" ON public.ramo_atividade;
CREATE POLICY "ra_admin_manage" ON public.ramo_atividade FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
-- SELECT permissivo (true) mantido — catálogo público de leitura

-- ramo_atividade_filho
DROP POLICY IF EXISTS "Ramo atividade filho editável por autenticados" ON public.ramo_atividade_filho;
CREATE POLICY "raf_admin_manage" ON public.ramo_atividade_filho FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- produto_ramo_atividade (relacionamento)
-- Vendedor pode atribuir produto a ramo (precisa pra qualificar leads); supervisor+ pra remover
DROP POLICY IF EXISTS "Produto ramo atividade editável por autenticados" ON public.produto_ramo_atividade;
CREATE POLICY "pra_select_authenticated" ON public.produto_ramo_atividade FOR SELECT TO authenticated USING (true);
CREATE POLICY "pra_insert_authenticated" ON public.produto_ramo_atividade FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pra_update_supervisor"    ON public.produto_ramo_atividade FOR UPDATE TO authenticated 
  USING (public.is_supervisor_or_above(auth.uid())) 
  WITH CHECK (public.is_supervisor_or_above(auth.uid()));
CREATE POLICY "pra_delete_supervisor"    ON public.produto_ramo_atividade FOR DELETE TO authenticated 
  USING (public.is_supervisor_or_above(auth.uid()));

-- Remover a policy de SELECT permissivo redundante (fica só pra_select_authenticated)
DROP POLICY IF EXISTS "Produto ramo atividade visível para todos"  ON public.produto_ramo_atividade;
DROP POLICY IF EXISTS "Ramo atividade visível para todos"          ON public.ramo_atividade;
DROP POLICY IF EXISTS "Ramo atividade filho visível para todos"    ON public.ramo_atividade_filho;
-- Recriar SELECTs permissivos pra `authenticated` (catálogo de leitura aberto)
CREATE POLICY "ra_select_authenticated"  ON public.ramo_atividade       FOR SELECT TO authenticated USING (true);
CREATE POLICY "raf_select_authenticated" ON public.ramo_atividade_filho FOR SELECT TO authenticated USING (true);

-- ════════════════════════════════════════════════════════════
-- FASE 4: Comentários documentando drifts e decisões
-- ════════════════════════════════════════════════════════════
COMMENT ON TABLE public.user_organizations IS
  'Membership user→organização. Backfill na Etapa 6 com 4 users na org única (5db5aee1...). Necessário pras funções user_belongs_to_org/is_org_owner_or_admin retornarem true.';

COMMENT ON TABLE public.user_favorites IS
  '[FANTASMA] 0 rows e código moderno (useFavorites.ts) usa localStorage. Manter por enquanto, dropar quando confirmar que NENHUMA edge function escreve aqui.';

COMMENT ON TABLE public.product_tags IS
  'Bug RLS corrigido na Etapa 6: removida product_tags_public_read que anulava _select_org.';

COMMENT ON TABLE public.product_category_assignments IS
  'Bug RLS corrigido na Etapa 6: removida product_category_assignments_public_read que anulava _select_org.';

COMMENT ON TABLE public.tags IS
  'Bug RLS corrigido na Etapa 6: removida tags_public_read que anulava _select_org.';

COMMENT ON TABLE public.supplier_materials IS
  'Bug RLS GRAVE corrigido na Etapa 6: supplier_materials_public_read liberava pra anon. Removida.';
