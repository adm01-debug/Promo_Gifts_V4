-- E18 — 4 achados secundários isolados durante a revisão das 94 SECDEF
-- executáveis por authenticated: grants a authenticated sem necessidade,
-- cada um com um gap de autorização real no corpo da função (não é higiene
-- cosmética — sem o REVOKE, qualquer usuário autenticado pode hoje disparar
-- o efeito descrito).
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E18)
-- Ver docs/E18_ACHADOS_SECUNDARIOS_AUTHENTICATED_2026-09-17.md para a
-- investigação completa dos 4 achados.
--
-- 1) public.confirm_notifications_dispatched(p_ids uuid[])
--    UPDATE workspace_notifications SET is_read=true WHERE id = ANY(p_ids)
--    — sem nenhuma checagem de auth.uid()/ownership. Qualquer authenticated
--    pode marcar como lida a notificação de QUALQUER outro usuário (IDOR).
--    Consumidor legítimo real: supabase/functions/process-queue/index.ts,
--    que usa SUPABASE_SERVICE_ROLE_KEY — e service_role já tem EXECUTE
--    próprio no ACL (independente de authenticated). REVOKE de
--    authenticated não afeta esse consumidor.
--
-- 2) public.registrar_entrada_estoque(...) e
-- 3) public.registrar_saida_estoque(...)
--    Ambas escrevem em product_variants.stock_quantity e archive.stock_movements
--    sem nenhuma checagem de auth.uid()/role — p_user_id é um parâmetro
--    livre informado pelo chamador e gravado como created_by, então além de
--    poder alterar estoque de qualquer variante, o chamador pode forjar a
--    autoria do movimento no log de auditoria. grep em src/ e
--    supabase/functions/ (2026-09-17) não encontrou NENHUM call-site real
--    para nenhuma das duas — só o stub de tipo gerado em types.ts. Revogar
--    authenticated não quebra nenhum consumidor conhecido.
--
-- 4) public.fn_notify_user(_target_user_id uuid, _title text, _message text,
--    _type text, _category text, _action_url text, _metadata jsonb)
--    INSERT INTO workspace_notifications — exige auth.uid() (RAISE EXCEPTION
--    se nulo) mas não checa NENHUMA relação entre o chamador e
--    _target_user_id. Qualquer authenticated pode inserir uma notificação
--    com título/mensagem/action_url arbitrários na caixa de QUALQUER outro
--    usuário (vetor de spam/phishing dentro do app). grep em src/ e
--    supabase/functions/ (2026-09-17) não encontrou NENHUM call-site real —
--    só o stub de tipo gerado em types.ts.
--
-- [REQUER-PO] — não aplicado nesta revisão. Caminho de aplicação: E15
-- (.github/workflows/db-apply-migration.yml), nunca supabase db push.

DO $precondition$
BEGIN
  IF to_regprocedure('public.confirm_notifications_dispatched(uuid[])') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.confirm_notifications_dispatched(uuid[]) não existe';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.confirm_notifications_dispatched(uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: authenticated já não tem EXECUTE em confirm_notifications_dispatched — investigar antes de prosseguir';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.confirm_notifications_dispatched(uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: service_role já não tem EXECUTE em confirm_notifications_dispatched — process-queue quebraria, abortar';
  END IF;

  IF to_regprocedure('public.registrar_entrada_estoque(character varying, integer, numeric, character varying, character varying, text, uuid)') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.registrar_entrada_estoque com a assinatura esperada não existe';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.registrar_entrada_estoque(character varying, integer, numeric, character varying, character varying, text, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: authenticated já não tem EXECUTE em registrar_entrada_estoque — investigar antes de prosseguir';
  END IF;

  IF to_regprocedure('public.registrar_saida_estoque(character varying, integer, character varying, character varying, text, uuid, boolean)') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.registrar_saida_estoque com a assinatura esperada não existe';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.registrar_saida_estoque(character varying, integer, character varying, character varying, text, uuid, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: authenticated já não tem EXECUTE em registrar_saida_estoque — investigar antes de prosseguir';
  END IF;

  IF to_regprocedure('public.fn_notify_user(uuid, text, text, text, text, text, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.fn_notify_user com a assinatura esperada não existe';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.fn_notify_user(uuid, text, text, text, text, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: authenticated já não tem EXECUTE em fn_notify_user — investigar antes de prosseguir';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.fn_notify_user(uuid, text, text, text, text, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Precondição falhou: service_role já não tem EXECUTE em fn_notify_user — investigar antes de prosseguir';
  END IF;
END;
$precondition$;

REVOKE EXECUTE ON FUNCTION public.confirm_notifications_dispatched(uuid[]) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.registrar_entrada_estoque(
  character varying, integer, numeric, character varying, character varying, text, uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.registrar_saida_estoque(
  character varying, integer, character varying, character varying, text, uuid, boolean
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_notify_user(
  uuid, text, text, text, text, text, jsonb
) FROM authenticated;

DO $postcondition$
BEGIN
  IF has_function_privilege('authenticated', 'public.confirm_notifications_dispatched(uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: authenticated ainda tem EXECUTE em confirm_notifications_dispatched';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.confirm_notifications_dispatched(uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: service_role perdeu EXECUTE em confirm_notifications_dispatched — process-queue quebraria';
  END IF;

  IF has_function_privilege('authenticated', 'public.registrar_entrada_estoque(character varying, integer, numeric, character varying, character varying, text, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: authenticated ainda tem EXECUTE em registrar_entrada_estoque';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.registrar_entrada_estoque(character varying, integer, numeric, character varying, character varying, text, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: service_role perdeu EXECUTE em registrar_entrada_estoque — efeito colateral inesperado';
  END IF;

  IF has_function_privilege('authenticated', 'public.registrar_saida_estoque(character varying, integer, character varying, character varying, text, uuid, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: authenticated ainda tem EXECUTE em registrar_saida_estoque';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.registrar_saida_estoque(character varying, integer, character varying, character varying, text, uuid, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: service_role perdeu EXECUTE em registrar_saida_estoque — efeito colateral inesperado';
  END IF;

  IF has_function_privilege('authenticated', 'public.fn_notify_user(uuid, text, text, text, text, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: authenticated ainda tem EXECUTE em fn_notify_user';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.fn_notify_user(uuid, text, text, text, text, text, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Pós-condição falhou: service_role perdeu EXECUTE em fn_notify_user — efeito colateral inesperado';
  END IF;
END;
$postcondition$;
