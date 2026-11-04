CREATE OR REPLACE FUNCTION public.fn_extract_material_from_name(p_name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_name_lower TEXT;
  v_materials TEXT[] := '{}';
BEGIN
  v_name_lower := LOWER(unaccent(COALESCE(p_name, '')));

  -- ── Metais ─────────────────────────────────────────────────────────
  IF v_name_lower ~ '\m(aco\s*inox|inox|stainless)\M' THEN v_materials := array_append(v_materials, 'Aço Inox'); END IF;
  IF v_name_lower ~ '\m(aluminio|aluminum)\M' THEN v_materials := array_append(v_materials, 'Alumínio'); END IF;
  IF v_name_lower ~ '\m(metal)\M' AND NOT v_name_lower ~ '\m(inox|aluminio)\M' THEN v_materials := array_append(v_materials, 'Metal'); END IF;
  IF v_name_lower ~ '\m(latao|brass)\M' THEN v_materials := array_append(v_materials, 'Latão'); END IF;
  IF v_name_lower ~ '\m(zinco|zinc)\M' THEN v_materials := array_append(v_materials, 'Zinco'); END IF;

  -- ── Plásticos ──────────────────────────────────────────────────────
  IF v_name_lower ~ '\m(plastico|plastic)\M' THEN v_materials := array_append(v_materials, 'Plástico'); END IF;
  IF v_name_lower ~ '\m(abs)\M' THEN v_materials := array_append(v_materials, 'ABS'); END IF;
  IF v_name_lower ~ '\m(rabs|r-abs)\M' THEN v_materials := array_append(v_materials, 'rABS'); END IF;
  IF v_name_lower ~ '\m(pp|polipropileno)\M' THEN v_materials := array_append(v_materials, 'Polipropileno (PP)'); END IF;
  IF v_name_lower ~ '\m(rpet|r-pet)\M' THEN v_materials := array_append(v_materials, 'rPET'); END IF;
  IF v_name_lower ~ '\m(pet)\M' AND NOT v_name_lower ~ '\m(rpet)\M' THEN v_materials := array_append(v_materials, 'PET'); END IF;
  IF v_name_lower ~ '\m(pc|policarbonato)\M' THEN v_materials := array_append(v_materials, 'Policarbonato'); END IF;
  IF v_name_lower ~ '\m(ps|poliestireno)\M' THEN v_materials := array_append(v_materials, 'Poliestireno (PS)'); END IF;
  IF v_name_lower ~ '\m(pvc)\M' THEN v_materials := array_append(v_materials, 'PVC'); END IF;
  IF v_name_lower ~ '\m(silicone)\M' THEN v_materials := array_append(v_materials, 'Silicone'); END IF;
  IF v_name_lower ~ '\m(tritan)\M' THEN v_materials := array_append(v_materials, 'Tritan'); END IF;
  IF v_name_lower ~ '\m(acrilico)\M' THEN v_materials := array_append(v_materials, 'Acrílico'); END IF;

  -- ── Vidro ──────────────────────────────────────────────────────────
  IF v_name_lower ~ '\m(vidro|glass|borossilicato)\M' THEN v_materials := array_append(v_materials, 'Vidro'); END IF;

  -- ── Madeira / Natural ──────────────────────────────────────────────
  IF v_name_lower ~ '\m(madeira|wood|mdf)\M' THEN v_materials := array_append(v_materials, 'Madeira'); END IF;
  IF v_name_lower ~ '\m(bambu|bamboo)\M' THEN v_materials := array_append(v_materials, 'Bambu'); END IF;
  IF v_name_lower ~ '\m(cortica|cork)\M' THEN v_materials := array_append(v_materials, 'Cortiça'); END IF;

  -- ── Fibras naturais e sustentáveis (NOVO) ──────────────────────────
  IF v_name_lower ILIKE '%fibra de coco%' OR v_name_lower ILIKE '%coco%' AND v_name_lower ILIKE '%fibra%' THEN v_materials := array_append(v_materials, 'Fibra de Coco'); END IF;
  IF v_name_lower ILIKE '%fibra de arroz%' OR v_name_lower ILIKE '%arroz%' AND v_name_lower ILIKE '%fibra%' THEN v_materials := array_append(v_materials, 'Fibra de Arroz'); END IF;
  IF v_name_lower ILIKE '%fibra de cana%' THEN v_materials := array_append(v_materials, 'Fibra de Cana'); END IF;
  IF v_name_lower ILIKE '%fibra de cafe%' OR v_name_lower ILIKE '%fibra de café%' THEN v_materials := array_append(v_materials, 'Fibra de Café'); END IF;
  IF v_name_lower ILIKE '%percalux%' THEN v_materials := array_append(v_materials, 'Percalux'); END IF;
  IF v_name_lower ILIKE '%kraft%' THEN v_materials := array_append(v_materials, 'Papel Kraft'); END IF;
  IF v_name_lower ILIKE '%linho%' THEN v_materials := array_append(v_materials, 'Linho'); END IF;

  -- ── Tecidos ────────────────────────────────────────────────────────
  IF v_name_lower ~ '\m(algodao|cotton)\M' THEN v_materials := array_append(v_materials, 'Algodão'); END IF;
  IF v_name_lower ~ '\m(poliester|polyester)\M' THEN v_materials := array_append(v_materials, 'Poliéster'); END IF;
  IF v_name_lower ~ '\m(nylon|nailon)\M' THEN v_materials := array_append(v_materials, 'Nylon'); END IF;
  IF v_name_lower ~ '\m(tnt|non.?woven)\M' THEN v_materials := array_append(v_materials, 'TNT'); END IF;
  IF v_name_lower ~ '\m(lona|canvas)\M' THEN v_materials := array_append(v_materials, 'Lona'); END IF;
  IF v_name_lower ~ '\m(juta|jute)\M' THEN v_materials := array_append(v_materials, 'Juta'); END IF;
  IF v_name_lower ~ '\m(couro|leather)\M' THEN v_materials := array_append(v_materials, 'Couro'); END IF;
  IF v_name_lower ~ '\m(sintetico|courino|pu)\M' THEN v_materials := array_append(v_materials, 'Couro Sintético'); END IF;

  -- ── Borracha / Espuma ──────────────────────────────────────────────
  IF v_name_lower ~ '\m(borracha|rubber)\M' THEN v_materials := array_append(v_materials, 'Borracha'); END IF;
  IF v_name_lower ~ '\m(espuma|foam)\M' THEN v_materials := array_append(v_materials, 'Espuma'); END IF;

  -- ── Papel / Cartão ─────────────────────────────────────────────────
  IF v_name_lower ~ '\m(papel|paper)\M' AND NOT v_name_lower ILIKE '%kraft%' THEN v_materials := array_append(v_materials, 'Papel'); END IF;
  IF v_name_lower ~ '\m(cartao|cardboard)\M' THEN v_materials := array_append(v_materials, 'Cartão'); END IF;
  IF v_name_lower ~ '\m(reciclado|recycled)\M' THEN v_materials := array_append(v_materials, 'Reciclado'); END IF;

  -- ── Cerâmica ───────────────────────────────────────────────────────
  IF v_name_lower ~ '\m(ceramica|ceramic|porcelana)\M' THEN v_materials := array_append(v_materials, 'Cerâmica'); END IF;

  RETURN v_materials;
END;
$function$
