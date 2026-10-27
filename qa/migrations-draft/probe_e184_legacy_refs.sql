-- Probe read-only (rodada-5 / E184): o F6 de #2228 removeu o project-ref
-- legado das migrations versionadas, mas não propaga para o que já rodou.
-- Este draft varre o catálogo vivo em busca de 'pqpdolkae' restante em:
--   (a) definições de funções (pg_get_functiondef — cobre _project_url /
--       v_supabase_url e qualquer hardcode),
--   (b) jobs do pg_cron (command),
--   (c) GUCs app.* que possam guardar URL de projeto.
-- O dry-run executa dentro de BEGIN...ROLLBACK — nada persiste.
-- O resultado sai via EXCEPTION proposital (único canal que o runner do
-- dry-run imprime no log do job); o run "falha" de propósito.
DO $$
DECLARE
  funcs text;
  crons text;
  gucs  text;
BEGIN
  funcs := array_to_string(
    ARRAY(
      SELECT n.nspname || '.' || p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE pg_get_functiondef(p.oid) ILIKE '%pqpdolkae%'
       ORDER BY 1
    ), ', ');

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    crons := array_to_string(
      ARRAY(
        SELECT 'job ' || j.jobid || ' ' || j.jobname || ' :: ' || left(j.command, 300)
          FROM cron.job j
         WHERE j.command ILIKE '%pqpdolkae%'
         ORDER BY j.jobid
      ), E'\n');
  ELSE
    crons := '<pg_cron não instalado>';
  END IF;

  gucs := array_to_string(
    ARRAY(
      SELECT name || '=' || setting
        FROM pg_settings
       WHERE setting ILIKE '%pqpdolkae%'
       ORDER BY 1
    ), ', ');

  RAISE EXCEPTION 'PROBE_E184 | funcs=% | crons=% | gucs=%',
    COALESCE(funcs, '<none>'), COALESCE(crons, '<none>'), COALESCE(gucs, '<none>');
END $$;
