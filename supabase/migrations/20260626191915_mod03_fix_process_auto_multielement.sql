CREATE OR REPLACE FUNCTION public.fn_process_product_materials_auto(p_product_id uuid, p_replace_existing boolean DEFAULT false)
 RETURNS TABLE(material_name text, material_type_id uuid, status text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
-- [fix_version: mod03_fix_multielement_2026-06] Corrige bug de array multi-elemento.
-- ANTES: o loop por elemento do jsonb desligava p_replace_existing após a 1ª iteração; aí
-- fn_process_composite_materials abortava nos elementos seguintes (guard "já tem materiais"),
-- criando pm SOMENTE do 1º elemento em arrays multi-elemento (ex.: ["Aço Inox","Alumínio"] => só Aço Inox).
-- AGORA: concatena TODOS os elementos num único string delimitado por ', ' (delimitador reconhecido por
-- fn_split_materials) e chama fn_process_composite_materials UMA vez, distribuindo % entre todos.
-- NÃO reverter para loop-por-elemento (regressão conhecida).
DECLARE
    v_product RECORD;
    v_combined TEXT;
BEGIN
    SELECT id, name, organization_id, materials
    INTO v_product
    FROM products
    WHERE id = p_product_id;

    IF v_product IS NULL THEN
        material_name := 'ERRO'; material_type_id := NULL;
        status := 'Produto não encontrado: ' || p_product_id;
        RETURN NEXT; RETURN;
    END IF;

    IF v_product.materials IS NULL
       OR v_product.materials = '[]'::jsonb
       OR jsonb_array_length(v_product.materials) = 0 THEN
        material_name := 'AVISO'; material_type_id := NULL;
        status := 'Produto "' || v_product.name || '" não tem materials preenchido';
        RETURN NEXT; RETURN;
    END IF;

    SELECT string_agg(elem #>> '{}', ', ')
      INTO v_combined
      FROM jsonb_array_elements(v_product.materials) elem
      WHERE NULLIF(TRIM(elem #>> '{}'), '') IS NOT NULL;

    IF NULLIF(TRIM(COALESCE(v_combined,'')), '') IS NULL THEN
        material_name := 'AVISO'; material_type_id := NULL;
        status := 'Materials vazio após normalização';
        RETURN NEXT; RETURN;
    END IF;

    RETURN QUERY
    SELECT * FROM fn_process_composite_materials(
        p_product_id, v_combined, v_product.organization_id, p_replace_existing
    );
    RETURN;
END;
$function$;;
