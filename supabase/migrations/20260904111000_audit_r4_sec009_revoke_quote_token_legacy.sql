-- Auditoria R4 — SEC-009 completar (coderabbitai #1829)
-- Aplicado em produção (doufsxqlfjyuvxuezpln) em 2026-09-04
--
-- CodeRabbit finding: get_quote_token_by_value continuava acessível a anon
-- com SELECT * — exposição de PII (client_email, signer_document, etc.) via RPC.
--
-- Pré-condição: nenhum arquivo .ts/.tsx em src/ chama get_quote_token_by_value
-- (verificado via grep — único match é types.ts auto-gerado).
-- Callers anon devem usar get_quote_token_public (criada em 20260904102000).
--
-- Fix: revogar EXECUTE de get_quote_token_by_value para anon.

REVOKE EXECUTE ON FUNCTION public.get_quote_token_by_value(text) FROM anon;

-- Validação: confirmar que anon não tem mais EXECUTE
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_quote_token_by_value(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'SEC-009-revoke: anon ainda tem EXECUTE em get_quote_token_by_value — REVOKE falhou!';
  END IF;

  IF NOT has_function_privilege('anon', 'public.get_quote_token_public(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'SEC-009-revoke: anon não tem EXECUTE em get_quote_token_public — substituto indisponível!';
  END IF;

  RAISE NOTICE '✓ [SEC-009] anon: get_quote_token_by_value revogado, get_quote_token_public disponível.';
END;
$$;
