
-- FIX ESTRUTURAL: fn_sync_main_category_from_pca agora SEMPRE atualiza
-- Antes: só atualizava quando main_category_id IS NULL (causava divergências)
-- Depois: atualiza SEMPRE que is_primary=true é inserido/alterado
CREATE OR REPLACE FUNCTION public.fn_sync_main_category_from_pca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Atualiza quando is_primary=true É INSERIDO ou MUDADO para true
  -- Remove restrição "AND main_category_id IS NULL" — agora SEMPRE sincroniza
  IF NEW.is_primary = true THEN
    UPDATE products 
    SET main_category_id = NEW.category_id,
        updated_at = now()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.fn_sync_main_category_from_pca() IS 
'Trigger: sincroniza products.main_category_id com PCA is_primary=true. 
Corrigido em 2026-06-12: remove restrição "IS NULL" — agora sempre sobrescreve para manter coerência.';
;
