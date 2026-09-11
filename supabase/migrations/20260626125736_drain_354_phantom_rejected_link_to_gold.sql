-- Melhoria 3/4 — Drenar 354 rejeições-fantasma no Silver.
-- Diagnóstico: rejeitados por LÓGICA ANTIGA (pré-2026-06-11); todos têm nome,
-- 0 validation_errors, e TODOS já existem no Gold (1:1 por supplier_id+ref) via
-- pipeline site/XBZ. Sob a lógica atual não seriam rejeitados.
-- Ação: reconciliar com a realidade — linkar ao produto Gold existente e marcar
-- 'promoted'. ZERO escrita no Gold (apenas Silver). Dry-run: 354/354 ok, 0 reversão.
-- fix_version=2026-06-26_drain_phantom_rejected
UPDATE public.produtos_padronizacao pp
   SET status            = 'promoted',
       product_id        = g.id,
       validation_errors = NULL
  FROM public.products g
 WHERE g.supplier_id       = pp.supplier_id
   AND g.supplier_reference = pp.supplier_reference
   AND pp.status           = 'rejected';

ANALYZE public.produtos_padronizacao;;
