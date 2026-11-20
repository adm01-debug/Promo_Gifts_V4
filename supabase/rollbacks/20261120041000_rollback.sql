-- Rollback: 20261120041000_production_lead_time_calendar
--
-- Desfaz o prazo de produção em dias úteis: remove public.business_calendar,
-- a coluna print_area_techniques.production_days e devolve o comentário de
-- products.lead_time_days ao texto que tinha em produção em 2026-11-20.
--
-- Antes de remover, guarda em tabelas _backup_*_YYYYMMDD (UTC), com RLS ligada
-- e sem acesso de PUBLIC/anon/authenticated (CONTRIBUTING.md):
--   _backup_business_calendar_YYYYMMDD                 → a tabela inteira
--   _backup_print_area_techniques_production_days_YYYYMMDD → id + production_days
--                                                         das linhas com prazo preenchido
-- Se o backup do dia já existe, usa o primeiro nome livre (_2, _3, ...): uma
-- segunda execução no mesmo dia nunca sobrescreve nem pula o backup. O DROP só
-- acontece depois de conferir que cada backup tem todas as linhas.
--
-- Restaurar: reaplicar a migration e
--   INSERT INTO public.business_calendar (day, description, created_at, created_by)
--   SELECT day, description, created_at, created_by
--     FROM public._backup_business_calendar_YYYYMMDD
--   ON CONFLICT (day) DO UPDATE SET description = EXCLUDED.description;
--   UPDATE public.print_area_techniques p
--      SET production_days = b.production_days
--     FROM public._backup_print_area_techniques_production_days_YYYYMMDD b
--    WHERE b.id = p.id;
--
-- Antes de reverter, o código que lê production_days e business_calendar
-- (useProductionLeadTime, admin de técnicas, aba Feriados) precisa estar fora
-- de produção: sem eles, o select que os cita devolve erro 400.

DO $$
DECLARE
  dia text := to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
  base text;
  alvo text;
  n integer;
  esperadas bigint;
  copiadas bigint;
BEGIN
  -- 1) business_calendar
  IF to_regclass('public.business_calendar') IS NOT NULL THEN
    base := '_backup_business_calendar_' || dia;
    alvo := base;
    n := 1;
    WHILE to_regclass('public.' || quote_ident(alvo)) IS NOT NULL LOOP
      n := n + 1;
      alvo := base || '_' || n;
    END LOOP;

    EXECUTE format('CREATE TABLE public.%I AS TABLE public.business_calendar', alvo);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', alvo);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', alvo);

    EXECUTE 'SELECT count(*) FROM public.business_calendar' INTO esperadas;
    EXECUTE format('SELECT count(*) FROM public.%I', alvo) INTO copiadas;
    IF esperadas <> copiadas THEN
      RAISE EXCEPTION 'Rollback recusado: backup % tem % linha(s) e business_calendar tem %.',
        alvo, copiadas, esperadas;
    END IF;

    DROP TABLE public.business_calendar;
    RAISE NOTICE 'business_calendar removida. Backup de % feriado(s) em public.%.', copiadas, alvo;
  END IF;

  -- 2) print_area_techniques.production_days
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'print_area_techniques'
       AND column_name = 'production_days'
  ) THEN
    base := '_backup_print_area_techniques_production_days_' || dia;
    alvo := base;
    n := 1;
    WHILE to_regclass('public.' || quote_ident(alvo)) IS NOT NULL LOOP
      n := n + 1;
      alvo := base || '_' || n;
    END LOOP;

    EXECUTE format(
      'CREATE TABLE public.%I AS SELECT id, production_days FROM public.print_area_techniques WHERE production_days IS NOT NULL',
      alvo
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', alvo);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', alvo);

    EXECUTE 'SELECT count(*) FROM public.print_area_techniques WHERE production_days IS NOT NULL' INTO esperadas;
    EXECUTE format('SELECT count(*) FROM public.%I', alvo) INTO copiadas;
    IF esperadas <> copiadas THEN
      RAISE EXCEPTION 'Rollback recusado: backup % tem % linha(s) e há % técnica(s) com production_days.',
        alvo, copiadas, esperadas;
    END IF;

    ALTER TABLE public.print_area_techniques
      DROP CONSTRAINT IF EXISTS print_area_techniques_production_days_check;
    ALTER TABLE public.print_area_techniques DROP COLUMN production_days;
    RAISE NOTICE 'Coluna removida. Backup de % prazo(s) em public.%.', copiadas, alvo;
  END IF;
END $$;

-- 3) comentário de products.lead_time_days volta ao texto anterior (produção, 2026-11-20)
COMMENT ON COLUMN public.products.lead_time_days IS
  'Prazo de produção em dias úteis. 82% preenchido (NULL=herda fornecedor). Valores: 2 ou 3.';
