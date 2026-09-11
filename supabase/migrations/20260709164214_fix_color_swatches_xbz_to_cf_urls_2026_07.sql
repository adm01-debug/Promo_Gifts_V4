
-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: fix_color_swatches_xbz_to_cf_urls_2026_07
-- Substitui todas as URLs XBZ CDN nos color_swatches por URLs CF.
-- Usa tabela de mapeamento para substituição segura e idempotente.
-- ═══════════════════════════════════════════════════════════════════════

-- Tabela temporária com mapeamento XBZ → CF
CREATE TEMP TABLE swatch_url_map (xbz_url text, cf_url text) ON COMMIT DROP;

INSERT INTO swatch_url_map VALUES
('https://cdn.xbzbrindes.com.br/img/produtos/3/13190B_LAR.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-13190b_lar/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-2024-Emborrachada-VERMELHO-17010-1692795604.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-2024-emborrachada-vermelho-17010-1692795604/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-2025-Cromato-LARANJA-17022-1754063068.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-2025-cromato-laranja-17022-1754063068/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-2025-Cromato-VERMELHO-17018-1727276616.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-2025-cromato-vermelho-17018-1727276616/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-2026-Cromato-CINZA-16990-1753116083.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-2026-cromato-cinza-16990-1753116083/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Couro-Sintetico-2026-PRETO-12066-1754509796.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-couro-sintetico-2026-preto-12066-1754509796/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Diaria-2025-AMARELO-19831-1724440736.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2025-amarelo-19831-1724440736/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Diaria-2025-MARROM-7899-1754922447.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2025-marrom-7899-1754922447/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Diaria-2025-PRETO-16299-1725908143.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2025-preto-16299-1725908143/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Diaria-2025-VERMELHO-8635-1725016272.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2025-vermelho-8635-1725016272/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Diaria-2026-7873-1754923969.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2026-7873-1754923969/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Diaria-2026-MARROM-24159-1753978551.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2026-marrom-24159-1753978551/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Diaria-2026-VERMELHO-8642-1754599209.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2026-vermelho-8642-1754599209/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-diaria-2026-Wire-o-AZUL-13372-1754598685.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2026-wire-o-azul-13372-1754598685/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Agenda-Diaria-2026-Wire-o-PRETO-12070-1754923037.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-agenda-diaria-2026-wire-o-preto-12070-1754923037/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Base-para-Calendario-Aluminio-PRATA-14757-1658425297.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-base-para-calendario-aluminio-prata-14757-1658425297/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Bloco-de-Anotacoes-em-Couro-Sintetico-e-Porta-Caneta-CINZA-18749-1710793147.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-bloco-de-anotacoes-em-couro-sintetico-e-porta-caneta-cinza-18749-1710793147/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Caneta-de-Metal-com-Estojo-plastico-13096d3-1697633906.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-caneta-de-metal-com-estojo-plastico-13096d3-1697633906/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Caneta-Ecologica-Papelao-AMARELO-3623-1486985345.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-caneta-ecologica-papelao-amarelo-3623-1486985345/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Caneta-Metal-Touch-LARANJA-28914-1782834912.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-caneta-metal-touch-laranja-28914-1782834912/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Caneta-Plastica-AMARELO-5641-1494620520.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-caneta-plastica-amarelo-5641-1494620520/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Caneta-Plastica-VERDE-ESCURO-21494-1731007573.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-caneta-plastica-verde-escuro-21494-1731007573/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Caneta-Semi-Metal-6158d1-1500043652.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-caneta-semi-metal-6158d1-1500043652/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Conjunto-Caneta-e-Lapiseira-Metal-COURO-20965-1727722446.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-conjunto-caneta-e-lapiseira-metal-couro-20965-1727722446/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Copo-Plastico-550ml-26113d2-1762266022.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-copo-plastico-550ml-26113d2-1762266022/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Copo-Termico-Inox-800ml-20327d2-1742478592.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-copo-termico-inox-800ml-20327d2-1742478592/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Garrafa-Plastica-750ml-17687-26412d1-1764089441.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-garrafa-plastica-750ml-17687-26412d1-1764089441/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Garrafa-Termica-350ml-20626-1726751346.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-garrafa-termica-350ml-20626-1726751346/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Garrafa-Termica-500ml-CINZA-15176-1667242034.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-garrafa-termica-500ml-cinza-15176-1667242034/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Garrafa-Termica-Com-Alca-800ml-22945-1744892008.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-garrafa-termica-com-alca-800ml-22945-1744892008/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Mini-Pen-Drive-4GB-Giratorio-3239-1480774667.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-mini-pen-drive-4gb-giratorio-3239-1480774667/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Mochila-de-Nylon-USB-17L-CINZA-14097-1648123986.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-mochila-de-nylon-usb-17l-cinza-14097-1648123986/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Necessaire-PU-26160-1762862478.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-necessaire-pu-26160-1762862478/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Pacote-com-Caneta-Plastica-21781-1733518612.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-pacote-com-caneta-plastica-21781-1733518612/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Pacote-com-Caneta-Plastica-PRATA-24049-1753796872.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-pacote-com-caneta-plastica-prata-24049-1753796872/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Pacote-com-Caneta-Plastica-Touch-21775-1733517921.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-pacote-com-caneta-plastica-touch-21775-1733517921/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Pasta-Convencao-CINZA-13403-1630949686.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-pasta-convencao-cinza-13403-1630949686/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Pasta-Convencao-com-Porta-Caneta-PRETO-16790-1690201847.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-pasta-convencao-com-porta-caneta-preto-16790-1690201847/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Pasta-Executiva-para-Notebook-15-Polegadas-CINZA-14603-1722952868.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-pasta-executiva-para-notebook-15-polegadas-cinza-14603-1722952868/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Pen-Drive-Round-8GB-7557-1525115193.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-pen-drive-round-8gb-7557-1525115193/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Porta-Relogios-com-12-Divisorias-PRETO-28956-1783356929.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-porta-relogios-com-12-divisorias-preto-28956-1783356929/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Sacola-TNT-Metalizado-VERMELHO-28896-1782388973.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-sacola-tnt-metalizado-vermelho-28896-1782388973/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Suporte-Plastico-para-Celular-7258-1520345691.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-suporte-plastico-para-celular-7258-1520345691/public'),
('https://cdn.xbzbrindes.com.br/img/produtos/3/Suporte-Plastico-para-Celular-AMARELO-7260-1520345769.jpg',
 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-swatch-suporte-plastico-para-celular-amarelo-7260-1520345769/public');

-- UPDATE JSONB: substitui image_url XBZ → CF para todos os produtos afetados
UPDATE products p
SET
  color_swatches = (
    SELECT jsonb_agg(
      CASE
        WHEN m.cf_url IS NOT NULL
        THEN cs || jsonb_build_object('image_url', m.cf_url)
        ELSE cs
      END
      ORDER BY (cs->>'color_name'), (cs->>'image_url')
    )
    FROM jsonb_array_elements(p.color_swatches) cs
    LEFT JOIN swatch_url_map m ON m.xbz_url = cs->>'image_url'
  ),
  updated_at = NOW()
WHERE p.is_active = true
  AND p.color_swatches::text LIKE '%cdn.xbzbrindes.com.br%'
  AND jsonb_typeof(p.color_swatches) = 'array';
;
