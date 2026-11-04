CREATE OR REPLACE FUNCTION public.fn_xbz_derive_materials(p_name text, p_subtype text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_text text;
    v_mats text[] := '{}';
BEGIN
    v_text := lower(COALESCE(p_name,'') || ' ' || COALESCE(p_subtype,''));

    -- Metais (inox antes de metal genérico)
    IF v_text ~* 'inox|aço inox'                                THEN v_mats := array_append(v_mats,'Aço Inoxidável'); END IF;
    IF v_text ~* 'alum[ií]n'                                    THEN v_mats := array_append(v_mats,'Alumínio'); END IF;
    IF v_text ~* 'met[aá]l'
       AND NOT v_text ~* '(inox|alum[ií]n)'                     THEN v_mats := array_append(v_mats,'Metal'); END IF;

    -- Plásticos
    IF v_text ~* 'plástic|plastic'                              THEN v_mats := array_append(v_mats,'Plástico'); END IF;
    IF v_text ~* 'rpet'                                         THEN v_mats := array_append(v_mats,'rPET');
    ELSIF v_text ~* '(^| )pet( |$)'                            THEN v_mats := array_append(v_mats,'PET'); END IF;
    IF v_text ~* 'acr[ií]lic'                                   THEN v_mats := array_append(v_mats,'Acrílico'); END IF;
    IF v_text ~* '(^| )eva( |$)'                               THEN v_mats := array_append(v_mats,'EVA'); END IF;
    IF v_text ~* '(^| )pvc( |$)'                               THEN v_mats := array_append(v_mats,'PVC'); END IF;
    IF v_text ~* 'silicone'                                     THEN v_mats := array_append(v_mats,'Silicone'); END IF;
    IF v_text ~* 'borracha|emborrachad'                         THEN v_mats := array_append(v_mats,'Borracha'); END IF;

    -- Têxteis
    IF v_text ~* 'nylon'                                        THEN v_mats := array_append(v_mats,'Nylon'); END IF;
    IF v_text ~* 'poliéster|poliester|polyester'                THEN v_mats := array_append(v_mats,'Poliéster'); END IF;
    IF v_text ~* 'oxford'                                       THEN v_mats := array_append(v_mats,'Oxford'); END IF;
    IF v_text ~* 'neoprene'                                     THEN v_mats := array_append(v_mats,'Neoprene'); END IF;
    IF v_text ~* 'microfibra'                                   THEN v_mats := array_append(v_mats,'Microfibra'); END IF;
    IF v_text ~* 'algod[ãa]o|cotton'                           THEN v_mats := array_append(v_mats,'Algodão'); END IF;
    IF v_text ~* '(^| )tnt( |$)|non.?woven'                    THEN v_mats := array_append(v_mats,'TNT'); END IF;
    IF v_text ~* 'feltro'                                       THEN v_mats := array_append(v_mats,'Feltro'); END IF;
    IF v_text ~* 'juta'                                         THEN v_mats := array_append(v_mats,'Juta'); END IF;
    IF v_text ~* '(^| )lona( |$)'                             THEN v_mats := array_append(v_mats,'Lona'); END IF;
    IF v_text ~* 'veludo'                                       THEN v_mats := array_append(v_mats,'Veludo'); END IF;
    IF v_text ~* 'percalux|percal'                             THEN v_mats := array_append(v_mats,'Percalux'); END IF;

    -- Naturais / madeira / papel
    IF v_text ~* 'bambu'                                        THEN v_mats := array_append(v_mats,'Bambu'); END IF;
    IF v_text ~* 'madeira'                                      THEN v_mats := array_append(v_mats,'Madeira'); END IF;
    IF v_text ~* '(^| )mdf( |$)'                              THEN v_mats := array_append(v_mats,'MDF'); END IF;
    IF v_text ~* 'papel[ãa]o'                                  THEN v_mats := array_append(v_mats,'Papelão'); END IF;
    IF v_text ~* 'kraft'                                        THEN v_mats := array_append(v_mats,'Kraft'); END IF;
    IF v_text ~* 'corti[çc]a'                                  THEN v_mats := array_append(v_mats,'Cortiça'); END IF;

    -- Vidro / cerâmica
    IF v_text ~* 'borossilicato'                                THEN v_mats := array_append(v_mats,'Vidro Borossilicato');
    ELSIF v_text ~* 'vidro'                                     THEN v_mats := array_append(v_mats,'Vidro'); END IF;
    IF v_text ~* 'cer[âa]mica'                                 THEN v_mats := array_append(v_mats,'Cerâmica'); END IF;
    IF v_text ~* 'porcelana'                                    THEN v_mats := array_append(v_mats,'Porcelana'); END IF;

    -- Couro
    IF v_text ~* 'couro sint|c\.sint|couro pu|(^| )pu( |$)'
        THEN v_mats := array_append(v_mats,'Couro Sintético');
    ELSIF v_text ~* 'couro'
        THEN v_mats := array_append(v_mats,'Couro'); END IF;

    IF array_length(v_mats, 1) IS NULL THEN RETURN NULL; END IF;
    RETURN to_jsonb(v_mats);
END;
$function$
