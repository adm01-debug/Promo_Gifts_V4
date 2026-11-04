CREATE OR REPLACE FUNCTION public.magazine_rollup_view_counts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$
