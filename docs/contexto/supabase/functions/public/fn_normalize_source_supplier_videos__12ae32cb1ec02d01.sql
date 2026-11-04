CREATE OR REPLACE FUNCTION public.fn_normalize_source_supplier_videos()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
-- fix_version: normalize_video_supplier_20260627
-- Espelho de fn_normalize_source_supplier de product_images para product_videos.
-- Garante UPPER + nome canônico de todos os suppliers.
-- NUNCA remover ou renomear sem atualizar a listagem de suppliers ativos.
BEGIN
  NEW.source_supplier := CASE UPPER(COALESCE(NEW.source_supplier,''))
    WHEN 'STRICKER'  THEN 'SPOT'
    WHEN 'SPOT'      THEN 'SPOT'
    WHEN 'XBZ'       THEN 'XBZ'
    WHEN 'ASIA'      THEN 'ASIA'
    WHEN 'SOMARCAS'  THEN 'SOMARCAS'
    WHEN '88BRINDES' THEN '88BRINDES'
    WHEN ''          THEN NEW.source_supplier
    ELSE UPPER(NEW.source_supplier)
  END;
  RETURN NEW;
END;
$function$
