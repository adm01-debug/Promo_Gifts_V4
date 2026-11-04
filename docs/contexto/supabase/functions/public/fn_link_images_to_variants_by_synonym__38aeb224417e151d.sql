CREATE OR REPLACE FUNCTION public.fn_link_images_to_variants_by_synonym(p_dry_run boolean DEFAULT true)
 RETURNS TABLE(total_candidates integer, match_1para1_count integer, ambiguous_count integer, no_match_count integer, updated_count integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'fn_link_images_to_variants_by_synonym DESATIVADA: matching por codigo (_xbz_codes) e ambiguo e gera mislink de cor (ver migration color_revert_bad_synonym_variant_links / 2026-06). Use fn_color_link_all_suppliers(false) para vinculacao segura.';
END;
$function$
