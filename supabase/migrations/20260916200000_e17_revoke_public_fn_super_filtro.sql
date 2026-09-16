-- E17 — Revisar as 11 SECDEF executáveis por anon: achado acionável #1
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (linhas 439-447)
--
-- Achado: das 11 funções SECURITY DEFINER executáveis por anon, 10 já têm o
-- EXECUTE de PUBLIC revogado (só anon/authenticated/service_role/postgres
-- aparecem no ACL). public.fn_super_filtro é a única exceção — seu ACL ao
-- vivo (pg_proc.proacl, lido em 2026-09-16) tem uma entrada "=X/postgres"
-- (sem nome de role antes do "="), que é a notação de GRANT ao pseudo-papel
-- PUBLIC. Isso significa que, além de anon/authenticated (que já têm GRANT
-- nomeado e continuam precisando dele — é o motor do superfiltro público do
-- catálogo), QUALQUER role futura criada neste banco também teria EXECUTE
-- nesta função por padrão, sem revisão consciente.
--
-- Não é uma regressão de dado exposto hoje (anon/authenticated já cobrem os
-- únicos consumidores reais — a UI web não autenticada e a autenticada).
-- É higiene de superfície: alinhar fn_super_filtro ao mesmo padrão que as
-- irmãs fn_super_filtro_facets e fn_super_filtro_price_range já têm (ambas
-- confirmadas sem grant a PUBLIC no mesmo levantamento).
--
-- Efeito esperado: nenhuma mudança de comportamento para anon/authenticated/
-- service_role (mantêm GRANT nomeado explícito). Qualquer role nova criada
-- depois desta migration NÃO herda mais EXECUTE automático nesta função.
--
-- Ver docs/E17_SECDEF_ANON_2026-09-16.md para as 11 decisões completas.

DO $precondition$
BEGIN
  IF to_regprocedure(
    'public.fn_super_filtro(text, text, uuid, text[], boolean, numeric, numeric, text[], boolean, boolean, boolean, boolean, text[], text[], text[], text[], boolean, integer, integer, text)'
  ) IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.fn_super_filtro com a assinatura esperada não existe';
  END IF;

  IF NOT has_function_privilege('anon', 'public.fn_super_filtro(text, text, uuid, text[], boolean, numeric, numeric, text[], boolean, boolean, boolean, boolean, text[], text[], text[], text[], boolean, integer, integer, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: anon já não tem EXECUTE em fn_super_filtro — investigar antes de prosseguir (allowlist pressupõe que o grant nomeado a anon existe e deve ser mantido)';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.fn_super_filtro(text, text, uuid, text[], boolean, numeric, numeric, text[], boolean, boolean, boolean, boolean, text[], text[], text[], text[], boolean, integer, integer, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: authenticated já não tem EXECUTE em fn_super_filtro — investigar antes de prosseguir';
  END IF;
END;
$precondition$;

REVOKE EXECUTE ON FUNCTION public.fn_super_filtro(
  text, text, uuid, text[], boolean, numeric, numeric, text[], boolean, boolean,
  boolean, boolean, text[], text[], text[], text[], boolean, integer, integer, text
) FROM PUBLIC;

DO $postcondition$
DECLARE
  v_sig text := 'public.fn_super_filtro(text, text, uuid, text[], boolean, numeric, numeric, text[], boolean, boolean, boolean, boolean, text[], text[], text[], text[], boolean, integer, integer, text)';
BEGIN
  IF has_function_privilege('public', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: PUBLIC ainda tem EXECUTE em fn_super_filtro — revoke não teve efeito';
  END IF;

  IF NOT has_function_privilege('anon', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: anon perdeu EXECUTE em fn_super_filtro — efeito colateral inesperado, o catálogo público quebraria';
  END IF;

  IF NOT has_function_privilege('authenticated', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: authenticated perdeu EXECUTE em fn_super_filtro — efeito colateral inesperado';
  END IF;

  IF NOT has_function_privilege('service_role', v_sig, 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: service_role perdeu EXECUTE em fn_super_filtro — efeito colateral inesperado';
  END IF;
END;
$postcondition$;
