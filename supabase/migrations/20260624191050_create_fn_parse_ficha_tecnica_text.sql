-- Extrai linhas "Peca (A x L[ x P]): N cm x N cm[ x N cm]" de um texto (site ou PDF)
-- e insere na staging. Idempotencia fica por conta do fn_promote (procedencia).
CREATE OR REPLACE FUNCTION public.fn_parse_ficha_tecnica_text(
  p_product_sku text, p_text text, p_source_url text DEFAULT NULL,
  p_source text DEFAULT 'xbz_site_caracteristicas')
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m text[]; n int := 0;
BEGIN
  IF p_text IS NULL OR btrim(p_text)='' THEN RETURN 0; END IF;
  FOR m IN
    SELECT regexp_match(
             line,
             '^\s*(.+?)\s*\(\s*A\s*x\s*L(?:\s*x\s*P)?\s*\)\s*:\s*([0-9]+(?:,[0-9]+)?)\s*cm\s*x\s*([0-9]+(?:,[0-9]+)?)\s*cm(?:\s*x\s*([0-9]+(?:,[0-9]+)?)\s*cm)?'
           )
    FROM regexp_split_to_table(replace(p_text, E'\r', ''), E'\n') AS line
    WHERE line ~ '\(\s*A\s*x\s*L'
  LOOP
    IF m IS NULL THEN CONTINUE; END IF;
    INSERT INTO kit_component_ficha_staging
      (product_sku, piece_label, dim_a_mm, dim_l_mm, dim_p_mm, raw_text, source, source_url)
    VALUES (
      p_product_sku,
      btrim(m[1]),
      round(replace(m[2],',','.')::numeric*10)::int,
      round(replace(m[3],',','.')::numeric*10)::int,
      CASE WHEN m[4] IS NOT NULL THEN round(replace(m[4],',','.')::numeric*10)::int END,
      btrim(m[1])||' (A x L'||CASE WHEN m[4] IS NOT NULL THEN ' x P' ELSE '' END||'): '
        ||m[2]||' cm x '||m[3]||' cm'||CASE WHEN m[4] IS NOT NULL THEN ' x '||m[4]||' cm' ELSE '' END,
      p_source, p_source_url
    );
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;;
