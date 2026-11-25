-- E25 — Automação de partições de public.supplier_products_raw_history
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (linhas 520-531)
-- Prazo duro citado no plano: 2026-12-15 (última partição mensal viva hoje é p2026_12).
--
-- Correção ao texto do plano: a coluna de particionamento é `captured_at`,
-- não `created_at` como o texto do plano menciona. Confirmado ao vivo via
-- pg_partitioned_table/pg_attribute em 2026-09-16.
--
-- Opção escolhida: B (função + pg_cron), não A (pg_partman). Motivo: pg_partman
-- não está instalada nesta base (só pg_cron 1.6.4 confirmado em pg_extension);
-- Opção B replica um padrão já provado em produção
-- (public.magazine_ensure_view_event_partitions + cron 'magazine-partition-maintenance',
-- jobid 301, ativo, roda diariamente às 04:00) sem introduzir nova extensão.
--
-- CORREÇÃO (2026-11-25) — a premissa original desta seção estava errada.
-- Texto anterior: "as partições não têm GRANT nem policy por partição (controle de
-- acesso vive só na tabela-mãe); a função por isso não replica os passos de
-- RLS/GRANT por partição do espelho". Isso só era verdade para as partições
-- p2026_* naquele instante — e porque estavam assim, o Supabase acusou
-- `rls_disabled_in_public` nelas.
-- RLS é por RELAÇÃO e NÃO é herdada por partição: uma partição sem
-- `ENABLE ROW LEVEL SECURITY` fica fora do alcance do RLS da mãe quando é
-- consultada diretamente (o que o PostgREST permite). O incidente já aconteceu
-- neste mesmo conjunto de tabelas em
-- 20261104100000_partitions_supplier_products_raw_history_2027.sql:14-52
-- (10 partições criadas sem RLS) e precisou ser corrigido depois em
-- 20261112140000_fix_rls_supplier_products_raw_history_p2027.sql.
-- Como a função abaixo cria partições NOVAS em produção todo mês, ela precisa
-- nascer criando RLS + policies — senão cada execução do cron reabre o incidente
-- uma vez por mês, de forma silenciosa. O bloco por partição replica exatamente
-- fn_purge_spr_history JOB 3 (20260903093431_spr_partition_policies_parity_and_smoke_relkind.sql),
-- que é o criador de partições já em produção.
-- A partição DEFAULT recebe o mesmo tratamento, por DDL explícita abaixo.
--
-- Rede de segurança: partição DEFAULT (supplier_products_raw_history_default), hoje
-- inexistente. Sem ela, um INSERT com captured_at fora de qualquer partição futura
-- falharia com erro fatal ("no partition of relation found for row") — uma
-- interrupção dura do pipeline Bronze. Com ela, linhas fora do intervalo mantido
-- vão parar ali (não deveriam, se o cron de manutenção estiver rodando) e viram
-- alerta, não uma queda.
--
-- Alerta da partição DEFAULT: implementado como job pg_cron SEPARADO, SEM passar
-- por public.fn_cron_safe_run. Motivo: fn_cron_safe_run captura toda exceção
-- internamente (bloco WHEN OTHERS) e sempre retorna normalmente — uma
-- RAISE EXCEPTION dentro dela nunca aparece como cron.job_run_details.status='failed'.
-- Um alerta que precisa ser visível como falha de job não pode passar por esse
-- wrapper. Confirmado lendo a definição completa da função em 2026-09-16.
--
-- Sem dependência do schema `ops` (E30/E33) — schema ainda não existe
-- (information_schema.schemata confirmado vazio para 'ops' em 2026-09-16) e E25 não
-- deve ficar bloqueada por uma etapa [REQUER-PO] ainda não aprovada.

DO $precondition$
BEGIN
  IF to_regclass('public.supplier_products_raw_history') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.supplier_products_raw_history não existe';
  END IF;

  IF to_regclass('public.supplier_products_raw_history_default') IS NOT NULL THEN
    RAISE EXCEPTION 'Precondição falhou: partição DEFAULT já existe — migration não é idempotente para este passo';
  END IF;

  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname IN ('supplier-history-partition-maintenance', 'supplier-history-default-partition-alert')
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: já existe cron job com um dos nomes-alvo desta migration';
  END IF;
END;
$precondition$;

-- Função de manutenção: cria partições mensais faltantes de
-- supplier_products_raw_history, do mês atual até p_months_ahead meses no futuro.
-- Idempotente (verifica pg_class antes de criar cada partição).
CREATE OR REPLACE FUNCTION public.fn_ensure_history_partitions(p_months_ahead integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_created integer := 0;
  v_i integer;
  v_month date;
  v_name text;
BEGIN
  FOR v_i IN 0..p_months_ahead LOOP
    v_month := (date_trunc('month', now()) + make_interval(months => v_i))::date;
    v_name := 'supplier_products_raw_history_p' || to_char(v_month, 'YYYY_MM');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = v_name AND relnamespace = 'public'::regnamespace
    ) THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.supplier_products_raw_history FOR VALUES FROM (%L) TO (%L)',
        v_name, v_month, (v_month + interval '1 month')::date
      );
      -- RLS é por relação e NÃO é herdada: a partição nasce protegida, com as mesmas
      -- duas policies das irmãs (paridade 2026-09-03). Sem isto, cada mês o cron
      -- reabriria o achado `rls_disabled_in_public` do Supabase.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
      EXECUTE format('CREATE POLICY hist_all_service ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', v_name);
      EXECUTE format('CREATE POLICY hist_select_admin ON public.%I FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())))', v_name);
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN v_created;
END;
$function$;

COMMENT ON FUNCTION public.fn_ensure_history_partitions(integer) IS
  'Cria partições mensais faltantes de supplier_products_raw_history (chave: captured_at), '
  'do mês atual até p_months_ahead meses à frente. Idempotente. Criada em 20260916193000 '
  'para E25 do PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md. Chamada diariamente '
  'via cron supplier-history-partition-maintenance (job separado supplier-history-default-'
  'partition-alert cobre o caso de falha desta manutenção).';

-- Hardening: a função é SECURITY DEFINER e escreve DDL; sem REVOKE ela ficaria
-- exposta como RPC do PostgREST para anon/authenticated. Mesmo padrão de
-- 20260716000029_revoke_auth_internal_mvs_and_secdef_pipeline_fns.sql.
REVOKE EXECUTE ON FUNCTION public.fn_ensure_history_partitions(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ensure_history_partitions(integer) TO service_role;

-- Backfill imediato: cobre até bem depois do prazo de 2026-12-15 (6 meses à frente
-- de 2026-09 = até 2027-02 inclusive), independente do que o cron diário venha a fazer.
SELECT public.fn_ensure_history_partitions(6);

-- Partição DEFAULT — rede de segurança contra falha de manutenção futura.
CREATE TABLE public.supplier_products_raw_history_default
  PARTITION OF public.supplier_products_raw_history DEFAULT;

-- A DEFAULT também é uma relação: precisa de RLS + policies próprias, senão o
-- PostgREST a expõe sem filtro (mesmo achado rls_disabled_in_public).
ALTER TABLE public.supplier_products_raw_history_default ENABLE ROW LEVEL SECURITY;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_default
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_default
  FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

COMMENT ON TABLE public.supplier_products_raw_history_default IS
  'Rede de segurança E25: recebe linhas de supplier_products_raw_history com captured_at '
  'fora de qualquer partição mensal criada. Não deveria nunca acumular linhas se o cron '
  'supplier-history-partition-maintenance estiver funcionando. Monitorada pelo cron '
  'supplier-history-default-partition-alert (RAISE EXCEPTION se count > 0 — falha nativa '
  'e visível em cron.job_run_details, sem passar por fn_cron_safe_run).';

-- Job 1: manutenção diária, via wrapper padrão do projeto (timeout, log, não derruba
-- outros jobs em caso de erro pontual).
SELECT cron.schedule(
  'supplier-history-partition-maintenance',
  '0 4 * * *',
  $cron$SELECT public.fn_cron_safe_run(200::bigint, 'SELECT public.fn_ensure_history_partitions(3);', 44000, 'supplier-history-partitions');$cron$
);

-- Job 2: alerta da partição DEFAULT, diário, SEM wrapper — precisa que uma falha real
-- vire cron.job_run_details.status='failed' de forma nativa (ver nota acima sobre
-- fn_cron_safe_run engolir exceções).
SELECT cron.schedule(
  'supplier-history-default-partition-alert',
  '15 4 * * *',
  $cron$DO $do$
DECLARE
  v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.supplier_products_raw_history_default;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ALERTA E25: % linha(s) na partição DEFAULT de supplier_products_raw_history — gap de partição futura, risco ao pipeline Bronze', v_count;
  END IF;
END;
$do$;$cron$
);

DO $postcondition$
DECLARE
  v_future_partitions integer;
  v_unprotected text;
BEGIN
  SELECT count(*) INTO v_future_partitions
  FROM pg_class
  WHERE relnamespace = 'public'::regnamespace
    AND relname ~ '^supplier_products_raw_history_p2027_0[1-2]$';

  IF v_future_partitions < 2 THEN
    RAISE EXCEPTION 'Pós-condição falhou: esperava partições p2027_01 e p2027_02, achou %', v_future_partitions;
  END IF;

  IF to_regclass('public.supplier_products_raw_history_default') IS NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: partição DEFAULT não foi criada';
  END IF;

  -- Invariante de segurança: nenhuma partição desta família pode existir sem RLS
  -- ativo e sem as duas policies. Foi exatamente essa ausência que gerou o achado
  -- rls_disabled_in_public corrigido em 20261112140000. Falhar aqui aborta a
  -- migration inteira (transação única), então nada fica meio-aplicado.
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO v_unprotected
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relispartition
    AND c.relname LIKE 'supplier_products_raw_history_%'
    AND (
      NOT c.relrowsecurity
      OR (SELECT count(*) FROM pg_policies p
           WHERE p.schemaname = 'public'
             AND p.tablename = c.relname
             AND p.policyname IN ('hist_all_service', 'hist_select_admin')) <> 2
    );

  IF v_unprotected IS NOT NULL THEN
    RAISE EXCEPTION 'Pós-condição falhou: partições sem RLS ou sem as 2 policies: %', v_unprotected;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'supplier-history-partition-maintenance' AND active) THEN
    RAISE EXCEPTION 'Pós-condição falhou: cron de manutenção não foi criado ou não está ativo';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'supplier-history-default-partition-alert' AND active) THEN
    RAISE EXCEPTION 'Pós-condição falhou: cron de alerta não foi criado ou não está ativo';
  END IF;

  IF EXISTS (SELECT 1 FROM public.supplier_products_raw_history_default) THEN
    RAISE EXCEPTION 'Pós-condição falhou: partição DEFAULT nasceu com linhas — inesperado, investigar antes de prosseguir';
  END IF;
END;
$postcondition$;
