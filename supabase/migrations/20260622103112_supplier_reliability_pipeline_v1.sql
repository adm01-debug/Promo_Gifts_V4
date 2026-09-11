
-- =============================================================================
-- MIGRATION: supplier_replenishment_events + reliability pipeline
-- APLICADO: 2026-06-22
-- CORREÇÕES vs prompt original:
--   [C1] arrival_snapshot_id: uuid → bigint (stock_snapshots.id é bigint)
--   [C2] delta usa stock_main_delta + stock_other_delta (colunas pré-calculadas)
--   [C3] REVOKE PUBLIC/anon antes de whitelist (padrão do projeto)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════
-- 1. TABELA PRINCIPAL
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.supplier_replenishment_events (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           uuid          NOT NULL,
  supplier_id         uuid          NOT NULL,
  variant_id          uuid          NOT NULL,
  slot                smallint      NOT NULL CHECK (slot BETWEEN 1 AND 6),
  promised_date       date          NOT NULL,
  promised_quantity   integer       NOT NULL CHECK (promised_quantity > 0),
  observed_at         timestamptz   NOT NULL,
  resolution          text          NOT NULL DEFAULT 'pending'
                      CHECK (resolution IN ('pending','fulfilled','expired','superseded')),
  actual_date         date,
  actual_quantity     integer       CHECK (actual_quantity IS NULL OR actual_quantity >= 0),
  delay_days          integer       GENERATED ALWAYS AS (
                        CASE WHEN actual_date IS NULL THEN NULL
                             ELSE (actual_date - promised_date)
                        END
                      ) STORED,
  fulfillment_ratio   numeric(5,4)  GENERATED ALWAYS AS (
                        CASE WHEN actual_quantity IS NULL OR promised_quantity = 0 THEN NULL
                             ELSE LEAST(1.0, actual_quantity::numeric / promised_quantity)
                        END
                      ) STORED,
  resolved_at         timestamptz,
  arrival_snapshot_id bigint,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT uq_sre_promise UNIQUE (source_id, slot, promised_date, promised_quantity, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_sre_supplier_date
  ON public.supplier_replenishment_events (supplier_id, promised_date DESC);

CREATE INDEX IF NOT EXISTS idx_sre_variant_date
  ON public.supplier_replenishment_events (variant_id, promised_date DESC);

CREATE INDEX IF NOT EXISTS idx_sre_pending
  ON public.supplier_replenishment_events (resolution)
  WHERE resolution = 'pending';

CREATE INDEX IF NOT EXISTS idx_sre_fulfilled_at
  ON public.supplier_replenishment_events (resolved_at DESC)
  WHERE resolution = 'fulfilled';

CREATE INDEX IF NOT EXISTS idx_sre_source_pending
  ON public.supplier_replenishment_events (source_id, promised_date)
  WHERE resolution = 'pending';

-- ═══════════════════════════════════════════════════════════════════
-- 2. RLS + GRANTs
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.supplier_replenishment_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.supplier_replenishment_events TO authenticated;
GRANT ALL    ON public.supplier_replenishment_events TO service_role;

DROP POLICY IF EXISTS "auth read events" ON public.supplier_replenishment_events;
CREATE POLICY "auth read events"
  ON public.supplier_replenishment_events
  FOR SELECT TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- 3. fn_capture_supplier_promise (trigger em variant_supplier_sources)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_capture_supplier_promise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot     smallint;
  v_date     date;
  v_qty      integer;
  v_old_date date;
  v_old_qty  integer;
BEGIN
  FOR v_slot IN 1..6 LOOP

    v_date := CASE v_slot
      WHEN 1 THEN NEW.next_date_1 WHEN 2 THEN NEW.next_date_2
      WHEN 3 THEN NEW.next_date_3 WHEN 4 THEN NEW.next_date_4
      WHEN 5 THEN NEW.next_date_5 WHEN 6 THEN NEW.next_date_6
    END;
    v_qty := CASE v_slot
      WHEN 1 THEN NEW.next_quantity_1 WHEN 2 THEN NEW.next_quantity_2
      WHEN 3 THEN NEW.next_quantity_3 WHEN 4 THEN NEW.next_quantity_4
      WHEN 5 THEN NEW.next_quantity_5 WHEN 6 THEN NEW.next_quantity_6
    END;

    IF TG_OP = 'UPDATE' THEN
      v_old_date := CASE v_slot
        WHEN 1 THEN OLD.next_date_1 WHEN 2 THEN OLD.next_date_2
        WHEN 3 THEN OLD.next_date_3 WHEN 4 THEN OLD.next_date_4
        WHEN 5 THEN OLD.next_date_5 WHEN 6 THEN OLD.next_date_6
      END;
      v_old_qty := CASE v_slot
        WHEN 1 THEN OLD.next_quantity_1 WHEN 2 THEN OLD.next_quantity_2
        WHEN 3 THEN OLD.next_quantity_3 WHEN 4 THEN OLD.next_quantity_4
        WHEN 5 THEN OLD.next_quantity_5 WHEN 6 THEN OLD.next_quantity_6
      END;

      -- Slot foi zerado antes de expirar → superseded
      IF (v_old_date IS NOT NULL AND COALESCE(v_old_qty, 0) > 0)
         AND (v_date IS NULL OR COALESCE(v_qty, 0) <= 0)
         AND v_old_date >= (current_date - 15) THEN
        UPDATE public.supplier_replenishment_events
        SET resolution = 'superseded', resolved_at = now(), updated_at = now()
        WHERE source_id = NEW.id AND slot = v_slot
          AND promised_date = v_old_date AND resolution = 'pending';
        CONTINUE;
      END IF;

      -- Sem mudança → skip
      IF (v_old_date IS NOT DISTINCT FROM v_date)
         AND (v_old_qty IS NOT DISTINCT FROM v_qty) THEN
        CONTINUE;
      END IF;
    END IF;

    IF v_date IS NOT NULL AND COALESCE(v_qty, 0) > 0 THEN
      INSERT INTO public.supplier_replenishment_events (
        source_id, supplier_id, variant_id, slot, promised_date, promised_quantity, observed_at
      ) VALUES (
        NEW.id, NEW.supplier_id, NEW.variant_id,
        v_slot, v_date, v_qty, COALESCE(NEW.updated_at, now())
      )
      ON CONFLICT (source_id, slot, promised_date, promised_quantity, observed_at) DO NOTHING;
    END IF;

  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_capture_supplier_promise() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_capture_supplier_promise ON public.variant_supplier_sources;
CREATE TRIGGER trg_capture_supplier_promise
  AFTER INSERT OR UPDATE ON public.variant_supplier_sources
  FOR EACH ROW EXECUTE FUNCTION public.fn_capture_supplier_promise();

-- ═══════════════════════════════════════════════════════════════════
-- 4. fn_resolve_supplier_arrivals (trigger em stock_snapshots)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_resolve_supplier_arrivals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta         integer;
  v_snapshot_date date;
BEGIN
  -- [C2] usar deltas pré-calculadas
  v_delta := COALESCE(NEW.stock_main_delta, 0) + COALESCE(NEW.stock_other_delta, 0);
  IF v_delta <= 0 THEN RETURN NULL; END IF;

  v_snapshot_date := NEW.captured_at::date;

  -- Idempotência: snapshot já resolveu uma promessa?
  IF EXISTS (
    SELECT 1 FROM public.supplier_replenishment_events
    WHERE arrival_snapshot_id = NEW.id
  ) THEN RETURN NULL; END IF;

  -- Casar com promessa pendente mais próxima
  UPDATE public.supplier_replenishment_events
  SET
    resolution          = 'fulfilled',
    actual_date         = v_snapshot_date,
    actual_quantity     = v_delta,
    resolved_at         = now(),
    arrival_snapshot_id = NEW.id,
    updated_at          = now()
  WHERE id = (
    SELECT id
    FROM public.supplier_replenishment_events
    WHERE source_id  = NEW.variant_supplier_source_id
      AND resolution = 'pending'
      AND ABS(promised_date - v_snapshot_date) <= 15
    ORDER BY
      ABS(promised_date - v_snapshot_date) ASC,
      ABS(COALESCE(promised_quantity, 0) - v_delta) ASC
    LIMIT 1
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_resolve_supplier_arrivals() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_resolve_supplier_arrivals ON public.stock_snapshots;
CREATE TRIGGER trg_resolve_supplier_arrivals
  AFTER INSERT ON public.stock_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.fn_resolve_supplier_arrivals();

-- ═══════════════════════════════════════════════════════════════════
-- 5. fn_expire_pending_promises + pg_cron
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_expire_pending_promises()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_expired integer;
BEGIN
  UPDATE public.supplier_replenishment_events
  SET resolution = 'expired', resolved_at = now(), updated_at = now()
  WHERE resolution = 'pending' AND promised_date < (current_date - 15);
  GET DIAGNOSTICS v_expired = ROW_COUNT;
  RETURN v_expired;
END;
$$;

REVOKE ALL   ON FUNCTION public.fn_expire_pending_promises() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_expire_pending_promises() TO service_role;

DO $$ BEGIN PERFORM cron.unschedule('expire-supplier-promises'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('expire-supplier-promises','0 4 * * *',$$SELECT public.fn_expire_pending_promises();$$);

-- ═══════════════════════════════════════════════════════════════════
-- 7. MATERIALIZED VIEW mv_supplier_reliability
-- ═══════════════════════════════════════════════════════════════════
DROP MATERIALIZED VIEW IF EXISTS public.mv_supplier_reliability;

CREATE MATERIALIZED VIEW public.mv_supplier_reliability AS
WITH events_base AS (
  SELECT
    supplier_id, resolution, promised_date, delay_days, fulfillment_ratio,
    GREATEST(0::numeric, 1.0 - GREATEST(0::numeric, COALESCE(delay_days,0)::numeric) / 14.0) AS pontuality_score,
    LEAST(1.0::numeric, COALESCE(fulfillment_ratio, 0))                                        AS fulfillment_score
  FROM public.supplier_replenishment_events
  WHERE resolution IN ('fulfilled','expired','pending')
),
so AS (
  SELECT
    supplier_id,
    COUNT(*)                                             AS total_promises,
    COUNT(*) FILTER (WHERE resolution='fulfilled')       AS matched_count,
    COUNT(*) FILTER (WHERE resolution='expired')         AS expired_count,
    COUNT(*) FILTER (WHERE resolution='pending')         AS pending_count,
    COALESCE(ROUND(100*(
      0.6*AVG(pontuality_score)  FILTER (WHERE resolution='fulfilled') +
      0.4*AVG(fulfillment_score) FILTER (WHERE resolution='fulfilled')
    ))::integer, 0)                                      AS overall_score,
    ROUND(AVG(pontuality_score)  FILTER (WHERE resolution='fulfilled'),4) AS overall_pontuality,
    ROUND(AVG(fulfillment_score) FILTER (WHERE resolution='fulfilled'),4) AS overall_fulfillment,
    ROUND(AVG(delay_days)        FILTER (WHERE resolution='fulfilled'),1) AS overall_avg_delay_days
  FROM events_base GROUP BY supplier_id
),
s30 AS (
  SELECT supplier_id,
    COUNT(*) FILTER (WHERE resolution='fulfilled') AS matched_30d,
    COALESCE(ROUND(100*(
      0.6*AVG(pontuality_score)  FILTER (WHERE resolution='fulfilled') +
      0.4*AVG(fulfillment_score) FILTER (WHERE resolution='fulfilled')
    ))::integer, 0) AS score_30d
  FROM events_base WHERE promised_date >= (current_date-30) GROUP BY supplier_id
),
s90 AS (
  SELECT supplier_id,
    COUNT(*) FILTER (WHERE resolution='fulfilled') AS matched_90d,
    COALESCE(ROUND(100*(
      0.6*AVG(pontuality_score)  FILTER (WHERE resolution='fulfilled') +
      0.4*AVG(fulfillment_score) FILTER (WHERE resolution='fulfilled')
    ))::integer, 0) AS score_90d
  FROM events_base WHERE promised_date >= (current_date-90) GROUP BY supplier_id
),
np AS (
  SELECT DISTINCT ON (supplier_id)
    supplier_id, promised_date AS next_promise_date, promised_quantity AS next_promise_quantity
  FROM public.supplier_replenishment_events
  WHERE resolution='pending' AND promised_date>=current_date
  ORDER BY supplier_id, promised_date ASC
)
SELECT
  so.supplier_id, s.name AS supplier_name,
  so.total_promises, so.matched_count, so.expired_count, so.pending_count,
  so.overall_score, so.overall_pontuality, so.overall_fulfillment, so.overall_avg_delay_days,
  COALESCE(s30.score_30d,0)   AS score_30d,
  COALESCE(s30.matched_30d,0) AS matched_30d,
  COALESCE(s90.score_90d,0)   AS score_90d,
  COALESCE(s90.matched_90d,0) AS matched_90d,
  np.next_promise_date, np.next_promise_quantity,
  CASE WHEN so.matched_count=0 THEN 'unknown'
       WHEN so.overall_score>=85 THEN 'high'
       WHEN so.overall_score>=60 THEN 'medium'
       ELSE 'low' END AS band,
  now() AS refreshed_at
FROM so
JOIN public.suppliers s ON s.id=so.supplier_id
LEFT JOIN s30 ON s30.supplier_id=so.supplier_id
LEFT JOIN s90 ON s90.supplier_id=so.supplier_id
LEFT JOIN np  ON np.supplier_id =so.supplier_id;

CREATE UNIQUE INDEX ON public.mv_supplier_reliability (supplier_id);

GRANT SELECT ON public.mv_supplier_reliability TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════
-- 8. REFRESH AGENDADO A CADA 15 MIN
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN PERFORM cron.unschedule('refresh-mv-supplier-reliability'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('refresh-mv-supplier-reliability','*/15 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_supplier_reliability;$$);

-- ═══════════════════════════════════════════════════════════════════
-- 9. RPC get_supplier_reliability_history
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_supplier_reliability_history(
  _supplier_id uuid,
  _limit       int DEFAULT 200
)
RETURNS TABLE (
  id uuid, source_id uuid, variant_id uuid, slot smallint,
  promised_date date, promised_quantity integer,
  resolution text, actual_date date, actual_quantity integer,
  delay_days integer, fulfillment_ratio numeric,
  resolved_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, source_id, variant_id, slot,
    promised_date, promised_quantity, resolution,
    actual_date, actual_quantity, delay_days, fulfillment_ratio,
    resolved_at, created_at
  FROM public.supplier_replenishment_events
  WHERE supplier_id = _supplier_id
    AND resolution IN ('fulfilled','expired')
    AND promised_date >= (current_date - 365)
  ORDER BY promised_date DESC
  LIMIT _limit;
$$;

REVOKE EXECUTE ON FUNCTION public.get_supplier_reliability_history(uuid,int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_supplier_reliability_history(uuid,int) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
;
