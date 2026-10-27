-- Probe read-only (rodada-5 / E184): o F6 de #2228 removeu o project-ref
-- legado das migrations versionadas, mas não propaga para o que já rodou.
-- Este draft varre o catálogo vivo em busca de 'pqpdolkae' restante em:
--   (a) definições de funções (pg_get_functiondef — cobre _project_url /
--       v_supabase_url e qualquer hardcode),
--   (b) jobs do pg_cron (command),
--   (c) GUCs app.* que possam guardar URL de projeto.
-- Cada seção roda num sub-bloco EXCEPTION: uma falha não mata as demais e
-- o SQLSTATE/SQLERRM real sai no relatório.
-- O dry-run executa dentro de BEGIN...ROLLBACK — nada persiste.
-- O resultado sai via EXCEPTION proposital (único canal que o runner do
-- dry-run imprime no log do job); o run "falha" de propósito.
DO $$
DECLARE
  funcs text;
  crons text;
  gucs  text;
  r     record;
  ncnt  int;
BEGIN
  -- seção 0: sanity — quantas funções o usuário do dry-run enxerga
  BEGIN
    SELECT count(*) INTO ncnt FROM pg_proc;
    funcs := 'pg_proc_count=' || ncnt || ' | ';
  EXCEPTION WHEN OTHERS THEN
    funcs := 'COUNT_ERR[' || SQLSTATE || ']: ' || SQLERRM || ' | ';
  END;

  -- seção 1: funções com definição contendo o fragmento legado
  BEGIN
    FOR r IN
      SELECT n.nspname || '.' || p.proname AS f
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE pg_get_functiondef(p.oid) ILIKE '%pqpdolkae%'
    LOOP
      funcs := funcs || r.f || ', ';
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    funcs := funcs || 'FUNCS_ERR[' || SQLSTATE || ']: ' || SQLERRM;
  END;

  -- seção 2: jobs do pg_cron
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
      FOR r IN
        SELECT 'job ' || j.jobid || ' ' || j.jobname || ' :: ' || left(j.command, 300) AS f
          FROM cron.job j
         WHERE j.command ILIKE '%pqpdolkae%'
      LOOP
        crons := COALESCE(crons || E'\n', '') || r.f;
      END LOOP;
    ELSE
      crons := '<pg_cron não instalado>';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    crons := 'CRONS_ERR[' || SQLSTATE || ']: ' || SQLERRM;
  END;

  -- seção 3: GUCs
  BEGIN
    FOR r IN
      SELECT name || '=' || setting AS f
        FROM pg_settings
       WHERE setting ILIKE '%pqpdolkae%'
    LOOP
      gucs := COALESCE(gucs || ', ', '') || r.f;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    gucs := 'GUCS_ERR[' || SQLSTATE || ']: ' || SQLERRM;
  END;

  RAISE EXCEPTION 'PROBE_E184 | funcs=% | crons=% | gucs=%',
    COALESCE(funcs, '<none>'), COALESCE(crons, '<none>'), COALESCE(gucs, '<none>');
END $$;
