CREATE OR REPLACE FUNCTION public.extract_xbz_material(p_nome text, p_descricao text DEFAULT NULL::text)
 RETURNS TABLE(material_name text, material_group text, confidence text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_texto TEXT;
    v_texto_lower TEXT;
BEGIN
    -- Combinar nome e descrição
    v_texto := COALESCE(p_nome, '') || ' ' || COALESCE(p_descricao, '');
    v_texto_lower := LOWER(v_texto);
    
    -- =============================================
    -- METAIS
    -- =============================================
    
    -- Aço Inoxidável / Inox
    IF v_texto_lower ~* '\m(inox|inoxid[aá]vel|a[çc]o\s*inox)\M' THEN
        RETURN QUERY SELECT 'Aço Inoxidável'::TEXT, 'METAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Aço (genérico)
    IF v_texto_lower ~* '\ma[çc]o\M' AND NOT v_texto_lower ~* 'inox' THEN
        RETURN QUERY SELECT 'Aço'::TEXT, 'METAIS'::TEXT, 'média'::TEXT;
    END IF;
    
    -- Alumínio
    IF v_texto_lower ~* '\m(alum[íi]nio|aluminum)\M' THEN
        RETURN QUERY SELECT 'Alumínio'::TEXT, 'METAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Metal (genérico)
    IF v_texto_lower ~* '\mmetal\M' AND NOT v_texto_lower ~* '(inox|alum|a[çc]o)' THEN
        RETURN QUERY SELECT 'Metal'::TEXT, 'METAIS'::TEXT, 'média'::TEXT;
    END IF;
    
    -- Cobre
    IF v_texto_lower ~* '\mcobre\M' THEN
        RETURN QUERY SELECT 'Cobre'::TEXT, 'METAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Latão
    IF v_texto_lower ~* '\mlat[ãa]o\M' THEN
        RETURN QUERY SELECT 'Latão'::TEXT, 'METAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Zinco
    IF v_texto_lower ~* '\mzinco\M' THEN
        RETURN QUERY SELECT 'Zinco'::TEXT, 'METAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- =============================================
    -- PLÁSTICOS
    -- =============================================
    
    -- ABS
    IF v_texto_lower ~* '\mabs\M' THEN
        RETURN QUERY SELECT 'ABS'::TEXT, 'PLÁSTICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- PP (Polipropileno)
    IF v_texto_lower ~* '\m(pp|polipropileno)\M' THEN
        RETURN QUERY SELECT 'Polipropileno (PP)'::TEXT, 'PLÁSTICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- PE (Polietileno)
    IF v_texto_lower ~* '\m(pe|polietileno)\M' THEN
        RETURN QUERY SELECT 'Polietileno (PE)'::TEXT, 'PLÁSTICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- PET
    IF v_texto_lower ~* '\m(pet|tereftalato)\M' THEN
        RETURN QUERY SELECT 'PET'::TEXT, 'PLÁSTICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- PS (Poliestireno)
    IF v_texto_lower ~* '\m(ps|poliestireno)\M' THEN
        RETURN QUERY SELECT 'Poliestireno (PS)'::TEXT, 'PLÁSTICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Acrílico
    IF v_texto_lower ~* '\macr[íi]lico\M' THEN
        RETURN QUERY SELECT 'Acrílico'::TEXT, 'PLÁSTICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- PVC
    IF v_texto_lower ~* '\mpvc\M' THEN
        RETURN QUERY SELECT 'PVC'::TEXT, 'PLÁSTICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Tritan
    IF v_texto_lower ~* '\mtritan\M' THEN
        RETURN QUERY SELECT 'Tritan'::TEXT, 'PLÁSTICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Plástico (genérico) - só se não encontrou específico
    IF v_texto_lower ~* '\mpl[áa]stico\M' THEN
        RETURN QUERY SELECT 'Plástico'::TEXT, 'PLÁSTICOS'::TEXT, 'média'::TEXT;
    END IF;
    
    -- =============================================
    -- BORRACHAS E SILICONES
    -- =============================================
    
    -- Silicone
    IF v_texto_lower ~* '\msilicone\M' THEN
        RETURN QUERY SELECT 'Silicone'::TEXT, 'BORRACHAS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Borracha
    IF v_texto_lower ~* '\mborracha\M' THEN
        RETURN QUERY SELECT 'Borracha'::TEXT, 'BORRACHAS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- EVA
    IF v_texto_lower ~* '\meva\M' THEN
        RETURN QUERY SELECT 'EVA'::TEXT, 'BORRACHAS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Neoprene
    IF v_texto_lower ~* '\mneoprene\M' THEN
        RETURN QUERY SELECT 'Neoprene'::TEXT, 'BORRACHAS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- =============================================
    -- VIDROS E CERÂMICAS
    -- =============================================
    
    -- Vidro
    IF v_texto_lower ~* '\mvidro\M' THEN
        RETURN QUERY SELECT 'Vidro'::TEXT, 'VIDROS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Borossilicato
    IF v_texto_lower ~* '\mborossilicato\M' THEN
        RETURN QUERY SELECT 'Vidro Borossilicato'::TEXT, 'VIDROS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Cerâmica
    IF v_texto_lower ~* '\mcer[âa]mica\M' THEN
        RETURN QUERY SELECT 'Cerâmica'::TEXT, 'CERÂMICAS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Porcelana
    IF v_texto_lower ~* '\mporcelana\M' THEN
        RETURN QUERY SELECT 'Porcelana'::TEXT, 'CERÂMICAS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- =============================================
    -- MADEIRAS E NATURAIS
    -- =============================================
    
    -- Bambu
    IF v_texto_lower ~* '\mbamb[u\u00fa]\M' THEN
        RETURN QUERY SELECT 'Bambu'::TEXT, 'NATURAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Madeira
    IF v_texto_lower ~* '\mmadeira\M' THEN
        RETURN QUERY SELECT 'Madeira'::TEXT, 'NATURAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- MDF
    IF v_texto_lower ~* '\mmdf\M' THEN
        RETURN QUERY SELECT 'MDF'::TEXT, 'NATURAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Cortiça
    IF v_texto_lower ~* '\mcorti[çc]a\M' THEN
        RETURN QUERY SELECT 'Cortiça'::TEXT, 'NATURAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Palha / Fibra Natural
    IF v_texto_lower ~* '\m(palha|fibra\s*natural)\M' THEN
        RETURN QUERY SELECT 'Fibra Natural'::TEXT, 'NATURAIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- =============================================
    -- TÊXTEIS
    -- =============================================
    
    -- Algodão
    IF v_texto_lower ~* '\malgod[ãa]o\M' THEN
        RETURN QUERY SELECT 'Algodão'::TEXT, 'TÊXTEIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Poliéster
    IF v_texto_lower ~* '\mpoli[ée]ster\M' THEN
        RETURN QUERY SELECT 'Poliéster'::TEXT, 'TÊXTEIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Nylon
    IF v_texto_lower ~* '\m(nylon|n[áa]ilon)\M' THEN
        RETURN QUERY SELECT 'Nylon'::TEXT, 'TÊXTEIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Lona
    IF v_texto_lower ~* '\mlona\M' THEN
        RETURN QUERY SELECT 'Lona'::TEXT, 'TÊXTEIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Juta
    IF v_texto_lower ~* '\mjuta\M' THEN
        RETURN QUERY SELECT 'Juta'::TEXT, 'TÊXTEIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Non-woven / TNT
    IF v_texto_lower ~* '\m(non[\s-]?woven|tnt)\M' THEN
        RETURN QUERY SELECT 'Non-woven (TNT)'::TEXT, 'TÊXTEIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Oxford
    IF v_texto_lower ~* '\moxford\M' THEN
        RETURN QUERY SELECT 'Oxford'::TEXT, 'TÊXTEIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Microfibra
    IF v_texto_lower ~* '\mmicrofibra\M' THEN
        RETURN QUERY SELECT 'Microfibra'::TEXT, 'TÊXTEIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- =============================================
    -- COUROS
    -- =============================================
    
    -- Couro Legítimo
    IF v_texto_lower ~* '\mcouro\s*(leg[íi]timo|natural|genu[íi]no)\M' THEN
        RETURN QUERY SELECT 'Couro Legítimo'::TEXT, 'COUROS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Couro Sintético / Ecológico
    IF v_texto_lower ~* '\mcouro\s*(sint[ée]tico|ecol[óo]gico|pu)\M' THEN
        RETURN QUERY SELECT 'Couro Sintético'::TEXT, 'COUROS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Couro (genérico)
    IF v_texto_lower ~* '\mcouro\M' AND NOT v_texto_lower ~* '(leg[íi]timo|sint[ée]tico|ecol[óo]gico)' THEN
        RETURN QUERY SELECT 'Couro'::TEXT, 'COUROS'::TEXT, 'média'::TEXT;
    END IF;
    
    -- =============================================
    -- PAPÉIS
    -- =============================================
    
    -- Papel
    IF v_texto_lower ~* '\mpapel\M' THEN
        RETURN QUERY SELECT 'Papel'::TEXT, 'PAPÉIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Papelão
    IF v_texto_lower ~* '\mpapel[ãa]o\M' THEN
        RETURN QUERY SELECT 'Papelão'::TEXT, 'PAPÉIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Kraft
    IF v_texto_lower ~* '\mkraft\M' THEN
        RETURN QUERY SELECT 'Papel Kraft'::TEXT, 'PAPÉIS'::TEXT, 'alta'::TEXT;
    END IF;
    
    -- Reciclado
    IF v_texto_lower ~* '\m(papel\s*)?reciclado\M' THEN
        RETURN QUERY SELECT 'Material Reciclado'::TEXT, 'ECOLÓGICOS'::TEXT, 'alta'::TEXT;
    END IF;
    
    RETURN;
END;
$function$
