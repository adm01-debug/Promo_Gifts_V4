
-- ============================================================
--  BUG FIX 3: SECURITY DEFINER + search_path correto em
--  fn_sm_site_collect, fn_sm_site_promote e fn_sm_site_tick
--  Sem isso, chamadas fora do contexto cron (ex.: Edge Function,
--  authenticated role) falham por falta de acesso a net.*, vault.*
-- ============================================================

-- ── fn_sm_site_tick (orquestrador) ──────────────────────────
CREATE OR REPLACE FUNCTION public.fn_sm_site_tick(
    p_enqueue   integer DEFAULT 5,
    p_collect   integer DEFAULT 20,
    p_stale_days integer DEFAULT 7,
    p_with_auth  boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault, extensions
AS $$
DECLARE
  v_enq  int;
  v_coll jsonb;
  v_prom jsonb;
BEGIN
  -- Ordem: collect primeiro (limpa responses pendentes) → enqueue → promote
  v_coll := public.fn_sm_site_collect(p_collect);
  v_enq  := public.fn_sm_site_enqueue(p_enqueue, p_stale_days, NULL, p_with_auth);
  v_prom := public.fn_sm_site_promote(50);
  RETURN jsonb_build_object(
    'collect',  v_coll,
    'enqueued', v_enq,
    'promote',  v_prom,
    'ts',       now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sm_site_tick(integer,integer,integer,boolean)
    FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sm_site_tick(integer,integer,integer,boolean)
    TO service_role;

COMMENT ON FUNCTION public.fn_sm_site_tick IS
    'Orquestrador SM Jina Pipeline. Chama collect → enqueue → promote. '
    'FIX v2: SECURITY DEFINER + search_path correto.';
;
