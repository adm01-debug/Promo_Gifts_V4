-- M12b — trigger_limpar_nome_produto v3:
-- Gold é camada de exibição: nome SPOT recebe display-case (sentence-case com
-- preservação de siglas/unidades) em vez de UPPERCASE completo.
-- Silver permanece MAIÚSCULA (contrato de matching/dedup do pipeline).

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
        -- higiene (invisíveis/espaços) + display-case com preservação de siglas
        v_result := public.fn_display_product_name(NEW.name);
        IF v_result IS NOT NULL AND v_result <> '' THEN
            NEW.name := v_result;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;;
