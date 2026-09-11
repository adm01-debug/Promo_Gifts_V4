-- ============================================================================
-- FIX (gap M3 descoberto em teste): o guard trg_sync_image_type_code disparava só
-- em UPDATE OF image_type_id, então um UPDATE direto da coluna texto `image_type`
-- (sem mexer no id) criava DRIFT (texto != image_types.code do id). Isso afeta a
-- ordenação em fn_sync_product_images_to_products e fn_resync_product_media, que
-- ordenam por image_type (texto).
-- Como image_type_id é NOT NULL + FK (fonte da verdade), o invariante é "texto
-- espelha a FK". Passamos o trigger a disparar também em UPDATE OF image_type,
-- re-derivando o texto a partir do id em qualquer um dos dois caminhos.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_sync_image_type_code ON public.product_images;
CREATE TRIGGER trg_sync_image_type_code
  BEFORE UPDATE OF image_type_id, image_type ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_image_type_code();;
