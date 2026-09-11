
-- ============================================================
-- BUG-REALTIME-DAR: discount_approval_requests faltando em supabase_realtime
-- ============================================================
-- DIAGNÓSTICO:
--   frontend (DiscountApprovalHeaderBadge, SidebarReorganized, useDiscountApproval)
--   usa postgres_changes subscriptions em discount_approval_requests.
--   A tabela NÃO estava na publicação supabase_realtime, causando:
--   1. Badge de aprovações não atualizava imediatamente ao criar/aprovar
--   2. useDiscountApproval não recebia eventos em tempo real
--   3. Fallback para polling (30-60s) em vez de < 1s
--
-- IMPACTO: UX degradada para fluxo de aprovação de descontos.
--   Admin criava/aprovava e o badge do vendedor demorava até 60s para atualizar.
--
-- FIX: ALTER PUBLICATION supabase_realtime ADD TABLE public.discount_approval_requests
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.discount_approval_requests;

-- Verificar que foi adicionada
SELECT 
  tablename,
  pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'discount_approval_requests';
;
