-- Coluna de controle de sync de imagens no Bitrix24
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS bitrix_images_synced_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para filtrar nulos rapidamente
CREATE INDEX IF NOT EXISTS idx_products_bitrix_images_synced_at 
ON products (bitrix_images_synced_at) 
WHERE bitrix_images_synced_at IS NULL;

COMMENT ON COLUMN products.bitrix_images_synced_at IS 
'Data/hora da última sincronização de imagens para o Bitrix24. NULL = ainda não sincronizado.';
