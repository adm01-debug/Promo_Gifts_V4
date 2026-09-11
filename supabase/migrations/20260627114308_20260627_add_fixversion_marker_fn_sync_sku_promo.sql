-- Migration: adiciona fix_version + comentário anti-regressão ao corpo de fn_sync_sku_promo
-- Motivo: convenção do projeto exige marcador visível via pg_get_functiondef para detecção
-- de regressão pelo Lovable bot. Sem mudança de comportamento — só adiciona comentários.
-- Lógica funcional (NEW.sku_promo := NEW.sku) permanece idêntica.
CREATE OR REPLACE FUNCTION public.fn_sync_sku_promo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
-- fix_version: fn_sync_sku_promo_v1 (2026-06-27)
-- ANTI-REGRESSÃO (Lovable bot): manter SECURITY DEFINER + SET search_path=public.
-- Trigger BEFORE INSERT OR UPDATE em products.
-- Invariante: sku_promo = sku SEMPRE (reforçado por CHECK chk_products_sku_promo_equals_sku).
-- NÃO converter para GENERATED ALWAYS: bloquearia pipelines que setam sku_promo explicitamente.
BEGIN
  -- sku_promo é sempre igual ao sku (descoberto 2026-06-23, CHECK adicionado)
  -- Este trigger garante consistência automática sem precisar de GENERATED ALWAYS
  -- (GENERATED bloquearia pipelines de importação que tentam definir sku_promo)
  NEW.sku_promo := NEW.sku;
  RETURN NEW;
END;
$function$;;
