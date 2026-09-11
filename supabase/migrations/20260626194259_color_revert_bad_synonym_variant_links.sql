-- CORREÇÃO: fn_link_images_to_variants_by_synonym vinculou imagens XBZ às variantes ERRADAS
-- (tabela _xbz_codes tem códigos ambíguos, ex.: 'FBA'→Preto E Branco; o guard "1-para-1" não checa consistência de cor).
-- Sintoma definitivo do mislink: imagem com color_id != color_id da variante linkada (Preto->Branco, Rosa->Cobre, etc.).
-- Reverte variant_id->NULL nesses casos (as imagens preservam o color_id correto; cobertura intacta; swatch usa fallback por color_id).
-- NÃO aplicar T04 nestes (alinharia o color_id da imagem ao da variante errada => corromperia a cor).
DO $$
BEGIN
  CREATE TEMP TABLE _affected ON COMMIT DROP AS
  SELECT DISTINCT pi.product_id
  FROM product_images pi JOIN product_variants pv ON pv.id=pi.variant_id
  WHERE pi.is_active AND pi.source_supplier='XBZ' AND pi.applies_to_color=true
    AND pi.color_id IS DISTINCT FROM pv.color_id AND pv.color_id IS NOT NULL;

  UPDATE product_images pi SET variant_id=NULL, updated_at=now()
  FROM product_variants pv
  WHERE pv.id=pi.variant_id AND pi.is_active AND pi.source_supplier='XBZ' AND pi.applies_to_color=true
    AND pi.color_id IS DISTINCT FROM pv.color_id AND pv.color_id IS NOT NULL;

  -- Rebuild explícito dos swatches dos produtos afetados (idempotente; garante imagem correta por cor)
  UPDATE products p SET color_swatches = public.fn_rebuild_color_swatches(p.id)
  WHERE p.id IN (SELECT product_id FROM _affected);
END $$;;
