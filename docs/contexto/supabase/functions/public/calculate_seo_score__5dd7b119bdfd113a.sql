CREATE OR REPLACE FUNCTION public.calculate_seo_score(p_product_id uuid)
 RETURNS TABLE(score integer, issues jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product     RECORD;
  v_score       INTEGER := 0;
  v_issues      JSONB   := '[]'::jsonb;
  v_image_count INTEGER;
  v_faq_count   INTEGER;
  v_spec_count  INTEGER;
  v_alt_count   INTEGER;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, '["Produto não encontrado"]'::jsonb;
    RETURN;
  END IF;

  IF v_product.name IS NOT NULL AND LENGTH(TRIM(v_product.name)) >= 10 THEN
    v_score := v_score + 10;
  ELSE
    v_issues := v_issues || '["Nome muito curto (mínimo 10 caracteres)"]'::jsonb;
  END IF;
  IF v_product.slug IS NOT NULL AND LENGTH(TRIM(v_product.slug)) >= 5 THEN
    v_score := v_score + 10;
  ELSE
    v_issues := v_issues || '["Slug não definido ou muito curto"]'::jsonb;
  END IF;
  IF v_product.meta_title IS NOT NULL AND LENGTH(TRIM(v_product.meta_title)) > 0 THEN
    v_score := v_score + 10;
    IF LENGTH(v_product.meta_title) BETWEEN 30 AND 70 THEN
      v_score := v_score + 5;
    ELSE
      v_issues := v_issues || '["Meta title fora do tamanho ideal (30-70 chars)"]'::jsonb;
    END IF;
  ELSE
    v_issues := v_issues || '["Meta title não definido"]'::jsonb;
  END IF;
  IF v_product.meta_description IS NOT NULL AND LENGTH(TRIM(v_product.meta_description)) > 0 THEN
    v_score := v_score + 10;
    IF LENGTH(v_product.meta_description) BETWEEN 100 AND 170 THEN
      v_score := v_score + 5;
    ELSE
      v_issues := v_issues || '["Meta description fora do tamanho ideal (100-170 chars)"]'::jsonb;
    END IF;
  ELSE
    v_issues := v_issues || '["Meta description não definida"]'::jsonb;
  END IF;
  IF v_product.description IS NOT NULL AND LENGTH(TRIM(v_product.description)) > 0 THEN
    IF LENGTH(v_product.description) >= 300 THEN
      v_score := v_score + 15;
    ELSIF LENGTH(v_product.description) >= 100 THEN
      v_score := v_score + 10;
      v_issues := v_issues || '["Descrição poderia ser mais detalhada (ideal 300+ chars)"]'::jsonb;
    ELSE
      v_score := v_score + 5;
      v_issues := v_issues || '["Descrição muito curta (ideal 300+ chars)"]'::jsonb;
    END IF;
  ELSE
    v_issues := v_issues || '["Descrição não definida"]'::jsonb;
  END IF;
  IF v_product.short_description IS NOT NULL AND LENGTH(TRIM(v_product.short_description)) >= 30 THEN
    v_score := v_score + 5;
  ELSE
    v_issues := v_issues || '["Descrição curta não definida ou muito breve (ideal 30+ chars)"]'::jsonb;
  END IF;
  IF v_product.ai_summary IS NOT NULL AND LENGTH(TRIM(v_product.ai_summary)) >= 100 THEN
    v_score := v_score + 5;
  END IF;

  SELECT COUNT(*) INTO v_image_count FROM product_images WHERE product_id = p_product_id AND is_active = true;
  IF v_image_count >= 5 THEN v_score := v_score + 15;
  ELSIF v_image_count >= 3 THEN v_score := v_score + 10; v_issues := v_issues || '["Adicionar mais imagens (ideal 5+)"]'::jsonb;
  ELSIF v_image_count >= 1 THEN v_score := v_score + 5; v_issues := v_issues || '["Poucas imagens (ideal 5+)"]'::jsonb;
  ELSE v_issues := v_issues || '["Sem imagens cadastradas"]'::jsonb;
  END IF;

  IF v_image_count > 0 THEN
    SELECT COUNT(*) INTO v_alt_count FROM product_images WHERE product_id = p_product_id AND is_active = true AND alt_text IS NOT NULL;
    IF v_alt_count = v_image_count THEN v_score := v_score + 3; END IF;
  END IF;

  SELECT COUNT(*) INTO v_faq_count FROM product_faqs WHERE product_id = p_product_id AND is_active = true;
  IF v_faq_count >= 3 THEN v_score := v_score + 5;
  ELSIF v_faq_count >= 1 THEN v_score := v_score + 3;
  END IF;

  -- product_specifications movida para archive em 2026-06-15 (sempre vazia)
  SELECT COUNT(*) INTO v_spec_count FROM archive.product_specifications WHERE product_id = p_product_id AND is_active = true;
  IF v_spec_count >= 5 THEN v_score := v_score + 5;
  ELSIF v_spec_count >= 1 THEN v_score := v_score + 3;
  END IF;

  IF v_product.schema_json IS NOT NULL THEN v_score := v_score + 2; END IF;

  v_score := LEAST(GREATEST(v_score, 0), 100);
  RETURN QUERY SELECT v_score, v_issues;
END;
$function$
