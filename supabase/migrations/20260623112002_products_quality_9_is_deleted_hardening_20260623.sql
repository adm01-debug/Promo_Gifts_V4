
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 9: is_deleted hardening
-- Após hard-delete dos 5 XBZ-MANUAL, is_deleted=true = 0 registros.
-- Adicionar COMMENT documentando o padrão + índice parcial mais eficiente.
-- NÃO adicionamos CHECK is_deleted=false pois o trigger de soft-delete
-- usa is_deleted=true para marcar antes do cascade — sem ele, o fluxo quebra.
-- ══════════════════════════════════════════════════════════════════

-- 9A: COMMENT em is_deleted
COMMENT ON COLUMN public.products.is_deleted IS
'Flag de soft-delete. TRUE = produto marcado para exclusão (aguarda cascade ou hard-delete).
Atualmente 0 registros com is_deleted=true (após cleanup 2026-06-23).
Padrão: pipelines de importação usam is_deleted=true para staging de remoção.
v_products_public filtra WHERE is_deleted IS NOT TRUE (seguro para NULL).
NÃO adicionar CHECK is_deleted=false — trigger usa true para marcar antes de cascade.';

-- 9B: COMMENT em deleted_at
COMMENT ON COLUMN public.products.deleted_at IS
'Timestamp do soft-delete (preenchido junto com is_deleted=true).
Atualmente 0 registros com deleted_at preenchido (após cleanup 2026-06-23).
Par com is_deleted — nunca preenchido sem is_deleted=true.';

-- 9C: Verificar e criar índice para o padrão WHERE is_deleted IS NOT TRUE
-- (usado em v_products_public e em queries de catálogo)
CREATE INDEX IF NOT EXISTS idx_products_active_not_deleted
  ON public.products(id)
  WHERE is_active = true AND is_deleted IS NOT TRUE;

COMMENT ON INDEX public.idx_products_active_not_deleted IS
'Índice parcial para o padrão WHERE is_active=true AND is_deleted IS NOT TRUE. Criado 2026-06-23.';
;
