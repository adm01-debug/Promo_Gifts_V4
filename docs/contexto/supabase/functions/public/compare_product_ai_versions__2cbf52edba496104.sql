CREATE OR REPLACE FUNCTION public.compare_product_ai_versions(p_product_id uuid, p_version_a integer, p_version_b integer)
 RETURNS TABLE(campo character varying, versao_a text, versao_b text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    WITH va AS (
        SELECT ai_title, ai_description, model
        FROM product_ai_history
        WHERE product_id = p_product_id AND version = p_version_a
    ),
    vb AS (
        SELECT ai_title, ai_description, model
        FROM product_ai_history
        WHERE product_id = p_product_id AND version = p_version_b
    )
    SELECT 'ai_title'::VARCHAR, va.ai_title, vb.ai_title FROM va, vb
    UNION ALL
    SELECT 'ai_description'::VARCHAR, va.ai_description, vb.ai_description FROM va, vb
    UNION ALL
    SELECT 'model'::VARCHAR, va.model, vb.model FROM va, vb;
$function$
