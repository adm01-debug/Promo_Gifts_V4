CREATE OR REPLACE FUNCTION public.fn_favorite_items_soft_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.favorite_items_trash (
    original_id, list_id, user_id, product_id, variant_id,
    variant_info, note, price_at_save, position, added_at, deleted_at
  ) VALUES (
    OLD.id, OLD.list_id, OLD.user_id, OLD.product_id, OLD.variant_id,
    OLD.variant_info, OLD.note, OLD.price_at_save, OLD.position, OLD.added_at, now()
  )
  ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$function$
