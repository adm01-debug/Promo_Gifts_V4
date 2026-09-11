
-- ============================================================
-- MIGRATION: fix_discount_approval_requests_anon_security_and_index
-- Autor: Claude (2026-06-23)
-- Razão: BUG-DAR-SECURITY-001 + BUG-DAR-PERF-001
--
-- PROBLEMA 1 (Segurança):
--   'anon' tinha SELECT grant em discount_approval_requests.
--   Com RLS ativo e sem política SELECT para 'anon', o resultado
--   é 0 rows (não vaza dados), mas o grant sinaliza ao PostgREST
--   que o schema existe → confusão e possível vetor de enumeração.
--   Remoção é semanticamente correta: nunca deve ser anon.
--
-- PROBLEMA 2 (Performance):
--   Badge faz HEAD ?select=*&status=eq.pending a cada 60s.
--   Tabela não tem índice em 'status' → seq_scan a cada poll.
--   Com tabela pequena (< 1000 linhas) o impacto é mínimo MAS
--   a ausência do índice vai aumentar conforme a tabela crescer.
-- ============================================================

-- 1. Remover grant SELECT do role anon (segurança)
REVOKE SELECT ON public.discount_approval_requests FROM anon;

-- 2. Índice parcial para a query do badge (status='pending')
--    Nota: idx em coluna low-cardinality normalmente não vale a pena,
--    MAS aqui é um partial index que só indexa pending → muito seletivo.
CREATE INDEX IF NOT EXISTS idx_dar_status_pending
  ON public.discount_approval_requests (status)
  WHERE status = 'pending';

-- 3. Índice para lookup por quote_id (usado em requestApproval dedup guard)
CREATE INDEX IF NOT EXISTS idx_dar_quote_id_status
  ON public.discount_approval_requests (quote_id, status)
  WHERE status = 'pending';

-- 4. Notificar PostgREST para recarregar o schema após revoke
NOTIFY pgrst, 'reload schema';
;
