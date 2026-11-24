-- 20261124120000_revoke_anon_write_grants_public.sql
-- Hardening: revoga os privilegios de ESCRITA de `anon` nas tabelas de `public` onde o
-- privilegio ja e garantia morta -- RLS ligada e nenhuma policy de escrita aplicavel a
-- `anon` nem a `public` (PUBLIC).
--
-- Por que existe: dois dumps do vivo (`supabase db dump --linked`, 23/11 e 24/11) listam
-- `GRANT ... TO "anon"` de escrita em 221 tabelas de public, enquanto o gate
-- scripts/check-anon-write-grants.mjs mediu 0 em 14/11 -- a consulta dele usava
-- information_schema.role_table_grants, view filtrada por "grantor ou grantee e papel
-- habilitado na sessao", cega para GRANT dado por outro grantor. Com RLS ligada e sem
-- policy de escrita para anon nao ha exploit hoje, so superficie: uma policy mal escrita
-- depois vira escrita anonima real.
--
-- Escopo deliberadamente conservador: SO mexe onde `relrowsecurity` esta ligada (o
-- privilegio e inalcancavel por RLS) -- zero mudanca de comportamento observavel. Tabela
-- com RLS desligada e escrita para anon seria exploit, nao privilegio morto, e se
-- resolve ligando RLS, nao revogando aqui.
--
-- Idempotente e sem lista hardcoded: decide tabela por tabela em tempo de aplicacao.
--
-- Rollback: supabase/rollbacks/20261124120000_rollback.sql (restitui os GRANTs exatamente como
-- estavam no baseline de producao de 2026-11-24).

DO $$
DECLARE
  v_table text;
  v_count int := 0;
BEGIN
  FOR v_table IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p', 'f')
       AND c.relrowsecurity
       AND (has_table_privilege('anon', c.oid, 'INSERT')
         OR has_table_privilege('anon', c.oid, 'UPDATE')
         OR has_table_privilege('anon', c.oid, 'DELETE'))
       AND NOT EXISTS (
         SELECT 1
           FROM pg_policies p
          WHERE p.schemaname = n.nspname
            AND p.tablename = c.relname
            AND upper(p.cmd) IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
            AND ('anon'::name = ANY (p.roles) OR 'public'::name = ANY (p.roles))
       )
     ORDER BY c.relname
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM anon',
      v_table
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '[revoke_anon_write_grants_public] % tabela(s) de public endurecida(s)', v_count;
END
$$;

-- Post-check: o predicado acima nao pode mais casar nenhuma linha.
DO $$
DECLARE
  v_left int;
  v_with_policy int;
BEGIN
  SELECT count(*)
    INTO v_left
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind IN ('r', 'p', 'f')
     AND c.relrowsecurity
     AND (has_table_privilege('anon', c.oid, 'INSERT')
       OR has_table_privilege('anon', c.oid, 'UPDATE')
       OR has_table_privilege('anon', c.oid, 'DELETE'))
     AND NOT EXISTS (
       SELECT 1
         FROM pg_policies p
        WHERE p.schemaname = n.nspname
          AND p.tablename = c.relname
          AND upper(p.cmd) IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
          AND ('anon'::name = ANY (p.roles) OR 'public'::name = ANY (p.roles))
     );

  IF v_left > 0 THEN
    RAISE EXCEPTION '[revoke_anon_write_grants_public] % tabela(s) ainda com escrita para anon', v_left;
  END IF;

  SELECT count(*)
    INTO v_with_policy
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind IN ('r', 'p', 'f')
     AND (has_table_privilege('anon', c.oid, 'INSERT')
       OR has_table_privilege('anon', c.oid, 'UPDATE')
       OR has_table_privilege('anon', c.oid, 'DELETE'))
     AND EXISTS (
       SELECT 1
         FROM pg_policies p
        WHERE p.schemaname = n.nspname
          AND p.tablename = c.relname
          AND upper(p.cmd) IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
          AND ('anon'::name = ANY (p.roles) OR 'public'::name = ANY (p.roles))
     );

  RAISE NOTICE '[revoke_anon_write_grants_public] escrita anon mantida por policy em % tabela(s) (telemetria/leitura publica)', v_with_policy;
END
$$;
