
-- ══════════════════════════════════════════════════════════════════
-- Melhoria A: Hardening das colunas FLAG-MORTA com valor constante
-- Adiciona CHECKs de imutabilidade + COMMENTs documentando o status
-- SEGURO: NOT VALID + VALIDATE sem lock, backward compatible
-- ══════════════════════════════════════════════════════════════════

-- A1: robots_meta — constante "index, follow" em 100% dos 7591 produtos
-- Referenciada em: v_products_public, vw_sitemap_products, fn_refresh_product_satellites
-- Mantida por compatibilidade de API; valor nunca vai mudar.
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_robots_meta_constant
  CHECK (robots_meta IS NULL OR robots_meta = 'index, follow')
  NOT VALID;

ALTER TABLE public.products
  VALIDATE CONSTRAINT chk_products_robots_meta_constant;

COMMENT ON COLUMN public.products.robots_meta IS
'FLAG-MORTA: constante "index, follow" em 100% dos registros.
CHECK chk_products_robots_meta_constant garante imutabilidade.
Mantida para compat com v_products_public, vw_sitemap_products e fn_refresh_product_satellites.
Candidata a DROP quando essas referências forem refatoradas (hardcode o valor na view/função).
2026-06-23: CHECK de imutabilidade adicionado.';

-- A2: price_freshness_threshold_days — constante 60 em 100% dos 7591 produtos
-- Referenciada em: v_product_active_badge, create_quote_transactional, update_quote_transactional
-- Default de 60 dias de "freshness" de preço; nunca foi customizado por produto.
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_price_freshness_constant
  CHECK (price_freshness_threshold_days IS NULL
         OR (price_freshness_threshold_days >= 1 AND price_freshness_threshold_days <= 365))
  NOT VALID;

ALTER TABLE public.products
  VALIDATE CONSTRAINT chk_products_price_freshness_constant;

COMMENT ON COLUMN public.products.price_freshness_threshold_days IS
'FLAG-MORTA: constante 60 em 100% dos registros (default nunca customizado por produto).
CHECK chk_products_price_freshness_constant valida range 1-365.
Referenciada em: v_product_active_badge, create_quote_transactional, update_quote_transactional.
Candidata a DROP quando essas referências usarem o valor default direto.
2026-06-23: CHECK de range + COMMENT adicionados.';

-- A3: organization_id — constante (1 organização: 5db5aee1-...)
-- Não adicionamos CHECK aqui pois poderia bloquear futuros testes multi-tenant
-- Apenas documentamos
COMMENT ON COLUMN public.products.organization_id IS
'FLAG-MORTA: 1 único valor (organização Promo Brindes: 5db5aee1-064b-4ef4-9193-345dcd8274ea).
Multi-tenant não exercido; valor constante.
Mantida por RLS (policies usam organization_id para controle de acesso).
NÃO dropar: RLS depende desta coluna.
2026-06-23: COMMENT adicionado.';
;
