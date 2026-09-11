-- ============================================================================
-- FIX P1 (a) — RETENTION SILENCIOSAMENTE QUEBRADA
--
-- magazine_cleanup_view_events() fazia:
--     DELETE FROM public.magazine_public_view_events_default WHERE viewed_at < cutoff
--                                                  ^^^^^^^^ SÓ a partição DEFAULT
--
-- Hoje isso "funciona" por acidente: a DEFAULT é a única partição que existe.
-- No dia 25, o cron magazine-partition-maintenance cria a partição mensal —
-- e a partir daí TODAS as linhas novas caem nela, onde o DELETE nunca olha.
-- Resultado: retention de 180 dias vira crescimento ILIMITADO, em silêncio.
--
-- CORREÇÃO: deletar pela TABELA PAI. O Postgres roteia o DELETE para todas as
-- partições, inclusive a DEFAULT.
--
-- FIX P1 (b) — BOMBA-RELÓGIO DO PARTICIONAMENTO
--
-- A manutenção rodava só no dia 25 e criava APENAS o mês seguinte. Duas falhas:
--   1. NÃO EXISTE partição do mês corrente. Todo evento de julho/2026 está indo
--      para a DEFAULT.
--   2. Se o cron falhar UMA vez, as linhas do mês seguinte caem na DEFAULT — e aí
--      `CREATE TABLE ... PARTITION OF` daquele mês passa a FALHAR PARA SEMPRE:
--      o Postgres precisa provar que a DEFAULT não tem linha no range novo, pega
--      ACCESS EXCLUSIVE, faz full scan e aborta com
--      "updated partition constraint for default partition would be violated".
--      Quebra permanente e silenciosa.
--
-- CORREÇÃO: função idempotente que garante [mês corrente .. +N meses], rodando
-- DIARIAMENTE. Um dia de falha deixa de ser fatal (há 3 meses de folga).
--
-- JANELA LIVRE: a tabela tem 0 linhas AGORA. Anexar a partição do mês corrente
-- neste momento é instantâneo e sem risco. Com dados dentro, custaria downtime.
-- ============================================================================

-- (a) Retention correta: DELETE no PAI roteia para todas as partições.
CREATE OR REPLACE FUNCTION public.magazine_cleanup_view_events(_ttl_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  deleted_count integer := 0;
BEGIN
  DELETE FROM public.magazine_public_view_events   -- PAI: roteia p/ TODAS as partições
  WHERE viewed_at < now() - make_interval(days => _ttl_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

COMMENT ON FUNCTION public.magazine_cleanup_view_events(integer) IS
  'Retention de view events. DELETE na tabela PAI (roteia p/ todas as partições). Antes apagava só da DEFAULT.';

-- (b) Manutenção de partições: idempotente, com lookahead.
CREATE OR REPLACE FUNCTION public.magazine_ensure_view_event_partitions(_months_ahead integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _created integer := 0;
  _i       integer;
  _m       date;
  _name    text;
BEGIN
  -- i = 0 garante o MÊS CORRENTE (que hoje não existe).
  FOR _i IN 0.._months_ahead LOOP
    _m    := (date_trunc('month', now()) + make_interval(months => _i))::date;
    _name := 'magazine_public_view_events_' || to_char(_m, 'YYYY_MM');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = _name AND relnamespace = 'public'::regnamespace
    ) THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.magazine_public_view_events FOR VALUES FROM (%L) TO (%L)',
        _name, _m, (_m + interval '1 month')::date
      );
      _created := _created + 1;
    END IF;
  END LOOP;

  RETURN _created;
END;
$function$;

COMMENT ON FUNCTION public.magazine_ensure_view_event_partitions(integer) IS
  'Idempotente. Garante partições de [mês corrente .. +N]. Rodar DIARIAMENTE: lookahead evita que uma falha de cron quebre o particionamento permanentemente.';;
