
-- ═══════════════════════════════════════════════════════════════
-- Trigger: sync image_backfill_queue when workers fill product_images
-- Solução: AFTER UPDATE WHEN (NULL → NOT NULL) para blurhash/content_hash
-- SECURITY DEFINER: bypass RLS da fila (restricted to org owner/admin)
-- clock_timestamp(): wall-clock real, não transaction start
-- FOR EACH ROW: necessário para saber qual product_image_id atualizou
-- Zero loop risk: image_backfill_queue não tem triggers próprios
-- ═══════════════════════════════════════════════════════════════

-- 1. Função SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.fn_sync_backfill_queue_on_pi_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cenário A: blurhash preenchido (NULL → valor)
  -- Marca item correspondente na fila como 'done'
  IF OLD.blurhash IS NULL AND NEW.blurhash IS NOT NULL THEN
    UPDATE public.image_backfill_queue
    SET
      status      = 'done',
      finished_at = clock_timestamp(),
      worker_id   = 'trigger-sync'
    WHERE product_image_id = NEW.id
      AND task              = 'blurhash'
      AND status            = 'pending';
  END IF;

  -- Cenário B: content_hash preenchido (NULL → valor)
  IF OLD.content_hash IS NULL AND NEW.content_hash IS NOT NULL THEN
    UPDATE public.image_backfill_queue
    SET
      status      = 'done',
      finished_at = clock_timestamp(),
      worker_id   = 'trigger-sync'
    WHERE product_image_id = NEW.id
      AND task              = 'content_hash'
      AND status            = 'pending';
  END IF;

  -- Trigger AFTER: retornar NEW não afeta a row (já commitada)
  -- mas é required pela assinatura RETURNS trigger
  RETURN NEW;
END;
$$;

-- Comentário auto-documentado
COMMENT ON FUNCTION public.fn_sync_backfill_queue_on_pi_fill() IS
'Fired by trg_sync_backfill_queue AFTER UPDATE on product_images.
 Marks image_backfill_queue items as done when workers fill blurhash
 or content_hash directly in product_images (bypassing the queue).
 SECURITY DEFINER needed to bypass RLS on image_backfill_queue.
 Created 2026-06-18 — architectural debt fix for worker sync gap.';

-- 2. Remover se já existir (idempotente)
DROP TRIGGER IF EXISTS trg_sync_backfill_queue
  ON public.product_images;

-- 3. Criar trigger com WHEN clause cirúrgica
-- Só dispara quando NULL → NOT NULL (transição real de preenchimento)
-- Zero overhead para updates que não mudam blurhash/content_hash
CREATE TRIGGER trg_sync_backfill_queue
AFTER UPDATE ON public.product_images
FOR EACH ROW
WHEN (
  (OLD.blurhash     IS NULL AND NEW.blurhash     IS NOT NULL)
  OR
  (OLD.content_hash IS NULL AND NEW.content_hash IS NOT NULL)
)
EXECUTE FUNCTION public.fn_sync_backfill_queue_on_pi_fill();

COMMENT ON TRIGGER trg_sync_backfill_queue ON public.product_images IS
'Keeps image_backfill_queue in sync with workers that write directly
 to product_images without going through the queue dispatch pattern.
 Fires only on NULL→value transitions of blurhash or content_hash.
 Created 2026-06-18.';
;
