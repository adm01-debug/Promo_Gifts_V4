-- P06 / A-V01 — security_invoker=true: parte aplicavel sem quebrar nem re-expor
-- SSOT: doufsxqlfjyuvxuezpln. Medicoes por execute_sql read-only em 2026-11-17.
-- Rollback: supabase/rollbacks/20261117073000_rollback.sql
-- ============================================================================
-- ESCOPO REAL DESTA MIGRATION: 1 view, public.v_product_properties_public.
-- O P06 pedia 7 (medicao achou 8). As outras 7 estao BLOQUEADAS por motivo
-- medido — ver "POR QUE SO UMA" no fim. Nao e falta de tempo: aplicar as 7
-- quebraria producao ou re-exporia tabela-base mascarada ao anon, contra
-- guarda explicita no proprio catalogo.
--
-- ACHADO A-V01: views de public com security_invoker=false rodam com os
-- privilegios do DONO e portanto ignoram o RLS das tabelas-base; quem chama
-- /rest/v1/<view> recebe linhas filtradas so pelo WHERE da view.
--
-- Medido: views de public com relkind='v' e security_invoker<>true ....... 9
--         delas legiveis por anon (has_table_privilege) ................... 8
--         v_system_health_dashboard: anon=false E authenticated=false ..... fora
--           (nao e superficie publica; confirmado, como o P06 pedia)
--         vw_system_health_quick: ja esta com security_invoker=on .......... fora
--
-- DUAS PREMISSAS DO ENUNCIADO QUE A MEDICAO NAO CONFIRMOU (registrado para
-- nao se repetir):
--
-- (b) "products_anon_read nao tem filtro nenhum (polqual IS NULL), logo dar
--     GRANT deixaria anon ver os 434 inativos/deletados".
--     Medido em pg_policy: polqual IS NULL = false; USING =
--     ((is_active = true) AND (is_deleted IS NOT TRUE)) — identico ao WHERE de
--     v_products_public. Prova empirica (SET LOCAL ROLE anon;
--     SELECT count(*) FROM products) = 7926, contra 8360 totais. Os 434 JA
--     estao escondidos de anon pelo RLS. O risco descrito em (b) nao existe.
--
--     Consequencia: a FASE 1 que o enunciado pedia ("endurecer as policies de
--     anon para replicar o filtro da view") e um NO-OP verificado em TODAS as
--     tabelas-base das views convertiveis. Medido policy a policy contra
--     pg_get_viewdef:
--       products                      | products_anon_read                        | is_active = true AND is_deleted IS NOT TRUE | = WHERE da view
--       product_properties            | product_properties_anon_read              | fn_product_active_for_rls(product_id)       | = JOIN products ativo (a fn e EXISTS(products ativo))
--       tabela_preco_gravacao_oficial | tabela_preco_gravacao_oficial_public_read  | ativo = true                                | = WHERE ativo = true
--       product_kit_components        | product_kit_components_public_read         | true                                        | mais FROUXA que a view (ver bloqueio 5)
--       suppliers                     | suppliers_anon_read                        | active = true                               | mais ESTRITA que a view (ver bloqueio 3)
--     UNIAO pedida pelo enunciado: a unica tabela lida por mais de uma view e
--     products (6 das 8 views). Todas as 6 exigem o mesmo par
--     is_active/is_deleted, logo a uniao coincide com a policy que ja existe.
--     Nenhuma ALTER POLICY e correta aqui: endurecer esconderia linha que hoje
--     aparece, afrouxar exporia linha que hoje nao aparece.
--
-- (c) v_products_public faz LEFT JOIN internal.mv_product_leaf_category: anon
--     JA tem USAGE em internal e SELECT nas 7 colunas do matview (medido), logo
--     nao falta nada ali. O (c) do enunciado nao e um impedimento.
--
-- O QUE ESTA MIGRATION FAZ: liga security_invoker na unica view onde a troca
-- custa ZERO superficie nova — anon ja tem SELECT nas 9 colunas de
-- public.product_properties hoje, entao nao ha GRANT a conceder (FASE 2 vazia)
-- e o conjunto de linhas e provadamente identico para anon E authenticated.
-- Ganho: o corte das linhas passa a ser feito pelo RLS da tabela-base, nao
-- pelo WHERE da view — defesa em profundidade, sem ampliar nada.
--
-- ============================================================================
-- Aplicacao: db-apply-migration.yml (psql -X -w -1), transacao unica. NAO ha
-- cabecalho "transaction: none" de proposito: a FASE 4 precisa que qualquer
-- divergencia faca ROLLBACK de tudo (falha fechada).

-- ---------------------------------------------------------------------------
-- FASE 0 — fotografia ANTES, como DONO, antes de qualquer mudanca.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _p06_before (metric text PRIMARY KEY, n bigint) ON COMMIT DROP

INSERT INTO _p06_before (metric, n) VALUES
  ('view:v_product_properties_public', (SELECT count(*) FROM public.v_product_properties_public)),
  ('base:product_properties_total',    (SELECT count(*) FROM public.product_properties)),
  ('products:total',                   (SELECT count(*) FROM public.products)),
  ('products:view_visible',            (SELECT count(*) FROM public.products WHERE is_deleted IS NOT TRUE AND is_active = true))

-- Valores medidos em 2026-11-17 (referencia; a FASE 4 compara RELATIVO, nunca
-- contra constante, porque o catalogo muda entre a PR e a aplicacao):
--   v_product_properties_public ..................... 33116 (dono)
--   v_product_properties_public como anon ........... 33116 (medido com SET LOCAL ROLE anon)
--   v_product_properties_public como authenticated .. 33116 (idem)
--   product_properties total ........................ 34165  (1049 de produto inativo/deletado)
--   products total / visiveis ....................... 8360 / 7926

-- ---------------------------------------------------------------------------
-- FASE 1 — policies de anon: NENHUMA ALTER POLICY (no-op verificado, ver header).
-- Em vez disso, ASSERCAO: se a policy mudar entre a revisao desta PR e a
-- aplicacao, aborta antes de ligar security_invoker. Sem isso a FASE 3 viraria
-- mudanca as cegas.
-- ---------------------------------------------------------------------------
DO $p06_fase1$
DECLARE
  v_qual text;
BEGIN
  SELECT pg_get_expr(p.polqual, p.polrelid) INTO v_qual
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname = 'product_properties'
     AND p.polname = 'product_properties_anon_read'
     AND p.polcmd IN ('r', '*')
     AND p.polpermissive
     AND 'anon' = ANY (SELECT pg_get_userbyid(x) FROM unnest(p.polroles) x);

  IF v_qual IS NULL THEN
    RAISE EXCEPTION
      'P06 FASE 1 ABORT: policy PERMISSIVE de SELECT para anon "product_properties_anon_read" nao existe mais em public.product_properties. Com security_invoker=true e sem ela, anon veria 0 linhas.';
  END IF;

  IF v_qual IS DISTINCT FROM 'fn_product_active_for_rls(product_id)' THEN
    RAISE EXCEPTION
      'P06 FASE 1 ABORT: USING de product_properties_anon_read mudou desde 2026-11-17. Esperado: fn_product_active_for_rls(product_id). Atual: %. Remeca a equivalencia com o JOIN da view antes de reaplicar.',
      v_qual;
  END IF;

  -- A policy depende de fn_product_active_for_rls ser SECURITY DEFINER: e ela
  -- que le products por dentro sem exigir GRANT de products para anon. Se
  -- alguem a tornar INVOKER, anon perde as linhas (products exige GRANT).
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'fn_product_active_for_rls' AND p.prosecdef
  ) THEN
    RAISE EXCEPTION
      'P06 FASE 1 ABORT: public.fn_product_active_for_rls nao existe ou deixou de ser SECURITY DEFINER. A policy de anon depende dela para ler products sem GRANT.';
  END IF;

  -- Policy RESTRICTIVE entraria como AND extra e derrubaria linhas sem
  -- aparecer na checagem acima. Medido em 2026-11-17: nenhuma.
  IF EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND NOT p.polpermissive AND p.polcmd IN ('r', '*')
      AND c.relname IN ('product_properties', 'products')
  ) THEN
    RAISE EXCEPTION
      'P06 FASE 1 ABORT: apareceu policy RESTRICTIVE de SELECT em product_properties ou products. Reduz linhas de forma invisivel nesta checagem — remeca antes de aplicar.';
  END IF;

  RAISE NOTICE 'P06 FASE 1 OK: policy de anon conferida, fn SECURITY DEFINER presente, nenhuma RESTRICTIVE. Nenhuma ALTER POLICY necessaria.';
END
$p06_fase1$

-- ---------------------------------------------------------------------------
-- FASE 2 — GRANT SELECT por coluna: NENHUM, de proposito.
--
-- Colunas levantadas por dependencia real (pg_depend + pg_rewrite +
-- pg_attribute sobre o _RETURN da view), nao por leitura do SQL:
--   public.product_properties -> id, product_id, property_code, property_value, source  (5)
--   public.products           -> id, is_active, is_deleted                              (3, so no JOIN)
-- Medido com has_column_privilege em 2026-11-17: anon JA tem SELECT nas 9 de 9
-- colunas de product_properties e nas 3 de products de que a view precisa.
-- Faltando para anon: 0 colunas. Por isso esta migration nao concede nada —
-- e a unica das 8 views em que a FASE 2 e vazia, e e exatamente por isso que
-- ela e a unica segura (ver "POR QUE SO UMA").
--
-- ASSERCAO de pre-condicao: se algum GRANT tiver sido revogado nesse meio
-- tempo, aborta aqui em vez de deixar a view quebrada depois da FASE 3.
-- ---------------------------------------------------------------------------
DO $p06_fase2$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(rel || '.' || col, ', ' ORDER BY rel, col) INTO v_missing
    FROM (
      SELECT 'product_properties' AS rel, a.attname AS col
        FROM pg_attribute a
       WHERE a.attrelid = 'public.product_properties'::regclass
         AND a.attname IN ('id','product_id','property_code','property_value','source')
         AND NOT has_column_privilege('anon', a.attrelid, a.attnum, 'SELECT')
      UNION ALL
      SELECT 'products', a.attname
        FROM pg_attribute a
       WHERE a.attrelid = 'public.products'::regclass
         AND a.attname IN ('id','is_active','is_deleted')
         AND NOT has_column_privilege('anon', a.attrelid, a.attnum, 'SELECT')
    ) z;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      'P06 FASE 2 ABORT: anon perdeu GRANT de coluna em: %. Com security_invoker=true a view daria "permission denied". Reconceda por migration propria antes de aplicar esta.',
      v_missing;
  END IF;

  RAISE NOTICE 'P06 FASE 2 OK: anon ja tem as 5+3 colunas necessarias; nenhum GRANT concedido (superficie inalterada).';
END
$p06_fase2$

-- ---------------------------------------------------------------------------
-- FASE 3 — security_invoker = true. Depois da FASE 2 de proposito: invertido,
-- qualquer leitura de anon entre as duas fases tomaria "permission denied"
-- dentro da transacao.
-- ---------------------------------------------------------------------------
ALTER VIEW public.v_product_properties_public SET (security_invoker = true)

-- Substitui o COMMENT "SECURITY DEFINER intencional (fix_version 20260717)",
-- que deixa de ser verdade para ESTA view. As outras 7 mantem o comentario e a
-- guarda intactos.
COMMENT ON VIEW public.v_product_properties_public IS
  'Propriedades de produtos ativos. security_invoker=true desde P06/A-V01 (20261117073000): o corte das linhas e o RLS de public.product_properties (product_properties_anon_read -> fn_product_active_for_rls), nao o JOIN da view. Nenhum GRANT novo foi necessario — anon ja tinha SELECT nas 9 colunas da tabela-base. Colunas de output: id, product_id, property_code, property_value, source.'

-- ---------------------------------------------------------------------------
-- POR QUE SO UMA — as outras 7 views publicas, com o motivo medido.
--
-- Contexto que o enunciado do P06 nao tinha: as 8 views foram tornadas
-- SECURITY DEFINER de proposito por um hardening anterior (fix_version
-- 20260717). Isso esta registrado em DOIS lugares:
--   - supabase/migrations/20260717114423_fix_security_invoker_regression_suppliers_and_stock_velocity.sql
--     ("NAO reintroduzir security_invoker=on nestas views"; a tentativa
--      anterior deu PostgREST 403 para authenticated);
--   - COMMENT ON VIEW vivo nas 8 views, 4 deles com proibicao textual.
-- Medido em obj_description em 2026-11-17 — as 4 proibicoes textuais:
--   v_products_public ...................... "NAO alterar para security_invoker=true (expoeria cost_price real ao anon via REST)"
--   v_suppliers_public ..................... "NAO alterar para security_invoker=true (expoeria api_credentials ao anon via REST)"
--   v_variant_sale_prices_public ........... "NAO alterar para security_invoker=true"
--   v_tabela_preco_gravacao_oficial_public . "NAO reverter para security_invoker=true nem re-expor a tabela base ao anon"
-- As outras 3 (v_kit_component_media_public, v_product_compositions_public,
-- v_product_tags_public) dizem "SECURITY DEFINER intencional (fix_version 20260717)".
-- AGENTS.md Git 8: guarda comentada fica. Git 7: arquitetura chama o dono.
--
-- 1) v_products_public — BLOQUEIO: re-exposicao + guarda textual.
--    Precisaria de GRANT em 154 colunas novas de public.products (157
--    referenciadas, anon tem 3). As linhas NAO mudariam (7926 antes e depois,
--    medido) e cost_price NAO vazaria (a coluna nao esta entre as 157, logo o
--    GRANT por coluna a mantem invisivel — o motivo citado no COMMENT nao se
--    sustenta como escrito). Mesmo assim: re-expor products ao anon e
--    exatamente o que o hardening de 20260717 fechou, e e decisao do dono, nao
--    minha. Nao ha ganho de seguranca: a policy ja aplica o mesmo filtro da view.
--
-- 2) v_tabela_preco_gravacao_oficial_public — BLOQUEIO: a guarda proibe os dois passos.
--    Precisaria de GRANT nas 37 colunas da tabela-base, e o COMMENT proibe
--    literalmente "re-expor a tabela base ao anon". Alem disso o COMMENT lista
--    como EXCLUIDOS "custo_setup" e outros custos, mas pg_depend mostra que a
--    view JA projeta custo_setup_por_cor e custo_manuseio_por_peca — o
--    comentario esta desatualizado e precisa ser corrigido pelo dono junto com
--    a decisao. Linhas nao mudariam (58 antes e depois, medido).
--
-- 3) v_suppliers_public — BLOQUEIO: guarda em migration + catalogo, e divergencia latente.
--    A view e "SELECT ... FROM suppliers" SEM WHERE; suppliers_anon_read e
--    "active = true". Com security_invoker=true a view passaria a esconder
--    fornecedor inativo. Hoje empata (medido: 5 fornecedores, 5 ativos, 0
--    inativos), mas e divergencia latente: no dia em que um for desativado a
--    view muda de resultado sem ninguem toca-la. Afrouxar a policy para "true"
--    so para empatar seria regressao de seguranca.
--
-- 4) v_product_tags_public — BLOQUEIO: quebraria authenticated, medido.
--    As policies de anon sao equivalentes, mas as de authenticated sao org-scoped:
--      product_tags / product_tags_select_org -> EXISTS(products p WHERE p.id = product_id AND user_belongs_to_org(p.organization_id))
--      tags         / tags_select_org         -> user_belongs_to_org(organization_id)
--    Medido: auth.users = 86; usuarios vinculados a unica organization_id dos
--    8360 produtos = 18. Logo 72 dos 86 usuarios logados passariam a ver 0
--    linhas (hoje veem 50611). Mesma classe de regressao que a 20260717114423
--    documenta. Converter exige antes decidir se essas policies devem ser
--    org-scoped num catalogo de organizacao unica — decisao de negocio.
--
-- 5) v_kit_component_media_public — BLOQUEIO: ampliaria LINHAS no PostgREST.
--    Precisaria de GRANT em 6 colunas novas de product_kit_components. O
--    problema nao sao as colunas: e que product_kit_components_public_read e
--    USING "true". Com GRANT, anon passaria a ler em /rest/v1/product_kit_components
--    TODAS as linhas, inclusive componentes de kit de produto inativo/deletado
--    que a view esconde pelo JOIN. A view em si continuaria com 3546 linhas
--    (medido), mas a tabela-base viraria superficie nova. Corrigir exige
--    primeiro endurecer aquela policy — e ela e compartilhada com
--    authenticated (roles anon,authenticated), logo endurece-la mexeria no
--    acesso de authenticated tambem: precisa virar duas policies separadas.
--    DDL de risco real, escopo proprio, PR propria.
--
-- 6) v_product_compositions_public — BLOQUEIO: cadeia de 2 niveis + superficie nao medida.
--    Cadeia: esta view -> public.mv_product_compositions (view, ja
--    security_invoker=true) -> analytics.mv_product_compositions (MATVIEW).
--    Hoje o topo roda como dono, entao a cadeia inteira tambem. Com
--    security_invoker=true no topo, anon precisaria de GRANT nas 6 colunas do
--    matview em analytics (inclusive organization_id, porque privilegio de
--    coluna em view e checado sobre a query reescrita, nao so sobre o SELECT
--    externo). Matview nao aceita RLS: o GRANT entregaria as 8312 linhas, 434
--    delas de produto inativo/deletado — as mesmas 434 que a view esconde. A
--    view continuaria com 7878 linhas (medido), mas a base nao.
--    NAO VERIFICADO: se o PostgREST deste projeto expoe o schema analytics
--    (pgrst.db_schemas nao esta em pg_db_role_setting nem em current_setting;
--    e config de painel). Sem essa resposta nao da para afirmar que o GRANT
--    nao cria superficie REST — e por isso nao entra.
--
-- 7) v_variant_sale_prices_public — BLOQUEIO: vazaria margem, e zeraria a view.
--    (a) linhas: a unica policy de SELECT de variant_supplier_sources e
--        variant_stocks_select_org, aplicada a PUBLIC, USING organization_id IN
--        (orgs de auth.uid()). Como anon tem auth.uid() IS NULL o predicado e
--        falso e o INNER JOIN zera a view: 20592 -> 0 linhas (medido injetando
--        o predicado). authenticated fora da org tambem zera.
--    (b) vazamento: a view existe para publicar sale_price = custo x markup SEM
--        publicar o custo. Com security_invoker=true o invocador precisa de
--        SELECT em variant_supplier_sources.cost_price_1..5 e em
--        markup_configurations.markup_percent — o GRANT que faria a view
--        funcionar entregaria custo de fornecedor e markup ao anon via REST.
--        Seria trocar bypass de RLS por vazamento de margem: pior que o achado.
--    Armadilha registrada: markup_configurations entra por LEFT JOIN, logo
--    perde-la NAO mudaria a contagem de linhas, apenas os PRECOS (fallback para
--    default_markup_percent/115.0). Verificacao so por count(*) nao pegaria —
--    hoje o impacto seria zero (medido: 0 variantes ativas com markup proprio),
--    mas quem for converter essa view precisa comparar VALORES, nao linhas.
--
-- Leitura de conjunto: nas 7 bloqueadas o "fix" do A-V01 exige re-expor ao anon
-- a tabela-base que a view mascara, sem ganhar linha nenhuma de seguranca
-- (as policies de anon ja aplicam o mesmo filtro das views). Projecao
-- SECURITY DEFINER que mascara coluna sensivel e um padrao legitimo, e e o
-- desenho documentado deste banco desde 20260717. Decidir se esse desenho
-- continua valendo e do dono (Git 7), nao desta migration.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- FASE 4 — AUTO-VERIFICACAO. Falha fechada: qualquer divergencia faz
-- RAISE EXCEPTION e, por estar na mesma transacao do psql -1, da ROLLBACK em
-- tudo. Melhor nao aplicar do que aplicar e quebrar o catalogo publico.
-- ---------------------------------------------------------------------------
DO $p06_fase4$
DECLARE
  r               record;
  v_after         bigint;
  v_anon_products bigint;
  v_total         bigint;
  v_visible       bigint;
  v_guard         record;
BEGIN
  -- 4.1 — a view convertida devolve, COMO ANON, o mesmo numero de linhas que
  --       devolvia COMO DONO no inicio da transacao.
  FOR r IN SELECT metric, n FROM _p06_before WHERE metric LIKE 'view:%' ORDER BY metric LOOP
    BEGIN
      EXECUTE 'SET LOCAL ROLE anon';
      EXECUTE format('SELECT count(*) FROM public.%I', substring(r.metric from 6)) INTO v_after;
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN
      EXECUTE 'RESET ROLE';
      RAISE EXCEPTION
        'P06 FASE 4 ABORT: public.% ficou ILEGIVEL para anon depois de security_invoker=true (%). Falta GRANT de coluna ou policy na cadeia de dependencias.',
        substring(r.metric from 6), SQLERRM;
    END;

    IF v_after IS DISTINCT FROM r.n THEN
      RAISE EXCEPTION
        'P06 FASE 4 ABORT: public.% mudou de resultado. ANTES (dono, inicio da transacao) = % linhas; DEPOIS (como anon) = % linhas. A policy de anon nao e equivalente ao filtro da view.',
        substring(r.metric from 6), r.n, v_after;
    END IF;

    RAISE NOTICE 'P06 FASE 4 OK: public.% = % linhas como dono E como anon.', substring(r.metric from 6), v_after;
  END LOOP;

  -- 4.1b — o mesmo para authenticated. A regressao de 20260717 foi justamente
  -- em authenticated (PostgREST 403), nao em anon: verificar so anon deixaria
  -- passar exatamente o erro que ja aconteceu neste banco.
  FOR r IN SELECT metric, n FROM _p06_before WHERE metric LIKE 'view:%' ORDER BY metric LOOP
    BEGIN
      EXECUTE 'SET LOCAL ROLE authenticated';
      EXECUTE format('SELECT count(*) FROM public.%I', substring(r.metric from 6)) INTO v_after;
      EXECUTE 'RESET ROLE';
    EXCEPTION WHEN OTHERS THEN
      EXECUTE 'RESET ROLE';
      RAISE EXCEPTION
        'P06 FASE 4 ABORT: public.% ficou ILEGIVEL para authenticated depois de security_invoker=true (%). E a regressao de PostgREST 403 que a 20260717114423 documenta.',
        substring(r.metric from 6), SQLERRM;
    END;

    IF v_after IS DISTINCT FROM r.n THEN
      RAISE EXCEPTION
        'P06 FASE 4 ABORT: public.% mudou de resultado para authenticated. ANTES (dono) = %; DEPOIS (authenticated, sem auth.uid()) = %. Policy de authenticated nao equivalente ao filtro da view.',
        substring(r.metric from 6), r.n, v_after;
    END IF;

    RAISE NOTICE 'P06 FASE 4 OK: public.% = % linhas tambem como authenticated.', substring(r.metric from 6), v_after;
  END LOOP;

  -- 4.2 — anon NAO passa a ver mais do que devia nas tabelas-base.
  -- Comparacao RELATIVA de proposito: o enunciado pedia "exigir 7926", mas
  -- cravar a constante faria a migration abortar so porque o catalogo mudou
  -- entre a PR e a aplicacao (products muda todo dia). O invariante que importa
  -- e: anon ve na tabela exatamente o que o filtro publico permite, e nao ve as
  -- inativas/deletadas. Em 2026-11-17 isso equivale a 7926 de 8360.
  SELECT n INTO v_total   FROM _p06_before WHERE metric = 'products:total';
  SELECT n INTO v_visible FROM _p06_before WHERE metric = 'products:view_visible';

  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    EXECUTE 'SELECT count(*) FROM public.products' INTO v_anon_products;
    EXECUTE 'RESET ROLE';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'RESET ROLE';
    RAISE EXCEPTION 'P06 FASE 4 ABORT: anon nao consegue contar public.products (%).', SQLERRM;
  END;

  IF v_anon_products IS DISTINCT FROM v_visible THEN
    RAISE EXCEPTION
      'P06 FASE 4 ABORT: anon ve % linhas em public.products, esperado % (= produtos ativos e nao deletados). A superficie de linhas de anon mudou — esta migration nao deveria toca-la.',
      v_anon_products, v_visible;
  END IF;

  IF v_total > v_visible AND v_anon_products >= v_total THEN
    RAISE EXCEPTION
      'P06 FASE 4 ABORT: anon ve % de % linhas em public.products — as % inativas/deletadas deixaram de estar escondidas.',
      v_anon_products, v_total, v_total - v_visible;
  END IF;

  RAISE NOTICE 'P06 FASE 4 OK: anon ve % de % linhas em public.products (% escondidas pelo RLS).',
    v_anon_products, v_total, v_total - v_visible;

  -- 4.3 — colunas sensiveis seguem invisiveis para anon. Pega GRANT de tabela
  -- inteira aplicado por engano, aqui ou por outra migration no mesmo lote.
  -- Colunas conferidas em pg_attribute em 2026-11-17 (todas existem e todas
  -- estao com has_column_privilege('anon',...)=false hoje).
  FOR v_guard IN
    SELECT 'public.' || c.relname || '.' || a.attname AS col
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
       AND ( (c.relname = 'suppliers'                AND a.attname IN ('api_credentials','cnpj','default_markup_percent'))
          OR (c.relname = 'variant_supplier_sources' AND a.attname LIKE 'cost_price_%')
          OR (c.relname = 'markup_configurations'    AND a.attname = 'markup_percent')
          OR (c.relname = 'products'                 AND a.attname = 'organization_id') )
       AND has_column_privilege('anon', c.oid, a.attnum, 'SELECT')
  LOOP
    RAISE EXCEPTION
      'P06 FASE 4 ABORT: anon passou a ter SELECT em % — coluna sensivel que nenhuma view publica projeta.',
      v_guard.col;
  END LOOP;

  -- 4.4 — as 7 views bloqueadas continuam com security_invoker desligado.
  FOR v_guard IN
    SELECT c.relname
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'v'
       AND c.relname IN ('v_products_public','v_suppliers_public','v_product_tags_public',
                         'v_variant_sale_prices_public','v_kit_component_media_public',
                         'v_product_compositions_public','v_tabela_preco_gravacao_oficial_public')
       AND COALESCE((SELECT o FROM unnest(c.reloptions) o WHERE o LIKE 'security_invoker%'), '')
           IN ('security_invoker=true','security_invoker=on')
  LOOP
    RAISE EXCEPTION
      'P06 FASE 4 ABORT: public.% esta com security_invoker ligado. Esta view esta BLOQUEADA (ver bloco "POR QUE SO UMA"): quebra authenticated, vaza margem/custo ou tem guarda textual no catalogo.',
      v_guard.relname;
  END LOOP;

  RAISE NOTICE 'P06 FASE 4 OK: 1 view convertida, 7 bloqueadas intactas, colunas sensiveis fechadas, nenhum GRANT novo.';
END
$p06_fase4$

NOTIFY pgrst, 'reload schema'
