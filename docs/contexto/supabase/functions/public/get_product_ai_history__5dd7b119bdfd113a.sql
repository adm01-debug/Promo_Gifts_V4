CREATE OR REPLACE FUNCTION public.get_product_ai_history(p_product_id uuid)
 RETURNS TABLE(version integer, ai_title text, ai_description text, model character varying, tokens_used integer, generated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT 
        version,
        ai_title,
        ai_description,
        model,
        total_tokens,
        generated_at
    FROM product_ai_history
    WHERE product_id = p_product_id
    ORDER BY version DESC;
$function$
