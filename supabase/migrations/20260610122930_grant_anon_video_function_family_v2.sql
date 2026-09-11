-- G11: funções da família de vídeo sem GRANT EXECUTE p/ anon (processor do VPS roda como anon).
-- fn_spot_link_video sem grant = próximo download SPOT ok falharia no link.
-- Varredura idempotente: concede a TODAS as funções de vídeo que estejam sem o grant.
DO $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND (p.proname LIKE 'fn_video%'
           OR p.proname LIKE 'fn_spot%video%'
           OR p.proname IN ('fn_spot_vimeo_daily_sync','fn_spot_enqueue_vimeo_eu',
                            'fn_spot_enqueue_new_videos','fn_xbz_link_video',
                            'fn_asia_link_video','fn_sm_link_video'))
      AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', r.sig);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'GRANTs anon aplicados: %', n;
END $$;;
