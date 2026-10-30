-- Alvo: DDL agnóstica
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
  SELECT string_agg(n.nspname || '.' || p.proname, ', ' ORDER BY 1)
    INTO funcs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE pg_get_functiondef(p.oid) ILIKE '%pqpdolkae%';

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT string_agg('job ' || j.jobid || ' ' || j.jobname || ' :: ' || left(j.command, 300), E'\n' ORDER BY j.jobid)
      INTO crons
      FROM cron.job j
     WHERE j.command ILIKE '%pqpdolkae%';
  ELSE
    crons := '<pg_cron não instalado>';
  END IF;

  SELECT string_agg(name || '=' || setting, ', ' ORDER BY 1)
    INTO gucs
    FROM pg_settings
   WHERE setting ILIKE '%pqpdolkae%';

  RAISE EXCEPTION 'PROBE_E184 | funcs=% | crons=% | gucs=%',
    COALESCE(funcs, '<none>'), COALESCE(crons, '<none>'), COALESCE(gucs, '<none>');
END $$;
