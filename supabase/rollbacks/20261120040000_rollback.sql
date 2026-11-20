-- Rollback: 20261120040000_add_quotes_freight_plan
--
-- Remove de public.quotes as colunas freight_plan, freight_mix_mode e
-- show_freight_plan_to_client e os CHECKs quotes_freight_mix_mode_check e
-- quotes_freight_plan_shape_check.
--
-- Antes do DROP, grava em _backup_quotes_freight_plan_YYYYMMDD (UTC) os orçamentos
-- que usavam alguma das colunas (freight_plan não nulo, freight_mix_mode não nulo
-- ou show_freight_plan_to_client true): id + as 3 colunas, com RLS ligada e sem
-- acesso de PUBLIC/anon/authenticated (CONTRIBUTING.md). O resto volta ao valor
-- padrão (NULL, NULL e false), que é o que a coluna teria sem uso.
-- Se o backup do dia já existe, usa o primeiro nome livre (_2, _3, ...): uma
-- segunda execução no mesmo dia nunca sobrescreve nem pula o backup.
-- O DROP só acontece depois de conferir que o backup tem todas as linhas.
--
-- Restaurar: reaplicar a migration e
--   UPDATE public.quotes q
--      SET freight_plan = b.freight_plan,
--          freight_mix_mode = b.freight_mix_mode,
--          show_freight_plan_to_client = b.show_freight_plan_to_client
--     FROM public._backup_quotes_freight_plan_YYYYMMDD b
--    WHERE b.id = q.id;
--
-- Antes de reverter, o código que lê ou grava as colunas (salvar/restaurar
-- orçamento, painel de volumes, PDF e as funções do banco que as citarem) precisa
-- estar fora de produção: sem as colunas, o select/insert que as cita devolve erro.

DO $$
DECLARE
  base text := '_backup_quotes_freight_plan_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
  alvo text := base;
  n integer := 1;
  usados bigint;
  copiados bigint;
BEGIN
  IF (
    SELECT count(*)
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'quotes'
       AND column_name IN ('freight_plan', 'freight_mix_mode', 'show_freight_plan_to_client')
  ) = 3 THEN
    WHILE to_regclass('public.' || quote_ident(alvo)) IS NOT NULL LOOP
      n := n + 1;
      alvo := base || '_' || n;
    END LOOP;

    EXECUTE format(
      'CREATE TABLE public.%I AS SELECT id, freight_plan, freight_mix_mode, show_freight_plan_to_client FROM public.quotes WHERE freight_plan IS NOT NULL OR freight_mix_mode IS NOT NULL OR show_freight_plan_to_client',
      alvo
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', alvo);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', alvo);

    EXECUTE 'SELECT count(*) FROM public.quotes WHERE freight_plan IS NOT NULL OR freight_mix_mode IS NOT NULL OR show_freight_plan_to_client'
      INTO usados;
    EXECUTE format('SELECT count(*) FROM public.%I', alvo) INTO copiados;
    IF usados <> copiados THEN
      RAISE EXCEPTION 'Rollback recusado: backup % tem % linha(s) e há % orçamento(s) com plano de frete.',
        alvo, copiados, usados;
    END IF;
    RAISE NOTICE 'Backup de % orçamento(s) em public.%.', copiados, alvo;
  ELSE
    RAISE NOTICE 'As 3 colunas de frete não existem juntas em public.quotes: sem backup a fazer.';
  END IF;

  ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_freight_mix_mode_check;
  ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_freight_plan_shape_check;
  ALTER TABLE public.quotes DROP COLUMN IF EXISTS freight_plan;
  ALTER TABLE public.quotes DROP COLUMN IF EXISTS freight_mix_mode;
  ALTER TABLE public.quotes DROP COLUMN IF EXISTS show_freight_plan_to_client;
END $$;
