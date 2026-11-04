CREATE OR REPLACE FUNCTION public.fn_sync_backfill_queue_on_pi_fill()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
