-- Rollback: 20261119094500_reafirma_revogacoes_anteriores_ao_baseline
--
-- ATENCAO: reverter esta migration REABRE seis buracos de privilegio que a
-- producao fechou entre julho e outubro de 2026 — cinco deles em funcao
-- SECURITY DEFINER, que roda com os poderes do dono. Em concreto, aplicar este
-- rollback devolve:
--   - a visitante ANONIMO: a busca global (fn_global_search);
--   - a qualquer usuario LOGADO: lancar entrada e saida de estoque
--     (registrar_entrada_estoque / registrar_saida_estoque), criar notificacao
--     em nome de outro usuario (fn_notify_user) e marcar como despachada
--     notificacao de workspace alheio (confirm_notifications_dispatched, que faz
--     UPDATE ... WHERE id = ANY(p_ids) sem filtrar por dono).
--
-- Este arquivo existe porque o contrato E063 exige um rollback para toda
-- migration nova, e porque a reversao precisa estar escrita para ser auditavel —
-- nao porque executa-lo seja recomendado. So rode se a revogacao tiver quebrado
-- um fluxo de producao, e nesse caso reverta apenas a linha do fluxo quebrado.
--
-- Nota: em producao a migration e no-op (os privilegios ja estavam ausentes),
-- entao este rollback nao restaura um estado anterior — ele CONCEDE privilegio
-- que a producao nao tem desde 2026. Trate-o como tal.

GRANT EXECUTE ON FUNCTION public.confirm_notifications_dispatched(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_notify_user(uuid, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_entrada_estoque(character varying, integer, numeric, character varying, character varying, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_saida_estoque(character varying, integer, character varying, character varying, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_global_search(text, integer, text[]) TO anon;
GRANT MAINTAIN ON TABLE public.external_connections TO anon;
