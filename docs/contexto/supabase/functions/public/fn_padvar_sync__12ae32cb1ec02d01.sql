CREATE OR REPLACE FUNCTION public.fn_padvar_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- fix_version: padvar-sync-color-resolution-2026-07-03
  -- ANTI-REGRESSÃO (Lovable bot): não remover auto-resolve de color_id abaixo.
  -- DRY RUN validado: 496 variantes resolvidas com 100% de acerto.

  -- STEP 1: Vínculo com produto-pai (comportamento original preservado)
  IF NEW.pad_id IS NULL AND NEW.parent_reference IS NOT NULL THEN
    SELECT p.id INTO NEW.pad_id
    FROM public.produtos_padronizacao p
    WHERE p.supplier_id = NEW.supplier_id
      AND p.supplier_reference = NEW.parent_reference
    LIMIT 1;
  END IF;

  -- STEP 2: Auto-resolução de color_id via fn_match_canonical_color
  -- Chamada apenas quando color_id não veio preenchido (respeita override manual).
  -- A função busca em: color_variations (P1), supplier_colors→equivalences (P3),
  -- color_synonym_map (P3.5), tabela de sinônimos inline (P4.5), color_groups (P5).
  IF NEW.color_id IS NULL THEN
    NEW.color_id := public.fn_match_canonical_color(NEW.color_name, NEW.color_hex);
  END IF;

  RETURN NEW;
END;
$function$
