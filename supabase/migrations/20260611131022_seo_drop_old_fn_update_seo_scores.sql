
-- Remover versão antiga (sem parâmetros) que tem o bug
DROP FUNCTION IF EXISTS public.fn_update_all_seo_scores();

-- Remover versão antiga de fn_populate_all_products_seo sem parâmetros
DROP FUNCTION IF EXISTS public.fn_populate_all_products_seo();
;
