
CREATE OR REPLACE FUNCTION public.trigger_limpar_nome_produto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_spot_supplier_id UUID := 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0';
    v_result text;
BEGIN
    IF NEW.supplier_id = v_spot_supplier_id THEN
        -- Etapa 1: limpar chars invisíveis e normalizar espaços (via fn_clean_spot_name)
        v_result := limpar_nome_produto_spot(NEW.name);

        -- ✅ PATCH: aplicar UPPERCASE COMPLETO via fn_normalize_product_name
        -- Anterior: UPPER(LEFT(v_result,1)) || SUBSTR(v_result,2)  → re-capitalizava só 1ª letra
        -- Novo:     fn_normalize_product_name(v_result)             → MAIÚSCULO em tudo
        IF v_result IS NOT NULL AND v_result <> '' THEN
            v_result := public.fn_normalize_product_name(v_result);
        END IF;

        NEW.name := v_result;
    END IF;

    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.trigger_limpar_nome_produto() IS
'BEFORE INSERT/UPDATE em products.
 Para produtos SPOT: limpa chars invisíveis + normaliza espaços (fn_clean_spot_name),
 depois converte para MAIÚSCULO completo via fn_normalize_product_name.
 PATCH 2026-06-09: substituído re-capitalização de 1ª letra por UPPERCASE total.';
;
