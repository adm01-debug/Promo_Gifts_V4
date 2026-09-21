-- E18 — Achado crítico isolado durante a revisão das 94 SECDEF executáveis
-- por authenticated: public.mcp_kv_get(p_secret text, p_key text).
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E18)
-- Ver docs/E18_MCP_KV_GET_ACHADO_CRITICO_2026-09-17.md para a investigação completa.
--
-- Achado: mcp_kv_get é SECURITY DEFINER, search_path=public, e seu ACL ao
-- vivo (pg_proc.proacl, lido em 2026-09-17) é
-- "{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}" —
-- ou seja, QUALQUER usuário autenticado do app tem EXECUTE nesta função.
-- O corpo da função não usa auth.uid() nem qualquer checagem por chamador:
-- a única guarda é comparação de string contra um token fixo embutido em
-- pg_proc.prosrc (RAISE EXCEPTION 'forbidden' se p_secret for diferente do
-- literal). pg_proc.prosrc é legível via pg_get_functiondef por qualquer
-- role com USAGE em pg_catalog (padrão), então o "segredo" não é segredo
-- para ninguém com uma sessão authenticated — que é justamente quem tem
-- EXECUTE. Isso permite ler qualquer linha de public.mcp_kv (hoje 1 linha,
-- chave 'higgsfield_creds' — credencial de API de terceiro), que tem RLS
-- deny-all correto na tabela mas é contornado pelo SECURITY DEFINER.
--
-- Comparação com as funções irmãs: mcp_kv_set e mcp_kv_try_lock (mesmo
-- padrão de p_secret, mesmo schema) têm ACL
-- "{postgres=X/postgres,service_role=X/postgres}" — SEM authenticated. Isso
-- confirma que o grant a authenticated em mcp_kv_get é a exceção, não a
-- regra, dentro do próprio trio de funções — consistente com concessão
-- acidental, não decisão deliberada.
--
-- Uso real: grep em src/ e supabase/functions/ (2026-09-17) não encontrou
-- nenhum call-site de mcp_kv_get/mcp_kv_set/mcp_kv_try_lock — só o stub de
-- tipo gerado em src/integrations/supabase/types.ts. Risco de quebrar
-- consumidor legítimo ao revogar: não identificado nenhum.
--
-- Efeito esperado: authenticated perde EXECUTE em mcp_kv_get. service_role
-- (usado por Edge Functions/cron server-side, se algum dia precisar ler
-- este KV) mantém EXECUTE. Nenhuma mudança para mcp_kv_set/mcp_kv_try_lock
-- (já não tinham grant a authenticated).
--
-- [REQUER-PO] — não aplicado nesta revisão. Caminho de aplicação: E15
-- (.github/workflows/db-apply-migration.yml), nunca supabase db push.
--
-- Rollback: GRANT EXECUTE ON FUNCTION public.mcp_kv_get(text, text) TO authenticated;

DO $precondition$
BEGIN
  IF to_regprocedure('public.mcp_kv_get(text, text)') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.mcp_kv_get(text, text) não existe';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.mcp_kv_get(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: authenticated já não tem EXECUTE em mcp_kv_get — achado pode já ter sido corrigido por outra via, investigar antes de prosseguir';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.mcp_kv_get(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: service_role já não tem EXECUTE em mcp_kv_get — investigar antes de prosseguir (não deveria ter mudado)';
  END IF;
END;
$precondition$;

REVOKE EXECUTE ON FUNCTION public.mcp_kv_get(text, text) FROM authenticated;

DO $postcondition$
DECLARE
  v_sig text := 'public.mcp_kv_get(text, text)';
BEGIN
  IF has_function_privilege('authenticated', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: authenticated ainda tem EXECUTE em mcp_kv_get — revoke não teve efeito';
  END IF;

  IF NOT has_function_privilege('service_role', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: service_role perdeu EXECUTE em mcp_kv_get — efeito colateral inesperado';
  END IF;

  IF has_function_privilege('anon', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: anon tem EXECUTE em mcp_kv_get — nunca deveria ter tido, algo mudou fora desta migration';
  END IF;
END;
$postcondition$;
