
-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: add_check_constraint_categories_image_url_format
-- Objetivo: Garantir que qualquer valor gravado em image_url
--           seja uma URL válida do Cloudflare Images (imagedelivery.net).
--           NULLs são aceitos (coluna é nullable).
--
-- Padrão aceito:
--   ^https://imagedelivery\.net/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$
--   │       │                   │account hash │  │image id   │  │variant    │
--
-- Exemplos VÁLIDOS:
--   https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/cat-bar_e_cozinha/public
--   https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/cat-tecnologia-eletronicos/thumbnail
--
-- Exemplos INVÁLIDOS (serão rejeitados):
--   https://cdn.outrodomain.com/imagem.jpg   → domínio errado
--   https://imagedelivery.net/sem-slug       → segmentos insuficientes
--   texto qualquer                           → não é URL válida
--   '' (string vazia)                        → não é URL válida
--
-- Pré-validação: 27/27 registros existentes passam (simulação S-14 = ✅)
-- Autor: Sistema — 2026-06-23
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.categories
  ADD CONSTRAINT chk_categories_image_url_format
  CHECK (
    -- NULL é permitido (coluna nullable)
    -- Postgres não dispara CHECK para NULL (avalia como UNKNOWN = ok)
    -- Mas explicitamos para legibilidade e segurança
    image_url IS NULL
    OR (
      -- Deve começar com https (sem http inseguro)
      -- Deve ser do domínio imagedelivery.net (Cloudflare Images exclusivamente)
      -- Deve ter exatamente 3 segmentos de path: /account/image_id/variant
      -- Cada segmento: apenas letras, números, underscores e hífens
      image_url ~ '^https://imagedelivery\.net/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$'
    )
  );

-- Documentar a constraint para clareza no schema
COMMENT ON CONSTRAINT chk_categories_image_url_format ON public.categories IS
'Garante que image_url seja uma URL válida do Cloudflare Images (imagedelivery.net) com 3 segmentos de path (account/image_id/variant), ou NULL. Criado em 2026-06-23.';
;
