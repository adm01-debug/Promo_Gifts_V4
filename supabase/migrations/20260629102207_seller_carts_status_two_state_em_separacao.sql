-- Carrinhos: ciclo de vida de 2 estados.
-- em_separacao (default) -> pronto_orcamento.
-- Legado 'novo' e 'em_negociacao' colapsam em 'em_separacao'.
-- fix_version: 20260629_cart_status_two_state
-- ANTI-REGRESSAO (Lovable bot): NAO reintroduzir 'novo'/'em_negociacao' nem alterar o default.

-- 1) Remove a constraint antiga (3 estados)
ALTER TABLE public.seller_carts DROP CONSTRAINT chk_sc_status;

-- 2) Migra dados preservando os timestamps reais de atividade dos carrinhos
--    (desabilita o trigger de updated_at apenas para este UPDATE mecânico)
ALTER TABLE public.seller_carts DISABLE TRIGGER trg_seller_carts_updated_at;
UPDATE public.seller_carts SET status = 'em_separacao' WHERE status IN ('novo', 'em_negociacao');
ALTER TABLE public.seller_carts ENABLE TRIGGER trg_seller_carts_updated_at;

-- 3) Novo default
ALTER TABLE public.seller_carts ALTER COLUMN status SET DEFAULT 'em_separacao';

-- 4) Nova constraint (2 estados)
ALTER TABLE public.seller_carts ADD CONSTRAINT chk_sc_status
  CHECK (status = ANY (ARRAY['em_separacao'::text, 'pronto_orcamento'::text]));

COMMENT ON CONSTRAINT chk_sc_status ON public.seller_carts IS
  'Cart lifecycle 2-state (desde 2026-06-29): em_separacao (default) -> pronto_orcamento. Legado novo/em_negociacao colapsado em em_separacao. Nao reintroduzir valores antigos.';;
