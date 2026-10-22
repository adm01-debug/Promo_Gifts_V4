-- ============================================================
-- PROPOSTA P08 — EF-008: Idempotência em send-notification
-- Severidade: ALTO
-- Achado: EF-008
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   Edge function `send-notification` (v306) usa INSERT puro em
--   `workspace_notifications` sem mecanismo de deduplicação.
--   Em retry (falha de rede, reenvio de cron), notificações
--   duplicadas são geradas para o mesmo evento.
--
-- EVIDÊNCIA:
--   Código v306: supabase.from('workspace_notifications')
--     .insert({user_id, title, message, type, ...})
--   Sem idempotency_key, sem ON CONFLICT, sem UNIQUE constraint
--   no par (user_id, idempotency_key).
--
-- SOLUÇÃO: Adicionar coluna idempotency_key e UNIQUE constraint.
--   O caller (cron ou edge function) deve gerar o key como
--   hash determinístico do evento (ex: SHA256(user_id+event_id+timestamp_truncado)).
-- ============================================================

-- === MIGRATION ===
-- NÃO APLICAR DIRETAMENTE — usar workflow db-apply-migration.yml

/*
BEGIN;

-- 1. Adicionar coluna idempotency_key (nullable inicialmente para migração)
ALTER TABLE public.workspace_notifications
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. UNIQUE constraint parcial — só aplica quando key não é null
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  uq_workspace_notifications_idempotency
  ON public.workspace_notifications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Atualizar edge function send-notification para:
--    a) aceitar idempotency_key no body da request
--    b) usar INSERT ... ON CONFLICT (idempotency_key) DO NOTHING
--    Ex (TypeScript):
--      const { error } = await supabase
--        .from('workspace_notifications')
--        .insert({ user_id, title, message, type, idempotency_key })
--        .onConflict('idempotency_key');  // ignorar duplicata silenciosamente
--    Nota: Supabase JS v2 usa .upsert({...}, { onConflict: 'idempotency_key', ignoreDuplicates: true })

COMMIT;
*/

-- === ROLLBACK ===
/*
BEGIN;
DROP INDEX CONCURRENTLY IF EXISTS uq_workspace_notifications_idempotency;
ALTER TABLE public.workspace_notifications DROP COLUMN IF EXISTS idempotency_key;
COMMIT;
*/

-- === PRÉ-REQUISITOS ===
-- 1. Atualizar código da edge function ANTES de aplicar migration
--    (evitar quebra em versões antigas da função que não passam o key)
-- 2. Caller (cron ou edge) deve gerar key determinístico:
--    key = encode(digest(user_id || ':' || event_id || ':' || date_trunc('hour', now()), 'sha256'), 'hex')
-- 3. Janela de dedup: depende do truncamento do timestamp — 1 hora é razoável para notificações
--
-- === RISCO DE REGRESSÃO ===
-- BAIXO — column nullable, constraint parcial; INSERT sem key continua funcionando
-- (mas sem proteção de dedup, o que é o estado atual)
