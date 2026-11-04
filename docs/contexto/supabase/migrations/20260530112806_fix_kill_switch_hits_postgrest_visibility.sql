-- PostgREST requer SELECT grant para incluir a tabela no schema cache.
-- Sem isso, INSERT via REST retorna 404 "table not found".
-- A policy USING(false) torna a tabela visivel na API mas impede leitura por anon.

GRANT SELECT ON kill_switch_hits TO anon;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'kill_switch_hits_anon_select_deny') THEN
    EXECUTE 'CREATE POLICY kill_switch_hits_anon_select_deny ON kill_switch_hits FOR SELECT TO anon USING (false)';
  END IF;
END $$;

-- Forcar reload do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
