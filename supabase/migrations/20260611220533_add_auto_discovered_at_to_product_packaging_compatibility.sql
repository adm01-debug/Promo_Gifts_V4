
-- Adicionar rastreabilidade de quando a auto-descoberta rodou
ALTER TABLE public.product_packaging_compatibility
    ADD COLUMN IF NOT EXISTS auto_discovered_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS config_type_used    varchar(20) DEFAULT 'default';

-- Backfill: registros dimension_calculated e dimension_matching → marcar como descobertos agora
UPDATE public.product_packaging_compatibility
SET auto_discovered_at = created_at,
    config_type_used   = 'default'
WHERE compatibility_source IN ('dimension_calculated','dimension_matching')
  AND auto_discovered_at IS NULL;

COMMENT ON COLUMN public.product_packaging_compatibility.auto_discovered_at IS
'Timestamp da última vez que fn_auto_discover_compatible_packagings processou este par';

COMMENT ON COLUMN public.product_packaging_compatibility.config_type_used IS
'Configuração de folga usada: default | fragile | precision | bottles';

-- Criar índice parcial para busca eficiente
CREATE INDEX IF NOT EXISTS idx_ppc_auto_discovered 
    ON public.product_packaging_compatibility(auto_discovered_at)
    WHERE compatibility_source IN ('dimension_calculated','dimension_matching');

SELECT 
    compatibility_source,
    COUNT(*) as total,
    COUNT(CASE WHEN auto_discovered_at IS NOT NULL THEN 1 END) as com_ts
FROM product_packaging_compatibility
GROUP BY compatibility_source;
;
