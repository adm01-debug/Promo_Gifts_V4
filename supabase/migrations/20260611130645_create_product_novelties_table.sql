
-- ══════════════════════════════════════════════════════════════════
-- MIGRATION: product_novelties — tabela de controle do selo "NOVO"
-- Arquitetura Medallion — camada Gold (referencia products.id)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.product_novelties (
    id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
    product_id              uuid        NOT NULL,
    supplier_id             uuid,
    supplier_code           text,
    supplier_product_code   text,

    -- Origem da detecção (G-10: enum expandido via CHECK)
    source                  text        NOT NULL
        CONSTRAINT chk_pn_source CHECK (source IN (
            'manual',               -- marcado manualmente pelo usuário
            'import',               -- importação em lote
            'pipeline_auto',        -- detecção genérica pelo pipeline (qualquer fornecedor)
            'spot_new_product',     -- flag NewProduct=true da Stricker (OptionalsComplete)
            'spot_catalogo_novidades', -- Catalogs contém "Novidades" (catálogo ID=5)
            'xbz_recently_promoted',  -- produto XBZ promovido nos últimos N dias
            'asia_recently_promoted', -- produto ASIA promovido nos últimos N dias
            'sm_recently_promoted',   -- produto SOMARCAS promovido nos últimos N dias
            '88brindes_recently_promoted' -- produto 88BRINDES promovido recentemente
        )),

    -- Ciclo de vida do selo
    detected_at             timestamptz NOT NULL DEFAULT now(),
    expires_at              timestamptz,          -- NULL = não expira automaticamente
    is_active               boolean     NOT NULL DEFAULT true,
    is_highlighted          boolean     NOT NULL DEFAULT false, -- destaque home (só curadoria manual)

    -- Auditoria
    notes                   text,
    created_by              uuid,                 -- FK para profiles (nullable = criado pelo sistema)
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),  -- G-06: campo que faltava no doc

    CONSTRAINT pk_product_novelties PRIMARY KEY (id),
    CONSTRAINT fk_pn_product   FOREIGN KEY (product_id)  REFERENCES public.products(id)  ON DELETE CASCADE,
    CONSTRAINT fk_pn_supplier  FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL,
    CONSTRAINT fk_pn_created_by FOREIGN KEY (created_by) REFERENCES public.profiles(id)  ON DELETE SET NULL,

    -- Expiração não pode ser anterior à detecção
    CONSTRAINT chk_pn_expires_after_detected
        CHECK (expires_at IS NULL OR expires_at > detected_at)
);

-- ── Índices de performance ────────────────────────────────────────
-- Busca principal: novidades ativas
CREATE INDEX IF NOT EXISTS idx_pn_product_active
    ON public.product_novelties(product_id)
    WHERE is_active = true;

-- Busca por expiração (CRON de cleanup)
CREATE INDEX IF NOT EXISTS idx_pn_expires
    ON public.product_novelties(expires_at)
    WHERE is_active = true AND expires_at IS NOT NULL;

-- Busca por fornecedor
CREATE INDEX IF NOT EXISTS idx_pn_supplier
    ON public.product_novelties(supplier_id)
    WHERE is_active = true;

-- Busca por fonte (métricas)
CREATE INDEX IF NOT EXISTS idx_pn_source
    ON public.product_novelties(source, is_active);

-- Destaques para home
CREATE INDEX IF NOT EXISTS idx_pn_highlighted
    ON public.product_novelties(is_highlighted, detected_at DESC)
    WHERE is_active = true AND is_highlighted = true;

-- G-07: PARTIAL UNIQUE — garante no máximo 1 registro ATIVO por produto
-- (permite histórico: produto pode ter múltiplos registros, mas só 1 ativo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pn_product_one_active
    ON public.product_novelties(product_id)
    WHERE is_active = true;

-- ── Comentários de documentação ──────────────────────────────────
COMMENT ON TABLE public.product_novelties IS
    'Controla o ciclo de vida do selo "NOVO" nos produtos. '
    'Camada Gold — referencia products.id. '
    'Pipeline popula via fn_sync_product_novelties(); curadoria manual via is_highlighted. '
    'Máx. 1 registro ATIVO por produto (partial unique index). Histórico preservado.';

COMMENT ON COLUMN public.product_novelties.is_highlighted IS
    'TRUE = produto aparece em destaque na home. APENAS curadoria manual — nunca automático pelo pipeline.';
COMMENT ON COLUMN public.product_novelties.source IS
    'Origem da detecção. pipeline_auto/spot_*/xbz_*/asia_*/sm_* = automático. manual/import = humano.';
COMMENT ON COLUMN public.product_novelties.expires_at IS
    'NULL = não expira automaticamente. fn_expire_novelties() atualiza is_active=false quando vencido.';

-- ── G-11: RLS + GRANTs ──────────────────────────────────────────
ALTER TABLE public.product_novelties ENABLE ROW LEVEL SECURITY;

-- service_role: acesso total (pipeline, funções internas)
CREATE POLICY pn_service_role_all
    ON public.product_novelties
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- authenticated: leitura de registros ativos (catálogo front-end)
CREATE POLICY pn_authenticated_select_active
    ON public.product_novelties
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- anon: leitura pública de registros ativos (SSR / API pública)
CREATE POLICY pn_anon_select_active
    ON public.product_novelties
    FOR SELECT
    TO anon
    USING (is_active = true);

GRANT SELECT               ON public.product_novelties TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_novelties TO service_role;
;
