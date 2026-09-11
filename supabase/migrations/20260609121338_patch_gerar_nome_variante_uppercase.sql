
CREATE OR REPLACE FUNCTION public.gerar_nome_variante()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_nome_produto TEXT;
    v_nome         TEXT;
BEGIN
    -- Se já tem nome preenchido, não sobrescreve
    IF NEW.name IS NOT NULL AND TRIM(NEW.name) != '' THEN
        RETURN NEW;
    END IF;

    -- Buscar nome do produto pai
    SELECT name INTO v_nome_produto FROM products WHERE id = NEW.product_id;

    -- Montar nome com até 3 dimensões
    v_nome := COALESCE(v_nome_produto, '');
    IF NEW.color_name IS NOT NULL AND NEW.color_name != '' THEN
        v_nome := v_nome || ' | ' || NEW.color_name;
    END IF;
    IF NEW.size_code IS NOT NULL AND NEW.size_code != '' THEN
        v_nome := v_nome || ' | ' || NEW.size_code;
    END IF;

    -- Limpar trailing separador se ficou só o produto
    v_nome := btrim(regexp_replace(v_nome, '\s*[|]\s*$', ''));

    -- ✅ PATCH: garantir MAIÚSCULO no nome final da variante
    IF v_nome != '' THEN
        NEW.name := public.fn_normalize_product_name(v_nome);
    END IF;

    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.gerar_nome_variante() IS
'BEFORE INSERT em product_variants.
 Gera name = "{product_name} | {color_name} | {size_code}" (partes existentes).
 PATCH 2026-06-09: aplica fn_normalize_product_name no nome final → MAIÚSCULO.';
;
