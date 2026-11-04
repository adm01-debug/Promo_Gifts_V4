CREATE OR REPLACE FUNCTION public.fn_xbz_resolver_cor_secundaria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hex     text;
  v_cv_id   uuid;
BEGIN
  -- fix_version: xbz-secondary-color-secdef-2026-07-03
  -- ANTI-REGRESSÃO: não remover SECURITY DEFINER, não reverter para CASE hardcoded.
  -- Guard XBZ — não processar outros fornecedores
  IF NEW.supplier_id != 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid THEN
    RETURN NEW;
  END IF;

  -- Normalizar string vazia → NULL
  IF NEW.color_name_2 = '' THEN
    NEW.color_name_2 := NULL;
  END IF;

  -- Deduplicação: cor secundária = cor primária → limpar
  IF NEW.color_name_2 IS NOT NULL
    AND upper(trim(NEW.color_name_2)) = upper(trim(COALESCE(NEW.color_name, '')))
  THEN
    NEW.color_name_2 := NULL;
    NEW.color_code_2 := NULL;
    NEW.color_hex_2  := NULL;
    NEW.color_id_2   := NULL;
    RETURN NEW;
  END IF;

  -- Sem cor secundária → saída rápida
  IF NEW.color_name_2 IS NULL THEN
    RETURN NEW;
  END IF;

  -- Resolver hex via api_color_id (quando hex não veio preenchido)
  IF NEW.color_hex_2 IS NULL AND NEW.color_code_2 IS NOT NULL THEN
    SELECT sc.hex_code INTO v_hex
    FROM public.supplier_colors sc
    WHERE sc.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid
      AND sc.api_color_id = NEW.color_code_2
    LIMIT 1;
    NEW.color_hex_2 := v_hex;
  END IF;

  -- Resolver color_id_2 via fn_match_canonical_color
  -- (substitui o CASE hardcoded com 20 cores por resolução dinâmica com 30+)
  IF NEW.color_id_2 IS NULL THEN
    NEW.color_id_2 := public.fn_match_canonical_color(NEW.color_name_2, NEW.color_hex_2);
  END IF;

  RETURN NEW;
END;
$function$
