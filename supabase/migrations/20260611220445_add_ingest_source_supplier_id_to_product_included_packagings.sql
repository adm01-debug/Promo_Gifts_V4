
-- Adicionar rastreabilidade ao product_included_packagings
ALTER TABLE public.product_included_packagings
    ADD COLUMN IF NOT EXISTS ingest_source varchar(40) DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS supplier_id   uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Criar índice para supplier_id
CREATE INDEX IF NOT EXISTS idx_pip_supplier_id 
    ON public.product_included_packagings(supplier_id);

-- Criar índice para ingest_source
CREATE INDEX IF NOT EXISTS idx_pip_ingest_source 
    ON public.product_included_packagings(ingest_source);

-- Adicionar check constraint para valores válidos de ingest_source
ALTER TABLE public.product_included_packagings
    DROP CONSTRAINT IF EXISTS chk_pip_ingest_source;

ALTER TABLE public.product_included_packagings
    ADD CONSTRAINT chk_pip_ingest_source CHECK (
        ingest_source IN (
            'manual',
            'spot_properties',
            'spot_scraping',
            'xbz_manual',
            'asia_manual',
            'asia_scraping',
            'sm_scraping',
            'sm_manual',
            '88brindes_manual',
            'pipeline_auto'
        )
    );

COMMENT ON COLUMN public.product_included_packagings.ingest_source IS
'Origem do dado: manual | spot_properties | spot_scraping | xbz_manual | asia_manual | sm_scraping | pipeline_auto';

COMMENT ON COLUMN public.product_included_packagings.supplier_id IS
'FK para supplier — rastreabilidade cross-supplier de embalagem inclusa';
;
