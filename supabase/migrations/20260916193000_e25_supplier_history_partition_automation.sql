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
-- Diferença deliberada do padrão espelhado: as partições de
-- supplier_products_raw_history não têm GRANT nem policy por partição (controle de
-- acesso vive só na tabela-mãe — confirmado via information_schema.role_table_grants
-- e pg_policy sobre supplier_products_raw_history_p2026_09, ambos vazios). A função
-- abaixo por isso não replica os passos de RLS/GRANT por partição do espelho.
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

-- Backfill imediato: cobre até bem depois do prazo de 2026-12-15 (6 meses à frente
-- de 2026-09 = até 2027-02 inclusive), independente do que o cron diário venha a fazer.
SELECT public.fn_ensure_history_partitions(6);

-- Partição DEFAULT — rede de segurança contra falha de manutenção futura.
CREATE TABLE public.supplier_products_raw_history_default
  PARTITION OF public.supplier_products_raw_history DEFAULT;

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
