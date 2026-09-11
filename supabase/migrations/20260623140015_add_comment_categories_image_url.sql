
-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: add_comment_categories_image_url
-- Objetivo: Documentar o contrato da coluna image_url em categories
--           para que qualquer dev entenda o padrão, o provedor CDN,
--           o naming convention e as regras de negócio vigentes.
--
-- Autor  : Sistema — parte da série de melhorias 2026-06-23
-- ═══════════════════════════════════════════════════════════════

COMMENT ON COLUMN public.categories.image_url IS
'URL pública da imagem de capa da categoria, servida pelo Cloudflare Images CDN.

PADRÃO CANÔNICO (naming convention obrigatório para novas imagens):
  https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/cat-{slug}/public

COMPONENTES DA URL:
  • Account hash : vKMs9Ow8bA_enuhLXZ2HAw  (ID fixo da conta CF da Promo Brindes)
  • Image ID     : cat-{slug}               (prefixo "cat-" + slug da categoria)
  • Variant      : public                   (entrega pública sem autenticação)

ESCOPO ATUAL (2026-06-23):
  • Apenas categorias level=1 (raiz/parent_id IS NULL) têm image_url preenchido.
  • Level 2-5: intencionalmente NULL (navegação secundária sem imagem de capa).
  • Cobertura: 26/26 categorias raiz ativas (100%).

REGRAS DE NEGÓCIO:
  • Para fazer upload da imagem no Cloudflare Images, o image_id DEVE ser "cat-{slug}".
  • Se o slug mudar, a imagem no Cloudflare NÃO é renomeada automaticamente —
    apenas o registro no banco é atualizado pelo trigger
    trg_sync_image_url_on_slug_update (criado em 2026-06-23).
  • URLs fora do padrão canônico (customizadas) são aceitas e preservadas pelo trigger.
  • Formato validado pelo CHECK constraint: chk_categories_image_url_format
    (padrão: ^https://imagedelivery\.net/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$).

CONSUMERS ATIVOS:
  • RPC  get_root_categories()            → menu principal / home do catálogo
  • RPC  get_category_with_children()     → página de listagem de categoria
  • VIEW vw_sitemap_categories            → sitemap XML (SEO / Google Image Search)
  • VIEW vw_sitemap_all                   → união de sitemaps
  • VIEW vw_category_completeness         → score de completude (15 pontos)

ATENÇÃO: O campo é nullable. Não adicionar URL se a imagem não existir no CF —
a URL seria válida no banco mas geraria 404 no CDN.';
;
