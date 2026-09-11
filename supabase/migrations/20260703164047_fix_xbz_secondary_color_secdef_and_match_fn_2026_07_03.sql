
-- =============================================================================
-- Migration: fix_xbz_secondary_color_secdef_and_match_fn_2026_07_03
--
-- PROBLEMA: fn_xbz_resolver_cor_secundaria (trigger BEFORE INSERT/UPDATE em
-- produtos_padronizacao_variantes para supplier XBZ) não era SECURITY DEFINER
-- e não tinha SET search_path, deixando-a vulnerável a search_path injection.
-- Além disso, usava CASE com apenas 20 cores hardcoded em vez de chamar
-- fn_match_canonical_color (30+ cores + sinônimos + equivalências).
--
-- SOLUÇÃO:
--   1) Adicionar SECURITY DEFINER + SET search_path TO 'public'
--   2) Substituir CASE hardcoded por fn_match_canonical_color
--   3) Qualificar todos os nomes de tabela com public.
--   4) Adicionar fix_version + ANTI-REGRESSÃO
--
-- ANÁLISE ADVERSARIAL:
--   - 21 cores do CASE testadas: 20/21 preservadas identicamente
--   - INOX: CASE→'Prata', fn_match→'Prata Acetinado (Fosco)' (semanticamente melhor)
--   - A lógica de deduplicação (color_name_2 == color_name → clear) preservada
--   - Guard XBZ (supplier_id check) preservado
--   - Hex lookup via api_color_id preservado
--   - fn_match_canonical_color já é STABLE SECURITY DEFINER — chamada segura
-- =============================================================================

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
$function$;

COMMENT ON FUNCTION public.fn_xbz_resolver_cor_secundaria() IS
'Trigger BEFORE INSERT/UPDATE: resolve cor secundária para variantes XBZ.
 fix_version: xbz-secondary-color-secdef-2026-07-03
 ANTI-REGRESSÃO: manter SECURITY DEFINER + fn_match_canonical_color.
 Cobre 30+ cores via fn_match (era CASE hardcoded com 20).';
;
