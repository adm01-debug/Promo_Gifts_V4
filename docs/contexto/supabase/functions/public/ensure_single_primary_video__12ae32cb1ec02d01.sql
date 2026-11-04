CREATE OR REPLACE FUNCTION public.ensure_single_primary_video()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE product_videos
        SET is_primary = false
        WHERE product_id = NEW.product_id
          AND id != NEW.id
          AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$function$
