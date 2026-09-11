-- M16b — Onda 2 do dicionário residual (caixa de som, mouse pad, churrasco,
-- kit drink/executivo/talheres, umidificador, frasqueira, pet, marmita...)

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

  -- som / áudio
  IF n ~ 'caixa de som|caixa som|speaker' THEN
    SELECT id INTO v_id FROM categories WHERE slug='caixa-de-som' LIMIT 1; RETURN v_id;
  END IF;

  -- mouse pad
  IF n ~ 'mouse ?pad' THEN
    IF n ~ 'ergon[ôo]mico' THEN SELECT id INTO v_id FROM categories WHERE slug='mouse_pad_espuma_ergonomico' LIMIT 1; END IF;
    IF v_id IS NULL THEN SELECT id INTO v_id FROM categories WHERE slug='mouse_pad' LIMIT 1; END IF;
    RETURN v_id;
  END IF;

  -- churrasco
  IF n ~ 'churrasqueira|churrasco' THEN
    IF n ~ '\mkit\M' THEN SELECT id INTO v_id FROM categories WHERE slug='kit_churrasco' LIMIT 1; END IF;
    IF v_id IS NULL THEN SELECT id INTO v_id FROM categories WHERE slug='churrasco' LIMIT 1; END IF;
    RETURN v_id;
  END IF;

  -- kits específicos
  IF n ~ '\mkit\M' AND n ~ 'drink|coquetel' THEN
    SELECT id INTO v_id FROM categories WHERE slug='kit-drink' LIMIT 1; RETURN v_id;
  END IF;
  IF n ~ '\mkit\M' AND n ~ 'executivo' THEN
    SELECT id INTO v_id FROM categories WHERE slug='kit_executivo' LIMIT 1; RETURN v_id;
  END IF;
  IF n ~ 'talher' THEN
    SELECT id INTO v_id FROM categories WHERE slug='bar_e_cozinha' LIMIT 1; RETURN v_id;
  END IF;

  -- utilidades / casa
  IF n ~ 'umidificador|aromatizador' THEN
    SELECT id INTO v_id FROM categories WHERE slug='ferramentas-utilidades' LIMIT 1; RETURN v_id;
  END IF;
  IF n ~ 'frasqueira' THEN
    SELECT id INTO v_id FROM categories WHERE slug='frasqueiras' LIMIT 1; RETURN v_id;
  END IF;

  -- pet
  IF n ~ 'bebedouro|comedouro' AND n ~ '\mpet|cachorro|gato' THEN
    SELECT id INTO v_id FROM categories WHERE slug='brinquedos_pet' LIMIT 1; RETURN v_id;
  END IF;

  -- chapéus
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
$function$;;
