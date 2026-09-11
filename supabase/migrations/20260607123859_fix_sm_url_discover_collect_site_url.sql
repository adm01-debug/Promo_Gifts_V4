
-- ============================================================
--  BUG FIX 1: fn_sm_url_discover_collect
--  Problema: após descobrir site_id via Jina Search, a coluna
--  site_url não era atualizada → fn_sm_site_enqueue nunca
--  enfileirava esses produtos (filtro: m.site_url IS NOT NULL)
--  Fix: calcular e gravar site_url junto com site_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sm_url_discover_collect(p_max integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_sup       uuid := '841cd690-210a-422a-908c-7676828db272';
  rec         record;
  v_body      text;
  v_sc        int;
  v_m         text[];
  v_site_id   int;
  v_slug      text;
  v_site_url  text;
  v_ok        int := 0;
  v_fail      int := 0;
  v_wait      int := 0;
BEGIN
  FOR rec IN
    SELECT id, codigo, slug, search_req_id
    FROM public.sm_site_url_map
    WHERE supplier_id    = v_sup
      AND search_status  = 'pending'
      AND search_req_id  IS NOT NULL
    LIMIT p_max
  LOOP
    SELECT status_code, content
    INTO   v_sc, v_body
    FROM   net._http_response
    WHERE  id = rec.search_req_id;

    IF NOT FOUND THEN
      v_wait := v_wait + 1;
      CONTINUE;
    END IF;

    v_site_id  := NULL;
    v_slug     := NULL;
    v_site_url := NULL;

    IF v_sc = 200 AND length(COALESCE(v_body,'')) > 100 THEN
      -- Extrai URL somarcas.com.br/{site_id}/produto/{slug}
      v_m := regexp_match(v_body,
        'somarcas\.com\.br/([0-9]+)/produto/([a-z0-9][a-z0-9-]+)');
      IF v_m IS NOT NULL THEN
        v_site_id  := v_m[1]::int;
        v_slug     := v_m[2];
        -- ── FIX: calcular site_url completa ──────────────────────────────
        v_site_url := 'https://www.somarcas.com.br/' || v_site_id || '/produto/' || v_slug;
      END IF;
    END IF;

    IF v_site_id IS NOT NULL THEN
      UPDATE public.sm_site_url_map
        SET site_id          = v_site_id,
            slug             = COALESCE(v_slug, slug),
            -- ── FIX: gravar site_url para que fn_sm_site_enqueue possa enfileirar ──
            site_url         = v_site_url,
            source           = 'jina_search',
            confidence       = 'medium',
            search_status    = 'done',
            last_verified_at = now()
      WHERE id = rec.id;
      v_ok := v_ok + 1;
    ELSE
      UPDATE public.sm_site_url_map
        SET search_status = 'failed',
            search_req_id = NULL
      WHERE id = rec.id;
      v_fail := v_fail + 1;
    END IF;

    DELETE FROM net._http_response WHERE id = rec.search_req_id;

  END LOOP;

  RETURN jsonb_build_object('ok',v_ok,'fail',v_fail,'wait',v_wait,'ts',now());
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sm_url_discover_collect(integer)
    FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_sm_url_discover_collect(integer)
    TO service_role;

COMMENT ON FUNCTION public.fn_sm_url_discover_collect IS
    'Coleta resultados de buscas Jina para descoberta de URLs SM. '
    'FIX v2: agora grava site_url completa além do site_id, '
    'permitindo que fn_sm_site_enqueue enfileira os produtos descobertos.';
;
