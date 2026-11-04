-- Reversão do PR #512 (solicitada pelo dono): remove as 3 funções de catálogo
-- enriquecido. O código (products.ts) já voltou ao caminho legacy (bridge),
-- que NÃO chama estas funções — logo o DROP não afeta nenhum caminho ativo.
DROP FUNCTION IF EXISTS public.fn_products_enriched(integer,integer,text,uuid,uuid,boolean,text,text,boolean);
DROP FUNCTION IF EXISTS public.fn_product_colors_enriched(uuid);
DROP FUNCTION IF EXISTS public.fn_product_images_enriched(uuid);
