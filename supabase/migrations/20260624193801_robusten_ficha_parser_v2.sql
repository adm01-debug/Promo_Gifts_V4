-- Parser robusto: aceita "<peca> (A x L): N cm x N cm", "Medidas <peca>: N cm x N cm",
-- "<peca>: N cm x N cm", com x ou ×; ignora linhas de gravacao; descarta rotulos invalidos.
CREATE OR REPLACE FUNCTION public.fn_parse_ficha_tecnica_text(
  p_product_sku text, p_text text, p_source_url text DEFAULT NULL,
  p_source text DEFAULT 'xbz_ficha')
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m text[]; lbl text; n int := 0;
BEGIN
  IF p_text IS NULL OR btrim(p_text)='' THEN RETURN 0; END IF;
  FOR m IN
    SELECT regexp_match(
             line,
             '^(.*?)([0-9]+(?:,[0-9]+)?)\s*cm\s*[x×]\s*([0-9]+(?:,[0-9]+)?)\s*cm(?:\s*[x×]\s*([0-9]+(?:,[0-9]+)?)\s*cm)?',
             'i')
    FROM regexp_split_to_table(replace(p_text, E'\r',''), E'\n') AS line
    WHERE line ~* '[0-9]\s*cm\s*[x×]\s*[0-9]'   -- tem medida cm x cm
      AND line !~* 'grava'                       -- NAO e area de gravacao
      AND line !~* 'aproxim.{0,6}para'           -- "aproximadas para gravacao"
  LOOP
    IF m IS NULL THEN CONTINUE; END IF;
    lbl := m[1];
    lbl := regexp_replace(lbl, '\(.*?\)', '', 'g');                                  -- remove (A x L), (CxL)...
    lbl := regexp_replace(lbl, '(?i)^\s*medidas?\s+(da\s+|de\s+|do\s+|das\s+|dos\s+)?', ''); -- "Medidas (da/de..)"
    lbl := regexp_replace(lbl, '^[\s\-*•\d.|>#]+', '');                               -- bullets/numeros/markdown no inicio
    lbl := regexp_replace(lbl, '[*_:|]+', ' ', 'g');                                  -- markdown/colon
    lbl := btrim(regexp_replace(lbl, '\s+', ' ', 'g'), ' -');
    CONTINUE WHEN lbl IS NULL OR length(lbl) < 2 OR length(lbl) > 60;
    CONTINUE WHEN lbl ~* '^(peso|volume|capacidade|conteudo|conteúdo|cor|cores|material|garantia|composic|composiç|dimens)';
    INSERT INTO kit_component_ficha_staging
      (product_sku, piece_label, dim_a_mm, dim_l_mm, dim_p_mm, raw_text, source, source_url)
    VALUES (
      p_product_sku, lbl,
      round(replace(m[2],',','.')::numeric*10)::int,
      round(replace(m[3],',','.')::numeric*10)::int,
      CASE WHEN m[4] IS NOT NULL THEN round(replace(m[4],',','.')::numeric*10)::int END,
      lbl||': '||m[2]||' cm x '||m[3]||' cm'||COALESCE(' x '||m[4]||' cm',''),
      p_source, p_source_url
    );
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;;
