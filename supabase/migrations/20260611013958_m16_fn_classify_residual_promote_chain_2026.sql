-- M16 — Categoria residual por dicionário ILIKE (alta precisão, derivado da análise
-- dos 388 produtos sem categoria) + cadeia completa na promoção:
-- De→Para → classify (melhor confiança) → residual. Sempre fill-only e nunca em campo lockado.

CREATE OR REPLACE FUNCTION public.fn_classify_category_residual(p_name text)
RETURNS uuid
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  n text := lower(COALESCE(p_name,''));
  v_id uuid;
BEGIN
  IF n = '' THEN RETURN NULL; END IF;

  -- chapéus (específico → genérico)
  IF n ~ 'chap[ée]u' THEN
    IF n ~ 'ecoflex' THEN SELECT id INTO v_id FROM categories WHERE slug='chapeu_ecoflex' LIMIT 1;
    ELSIF n ~ 'juta' THEN SELECT id INTO v_id FROM categories WHERE slug='chapeu_juta' LIMIT 1;
    ELSIF n ~ 'palha' THEN SELECT id INTO v_id FROM categories WHERE slug='chapeu_palha' LIMIT 1;
    ELSIF n ~ 'bucket' THEN SELECT id INTO v_id FROM categories WHERE slug='chapeu-bucket' LIMIT 1;
    END IF;
    IF v_id IS NULL THEN SELECT id INTO v_id FROM categories WHERE slug='chapeus' OR name='Chapéus' LIMIT 1; END IF;
    RETURN v_id;
  END IF;

  -- cadernos / cadernetas / blocos
  IF n ~ 'caderno|caderneta|bloco de anota' THEN
    SELECT id INTO v_id FROM categories WHERE slug='cadernetas-cadernos' LIMIT 1;
    IF v_id IS NULL THEN SELECT id INTO v_id FROM categories WHERE name ILIKE 'caderno%' LIMIT 1; END IF;
    RETURN v_id;
  END IF;

  -- marmitas
  IF n ~ 'marmita' THEN
    SELECT id INTO v_id FROM categories WHERE name ILIKE 'marmit%' OR slug ILIKE 'marmit%' LIMIT 1;
    IF v_id IS NULL THEN SELECT id INTO v_id FROM categories WHERE slug='bar_e_cozinha' LIMIT 1; END IF;
    RETURN v_id;
  END IF;

  -- malas e bolsas
  IF n ~ '\mmala\M' THEN
    SELECT id INTO v_id FROM categories WHERE slug='bolsas_de_viagem' LIMIT 1; RETURN v_id;
  END IF;
  IF n ~ 'bolsa t[ée]rmica' THEN
    SELECT id INTO v_id FROM categories WHERE slug='bolsa_termica' LIMIT 1; RETURN v_id;
  END IF;
  IF n ~ '\mbolsa\M' AND n ~ 'esport|viagem|mochila' THEN
    SELECT id INTO v_id FROM categories WHERE slug='bolsas_de_viagem' LIMIT 1; RETURN v_id;
  END IF;

  -- brinquedos / antiestresse
  IF n ~ 'brinquedo' AND n ~ '\mpet\M|cachorro|gato' THEN
    SELECT id INTO v_id FROM categories WHERE slug='brinquedos_pet' LIMIT 1; RETURN v_id;
  END IF;
  IF n ~ 'antiestresse|anti-estresse|anti estresse|apert[áa]vel|brinquedo' THEN
    SELECT id INTO v_id FROM categories WHERE slug='jogos_e_brinquedos' LIMIT 1; RETURN v_id;
  END IF;

  -- escritório / pastas
  IF n ~ 'pasta|escrit[óo]rio|porta document' THEN
    SELECT id INTO v_id FROM categories WHERE slug ILIKE 'escritorio%' OR name ILIKE 'escritório%' LIMIT 1;
    IF v_id IS NULL THEN SELECT id INTO v_id FROM categories WHERE slug='acessorios' LIMIT 1; END IF;
    RETURN v_id;
  END IF;

  RETURN NULL;
END;
$function$;

-- Promoção: cadeia de categoria completa (De→Para → classify melhor confiança → residual)
CREATE OR REPLACE FUNCTION public.fn_promote_category_fallback(p_name text)
RETURNS uuid
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  BEGIN
    SELECT c.category_id INTO v_id
    FROM public.classify_xbz_category(p_name) c
    ORDER BY CASE c.confidence WHEN 'alta' THEN 1 WHEN 'média' THEN 2 ELSE 3 END
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_id := NULL;
  END;
  IF v_id IS NULL THEN
    v_id := public.fn_classify_category_residual(p_name);
  END IF;
  RETURN v_id;
END;
$function$;;
