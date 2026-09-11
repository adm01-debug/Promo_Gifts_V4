-- ============================================================================
-- FIX P0 — magazines.view_count era inflado toda noite (double-count).
--
-- CAUSA: magazine_rollup_view_counts() somava `view_count = view_count + c`
-- sobre uma janela DESLIZANTE (`viewed_at >= now() - interval '1 hour'`), e era
-- chamada por DOIS crons:
--   • magazine-view-rollup-hourly  → '5 * * * *'  → roda 03:05, conta 02:05→03:05
--   • magazine-cleanup-nightly     → '15 3 * * *' → roda 03:15, chama
--     magazine_cleanup_all(), cujo 4º passo é o MESMO rollup → conta 02:15→03:15
-- Sobreposição: 02:15→03:05 = 50 min de eventos somados DUAS VEZES, toda noite.
--
-- Além disso, a janela deslizante presumia que o cron nunca atrasa: qualquer
-- jitter criava buraco (eventos perdidos) ou sobreposição (contados 2x).
--
-- CORREÇÃO: marca d'água (watermark) + SELECT ... FOR UPDATE.
-- O FOR UPDATE serializa execuções concorrentes; a 2ª a entrar lê o watermark já
-- avançado e conta o intervalo [now, now) = 0 linhas. Vira exactly-once.
-- Isso torna a chamada dentro de magazine_cleanup_all() INÓCUA — e por isso ela
-- pode (e deve) continuar lá, como rede de segurança caso o cron horário morra.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.magazine_view_rollup_watermark (
  id             boolean     NOT NULL DEFAULT true PRIMARY KEY CHECK (id),  -- singleton
  last_rolled_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.magazine_view_rollup_watermark IS
  'Singleton. Marca d''água do rollup de view_count. Garante exactly-once entre o cron horário e o nightly.';

INSERT INTO public.magazine_view_rollup_watermark (id, last_rolled_at)
VALUES (true, now())
ON CONFLICT (id) DO NOTHING;

GRANT ALL ON public.magazine_view_rollup_watermark TO service_role;
ALTER TABLE public.magazine_view_rollup_watermark ENABLE ROW LEVEL SECURITY;
-- Sem policies: fail-closed. Só SECURITY DEFINER / service_role acessa.

CREATE OR REPLACE FUNCTION public.magazine_rollup_view_counts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _from         timestamptz;
  _to           timestamptz := now();
  updated_count integer := 0;
BEGIN
  -- Serializa execuções concorrentes (horário x nightly) e lê a marca d'água.
  SELECT last_rolled_at INTO _from
  FROM public.magazine_view_rollup_watermark
  WHERE id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.magazine_view_rollup_watermark (id, last_rolled_at)
    VALUES (true, _to)
    ON CONFLICT (id) DO NOTHING;
    RETURN 0;
  END IF;

  -- Execução duplicada dentro da mesma janela: nada novo para somar.
  IF _from >= _to THEN
    RETURN 0;
  END IF;

  WITH counts AS (
    SELECT magazine_id, count(*) AS c
    FROM public.magazine_public_view_events
    WHERE viewed_at >= _from
      AND viewed_at <  _to          -- half-open [_from, _to): sem overlap entre janelas
    GROUP BY magazine_id
  )
  UPDATE public.magazines m
  SET view_count = m.view_count + counts.c
  FROM counts
  WHERE m.id = counts.magazine_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  UPDATE public.magazine_view_rollup_watermark
  SET last_rolled_at = _to
  WHERE id;

  RETURN updated_count;
END;
$function$;

COMMENT ON FUNCTION public.magazine_rollup_view_counts() IS
  'Exactly-once. Soma view_count no intervalo half-open [watermark, now()) e avança o watermark sob FOR UPDATE. Seguro para chamar N vezes.';;
