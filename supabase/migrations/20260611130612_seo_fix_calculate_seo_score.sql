
-- ============================================================
-- ETAPA 2: Corrigir calculate_seo_score
-- Fix: product_specifications agora existe (criada na etapa 1)
-- Fix: melhorar critérios de score para 7.521 produtos reais
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_seo_score(p_product_id UUID)
RETURNS TABLE(score INTEGER, issues JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product     RECORD;
  v_score       INTEGER := 0;
  v_issues      JSONB   := '[]'::jsonb;
  v_image_count INTEGER;
  v_faq_count   INTEGER;
  v_spec_count  INTEGER;
  v_alt_count   INTEGER;
BEGIN
  -- Buscar produto
  SELECT * INTO v_product FROM products WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, '["Produto não encontrado"]'::jsonb;
    RETURN;
  END IF;

  -- === CRITÉRIO 1: NOME (10 pts) ===
  IF v_product.name IS NOT NULL AND LENGTH(TRIM(v_product.name)) >= 10 THEN
    v_score := v_score + 10;
  ELSE
    v_issues := v_issues || '["Nome muito curto (mínimo 10 caracteres)"]'::jsonb;
  END IF;

  -- === CRITÉRIO 2: SLUG (10 pts) ===
  IF v_product.slug IS NOT NULL AND LENGTH(TRIM(v_product.slug)) >= 5 THEN
    v_score := v_score + 10;
  ELSE
    v_issues := v_issues || '["Slug não definido ou muito curto"]'::jsonb;
  END IF;

  -- === CRITÉRIO 3: META TITLE (15 pts) ===
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

  -- === CRITÉRIO 4: META DESCRIPTION (15 pts) ===
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

  -- === CRITÉRIO 5: DESCRIPTION (15 pts) ===
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

  -- === CRITÉRIO 6: SHORT DESCRIPTION (5 pts) ===
  IF v_product.short_description IS NOT NULL
     AND LENGTH(TRIM(v_product.short_description)) >= 30 THEN
    v_score := v_score + 5;
  ELSE
    v_issues := v_issues || '["Descrição curta não definida ou muito breve (ideal 30+ chars)"]'::jsonb;
  END IF;

  -- === CRITÉRIO 7: AI SUMMARY — GEO/LLM SEO (5 pts) ===
  IF v_product.ai_summary IS NOT NULL AND LENGTH(TRIM(v_product.ai_summary)) >= 100 THEN
    v_score := v_score + 5;
  END IF;

  -- === CRITÉRIO 8: IMAGENS (15 pts) ===
  SELECT COUNT(*) INTO v_image_count
  FROM product_images
  WHERE product_id = p_product_id AND is_active = true;

  IF v_image_count >= 5 THEN
    v_score := v_score + 15;
  ELSIF v_image_count >= 3 THEN
    v_score := v_score + 10;
    v_issues := v_issues || '["Adicionar mais imagens (ideal 5+)"]'::jsonb;
  ELSIF v_image_count >= 1 THEN
    v_score := v_score + 5;
    v_issues := v_issues || '["Poucas imagens (ideal 5+)"]'::jsonb;
  ELSE
    v_issues := v_issues || '["Sem imagens cadastradas"]'::jsonb;
  END IF;

  -- === CRITÉRIO 9: ALT TEXT NAS IMAGENS (3 pts bônus) ===
  IF v_image_count > 0 THEN
    SELECT COUNT(*) INTO v_alt_count
    FROM product_images
    WHERE product_id = p_product_id AND is_active = true AND alt_text IS NOT NULL;
    IF v_alt_count = v_image_count THEN
      v_score := v_score + 3;
    END IF;
  END IF;

  -- === CRITÉRIO 10: FAQs (5 pts) ===
  SELECT COUNT(*) INTO v_faq_count
  FROM product_faqs
  WHERE product_id = p_product_id AND is_active = true;

  IF v_faq_count >= 3 THEN
    v_score := v_score + 5;
  ELSIF v_faq_count >= 1 THEN
    v_score := v_score + 3;
  END IF;

  -- === CRITÉRIO 11: ESPECIFICAÇÕES TÉCNICAS (5 pts) ===
  SELECT COUNT(*) INTO v_spec_count
  FROM product_specifications
  WHERE product_id = p_product_id AND is_active = true;

  IF v_spec_count >= 5 THEN
    v_score := v_score + 5;
  ELSIF v_spec_count >= 1 THEN
    v_score := v_score + 3;
  END IF;

  -- === CRITÉRIO 12: SCHEMA JSON (2 pts bônus) ===
  IF v_product.schema_json IS NOT NULL THEN
    v_score := v_score + 2;
  END IF;

  -- Garantir limites 0-100
  v_score := LEAST(GREATEST(v_score, 0), 100);

  RETURN QUERY SELECT v_score, v_issues;
END;
$$;

COMMENT ON FUNCTION public.calculate_seo_score(UUID) IS
    'Calcula score SEO 0-100 de um produto. Critérios: nome, slug, meta_title, meta_description, description, short_description, ai_summary, imagens, alt_text, FAQs, specs, schema_json';
;
