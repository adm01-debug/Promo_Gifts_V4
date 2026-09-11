
-- =============================================================
-- Tabela de movimentações manuais de estoque
-- Auditoria completa de entradas, saídas e ajustes operacionais
-- =============================================================

CREATE TABLE public.stock_movements (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      uuid        NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    movement_type   text        NOT NULL,
    quantity        integer     NOT NULL,
    stock_before    integer,
    stock_after     integer,
    unit_cost       numeric(12,4),
    reference_type  text,
    reference_number text,
    notes           text,
    created_by      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_stock_movements_type
        CHECK (movement_type IN ('ENTRADA','SAIDA','AJUSTE','PERDA','RESERVA','DEVOLUCAO')),
    CONSTRAINT chk_stock_movements_qty_nonzero
        CHECK (quantity != 0)
);

-- Índices para queries frequentes
CREATE INDEX idx_stock_movements_variant_id  ON public.stock_movements (variant_id);
CREATE INDEX idx_stock_movements_created_at  ON public.stock_movements (created_at DESC);
CREATE INDEX idx_stock_movements_type        ON public.stock_movements (movement_type);
CREATE INDEX idx_stock_movements_reference   ON public.stock_movements (reference_number) WHERE reference_number IS NOT NULL;

-- Comentários descritivos
COMMENT ON TABLE  public.stock_movements IS 'Histórico auditável de movimentações manuais de estoque (entradas, saídas, ajustes). Não substituído pelo sync automático de fornecedores.';
COMMENT ON COLUMN public.stock_movements.movement_type    IS 'ENTRADA=recebimento, SAIDA=despacho/venda, AJUSTE=correção inventário, PERDA=quebra/avaria, RESERVA=reserva prévia, DEVOLUCAO=retorno de cliente';
COMMENT ON COLUMN public.stock_movements.quantity         IS 'Positivo para ENTRADA, negativo para SAIDA/PERDA/RESERVA';
COMMENT ON COLUMN public.stock_movements.reference_type   IS 'Tipo do documento de referência (NF, PEDIDO, RESERVA_ID, etc.)';
COMMENT ON COLUMN public.stock_movements.reference_number IS 'Número do documento de referência';

-- RLS: habilitar (alinhado com padrão das demais tabelas do schema)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policy: leitura para usuários autenticados da organização
CREATE POLICY "stock_movements_select" ON public.stock_movements
    FOR SELECT TO authenticated USING (true);

-- Policy: insert/update para authenticated (as funções rodam com SECURITY INVOKER)
CREATE POLICY "stock_movements_insert" ON public.stock_movements
    FOR INSERT TO authenticated WITH CHECK (true);
;
