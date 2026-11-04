CREATE OR REPLACE FUNCTION public.generate_product_meta_description(p_name text, p_short_description text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_allows_personalization boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_description        TEXT;
  v_base               TEXT;
  v_personalization    TEXT := '';
  v_cta                TEXT := ' Solicite orçamento!';
  v_fallback_suffix    TEXT := ' para brindes corporativos e eventos promocionais.';
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;

  -- === BASE: prioridade short_desc > desc > fallback ===
  IF p_short_description IS NOT NULL
     AND LENGTH(TRIM(strip_html(p_short_description))) >= 20 THEN
    v_base := TRIM(REGEXP_REPLACE(strip_html(p_short_description), '\s+', ' ', 'g'));

  ELSIF p_description IS NOT NULL
        AND LENGTH(TRIM(strip_html(p_description))) >= 20 THEN
    v_base := truncate_text(
                TRIM(REGEXP_REPLACE(strip_html(p_description), '\s+', ' ', 'g')),
                110, ''
              );
  ELSE
    -- Fallback: nome + sufixo padrão (sempre ≥ 50 chars)
    v_base := p_name || v_fallback_suffix;
  END IF;

  -- === GARANTIR BASE MÍNIMA DE 30 CHARS ===
  -- Se strip_html gerou texto muito curto, expande com sufixo
  IF LENGTH(v_base) < 30 THEN
    v_base := v_base || v_fallback_suffix;
  END IF;

  -- === PERSONALIZAÇÃO ===
  IF p_allows_personalization THEN
    v_personalization := ' Personalização disponível.';
  END IF;

  -- === MONTAR ===
  v_description := v_base;

  IF LENGTH(v_description || v_personalization) <= 140 THEN
    v_description := v_description || v_personalization;
  END IF;

  IF LENGTH(v_description || v_cta) <= 165 THEN
    v_description := v_description || v_cta;
  END IF;

  -- === GARANTIR MÍNIMO 50 CHARS (constraint) ===
  -- Se ainda for curto demais, completa com contexto de brindes
  IF LENGTH(v_description) < 50 THEN
    v_description := v_description || ' Brinde corporativo personalizado. Solicite orçamento!';
  END IF;

  -- === GARANTIR MÁXIMO 170 CHARS (constraint) ===
  v_description := LEFT(v_description, 169);

  RETURN v_description;
END;
$function$
