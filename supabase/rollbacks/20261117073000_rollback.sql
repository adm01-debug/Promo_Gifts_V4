-- Rollback: 20261117073000_p06_security_invoker_v_product_properties_public.sql
-- Desfaz as 3 fases na ordem inversa (FASE 3 -> FASE 2 -> FASE 1), idempotente
-- e com guardas. Devolve public.v_product_properties_public ao estado
-- SECURITY DEFINER (security_invoker=false) de fix_version 20260717.
--
-- ATENCAO: reintroduz o achado A-V01 nesta view — ela volta a rodar com os
-- privilegios do dono e a ignorar o RLS de public.product_properties. As
-- linhas voltam a ser cortadas pelo JOIN da view, nao pela policy.
-- Nao ha perda de dado e nao ha mudanca de linhas: medido em 2026-11-17, a
-- view devolve 33116 linhas nos dois modos, para anon e para authenticated.
--
-- Aplicar na mesma transacao (psql -1). Rodar duas vezes e no-op.

-- ---------------------------------------------------------------------------
-- FASE 3 invertida — desliga security_invoker e restaura o COMMENT original.
-- ---------------------------------------------------------------------------
DO $rb_fase3$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'v_product_properties_public' AND c.relkind = 'v'
  ) THEN
    RAISE NOTICE 'ROLLBACK P06: public.v_product_properties_public nao existe — nada a desfazer na FASE 3.';
  ELSE
    ALTER VIEW public.v_product_properties_public SET (security_invoker = false);

    -- COMMENT exato que estava no catalogo antes da migration (lido com
    -- obj_description em 2026-11-17, antes de aplicar).
    COMMENT ON VIEW public.v_product_properties_public IS
      'SECURITY DEFINER intencional (fix_version 20260717). Colunas: property_code, property_value.';

    RAISE NOTICE 'ROLLBACK P06: security_invoker=false e COMMENT original restaurados em public.v_product_properties_public.';
  END IF;
END
$rb_fase3$;

-- ---------------------------------------------------------------------------
-- FASE 2 invertida — NENHUM REVOKE, de proposito.
--
-- A migration nao concedeu privilegio nenhum: medido em 2026-11-17, anon JA
-- tinha SELECT nas 9 colunas de public.product_properties e nas 3 colunas de
-- public.products de que a view precisa (a FASE 2 da migration e so uma
-- assercao de pre-condicao). Revogar aqui destruiria acesso PREEXISTENTE,
-- anterior a esta migration, e quebraria a view tambem no modo definer.
--
-- A assercao abaixo existe para o caso de alguem ter "ajudado" o rollback com
-- um REVOKE manual: ela avisa alto em vez de deixar a view quebrada em
-- silencio.
-- ---------------------------------------------------------------------------
DO $rb_fase2$
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
    RAISE WARNING
      'ROLLBACK P06: anon esta SEM GRANT de coluna em: %. Esta migration nunca revogou isso — foi outra coisa. No modo definer a view volta a funcionar, mas /rest/v1/product_properties fica quebrado para anon. Investigue antes de encerrar.',
      v_missing;
  ELSE
    RAISE NOTICE 'ROLLBACK P06: FASE 2 nao tinha GRANT a desfazer; privilegios de coluna de anon intactos.';
  END IF;
END
$rb_fase2$;

-- ---------------------------------------------------------------------------
-- FASE 1 invertida — NENHUMA policy a restaurar.
-- A migration nao executou ALTER POLICY (era no-op verificado: a policy
-- product_properties_anon_read ja replicava o filtro da view). Nada a desfazer.
-- A verificacao abaixo confirma que a policy segue intacta.
-- ---------------------------------------------------------------------------
DO $rb_fase1$
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
     AND p.polpermissive;

  IF v_qual IS DISTINCT FROM 'fn_product_active_for_rls(product_id)' THEN
    RAISE WARNING
      'ROLLBACK P06: USING de product_properties_anon_read esta "%", esperado "fn_product_active_for_rls(product_id)". Esta migration nunca alterou policy — foi outra coisa.',
      COALESCE(v_qual, '(policy ausente)');
  ELSE
    RAISE NOTICE 'ROLLBACK P06: FASE 1 nao tinha ALTER POLICY a desfazer; policy de anon intacta.';
  END IF;
END
$rb_fase1$;

-- ---------------------------------------------------------------------------
-- Verificacao final do rollback — falha fechada, mesma logica da FASE 4 da
-- migration: a view tem de voltar a ler igual para dono, anon e authenticated.
-- ---------------------------------------------------------------------------
DO $rb_verify$
DECLARE
  v_owner bigint;
  v_anon  bigint;
  v_auth  bigint;
  v_si    text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'v_product_properties_public' AND c.relkind = 'v'
  ) THEN
    RAISE NOTICE 'ROLLBACK P06: view ausente, verificacao final dispensada.';
    RETURN;
  END IF;

  SELECT COALESCE((SELECT o FROM unnest(c.reloptions) o WHERE o LIKE 'security_invoker%'), 'security_invoker=false(default)')
    INTO v_si
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'v_product_properties_public';

  IF v_si IN ('security_invoker=true', 'security_invoker=on') THEN
    RAISE EXCEPTION 'ROLLBACK P06 ABORT: security_invoker continua ligado (%) — o ALTER VIEW da FASE 3 invertida nao pegou.', v_si;
  END IF;

  SELECT count(*) INTO v_owner FROM public.v_product_properties_public;

  EXECUTE 'SET LOCAL ROLE anon';
  EXECUTE 'SELECT count(*) FROM public.v_product_properties_public' INTO v_anon;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SELECT count(*) FROM public.v_product_properties_public' INTO v_auth;
  EXECUTE 'RESET ROLE';

  IF v_anon IS DISTINCT FROM v_owner OR v_auth IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION
      'ROLLBACK P06 ABORT: public.v_product_properties_public divergiu depois do rollback — dono=%, anon=%, authenticated=%.',
      v_owner, v_anon, v_auth;
  END IF;

  RAISE NOTICE 'ROLLBACK P06 OK: % (dono) = % (anon) = % (authenticated); security_invoker = %.',
    v_owner, v_anon, v_auth, v_si;
END
$rb_verify$;

NOTIFY pgrst, 'reload schema';
