-- ============================================================================
-- E10: Purge 88BRINDES — Chapéu ecoflex (produto_ativo=false)
-- 1 imagem `main` ainda ativa → inativar para consistência com o produto.
-- Não deletar: manter trilha de auditoria. Trigger AFTER UPDATE cuidará do
-- sync em products (primary_image_url etc. serão limpas pelo fn_sync_product_images).
-- ============================================================================

UPDATE public.product_images
SET
  is_active  = false,
  is_primary = false
WHERE source_supplier = '88BRINDES'
  AND is_active = true;

-- Documentar: 88BRINDES era fornecedor piloto, apenas 1 produto importado (Chapéu ecoflex)
-- que foi descontinuado. Imagens mantidas como histórico.
COMMENT ON TABLE public.product_images IS
'Tabela-fato de mídia do catálogo (camada Gold). 1 linha = 1 imagem física de produto hospedada no Cloudflare Images. É a fonte da verdade de imagens; os campos desnormalizados em products (images, primary_image_url, og_image_url, set_image_url, primary_image_fallback_url) são MANTIDOS pelos triggers desta tabela. RLS ativo (leitura pública só de ativas; escrita restrita a org owner/admin).
Fornecedores ativos: SPOT, XBZ, SOMARCAS, ASIA. 88BRINDES: piloto descontinuado (14 imagens inativas, produto Chapéu ecoflex arquivado).';

DO $$
DECLARE v_ativos int;
BEGIN
  SELECT COUNT(*) INTO v_ativos
  FROM public.product_images WHERE source_supplier = '88BRINDES' AND is_active = true;
  RAISE NOTICE 'E10: 88BRINDES imagens ainda ativas: %', v_ativos;
END $$;
