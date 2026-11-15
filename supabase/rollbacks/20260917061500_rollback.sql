-- Rollback: 20260917061500_e18_revoke_authenticated_authz_gaps
--
-- Devolve o EXECUTE de `authenticated` nas 4 funções que a migration revogou.
-- Os comandos abaixo são exatamente os que a própria migration declara no
-- cabeçalho de rollback lógico (linhas 10-13 dela), com as assinaturas completas.
--
-- ATENÇÃO antes de rodar este rollback: ele reabre as 4 brechas descritas na
-- migration, que foram confirmadas em produção por consulta read-only em
-- 2026-11-15 (`has_function_privilege('authenticated', ..., 'EXECUTE')` = true e
-- nenhuma validação de chamador no corpo das 4):
--   * registrar_entrada_estoque / registrar_saida_estoque — qualquer usuário
--     logado altera `product_variants.stock_quantity` de qualquer variante e
--     forja a autoria do movimento em `archive.stock_movements`, porque
--     `p_user_id` é parâmetro livre gravado como `created_by`.
--   * confirm_notifications_dispatched — marca como lida a notificação de
--     qualquer outro usuário (IDOR).
--   * fn_notify_user — insere notificação com título, mensagem e action_url
--     arbitrários na caixa de qualquer outro usuário (spam/phishing no app).
-- Nenhuma das 4 tinha call-site no app em 2026-09-17 (data da migration) nem em
-- 2026-11-15 (grep em `src/`, `supabase/functions/`, `tests/` e `e2e/` só acha o
-- stub de tipo gerado em `src/integrations/supabase/types.ts`). `service_role`
-- conserva EXECUTE próprio no ACL e não é afetado nem pela migration nem por
-- este rollback — o consumidor legítimo de `confirm_notifications_dispatched`
-- (`supabase/functions/process-queue/index.ts`) usa service_role.

GRANT EXECUTE ON FUNCTION public.confirm_notifications_dispatched(uuid[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.registrar_entrada_estoque(
  character varying, integer, numeric, character varying, character varying, text, uuid
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.registrar_saida_estoque(
  character varying, integer, character varying, character varying, text, uuid, boolean
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_notify_user(
  uuid, text, text, text, text, text, jsonb
) TO authenticated;
