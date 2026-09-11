
-- ═══════════════════════════════════════════════════════════════════════
-- MIGRATION: verify_cf_uploads_xbz_batch_2026_07
-- Marca os 48 XBZ images que foram uploaded via CF MCP como 'verified'
-- e atualiza url_cdn para imagedelivery.net + primary_image_url nos produtos.
-- ═══════════════════════════════════════════════════════════════════════

-- Passo 1: Marcar todos os 48 uploads como verified
UPDATE product_images
SET
  cf_sync_status  = 'verified',
  url_cdn         = 'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/' || cloudflare_image_id || '/public',
  cf_uploaded_at  = '2026-07-09T16:22:10Z',
  cf_verified_at  = NOW(),
  cf_check_attempts = 1,
  updated_at      = NOW()
WHERE cloudflare_image_id IN (
  'xbz-caderno-ecologico-15972-1677696341',
  'xbz-mochila-poliester-34-litros-14107-1645816840',
  'xbz-agenda-2025-cromato-laranja-17022-1754063068',
  'xbz-agenda-2025-cromato-vermelho-17018-1727276616',
  'xbz-13190dt_lar',
  'xbz-bolsa-fibra-ecologica-marrom-claro-28900-1782404347',
  'xbz-13190b_lar',
  'xbz-bolsa-termica-25-litros-13124-1625662646',
  'xbz-agenda-diaria-2026-kraft-19860-1753472850',
  'xbz-sacola-tnt-metalizado-vermelho-28896-1782388973',
  'xbz-13429_dou',
  'xbz-agenda-2024-emborrachada-preto-17008-1692795574',
  'xbz-agenda-diaria-2025-amarelo-19831-1724440736',
  'xbz-chaveiro-metal-17939-1702566947',
  'xbz-kit-com-2-copos-de-vidro-18741-1710792434',
  'xbz-agenda-diaria-2026-kraft-19857-1753471887',
  'xbz-caneta-plastica-19160-1715860356-p13190l',
  'xbz-caneta-plastica-laranja-16054-1678986061',
  'xbz-porta-relogios-com-12-divisorias-preto-28956-1783356929',
  'xbz-copo-plastico-550ml-11609-1582118377',
  'xbz-mochila-de-nylon-7169-1519479609',
  'xbz-agenda-diaria-2026-kraft-20410-1754312555',
  'xbz-agenda-diaria-2026-kraft-20407-1754495797',
  'xbz-mochila-de-nylon-usb-20l-cinza-16603-1688396996',
  'xbz-agenda-diaria-2026-7873-1754923969',
  'xbz-agenda-diaria-2025-marrom-7899-1754922447',
  'xbz-caneta-plastica-laranja-5639-1494620510',
  'xbz-agenda-diaria-2025-vermelho-8635-1725016272',
  'xbz-agenda-diaria-2026-vermelho-8642-1754599209',
  'xbz-mala-esportiva-poliester-10615-1568655384',
  'xbz-agenda-couro-sintetico-2026-preto-12066-1754509796',
  'xbz-agenda-diaria-2026-wire-o-preto-12070-1754923037',
  'xbz-agenda-diaria-2026-wire-o-azul-13372-1754598685',
  'xbz-porta-relogios-com-6-divisorias-preto-28950-1783355086',
  'xbz-kit-escritorio-antibacteriano-branco-13692-1638473585',
  'xbz-mochila-poliester-22-litros-14086-1645630200',
  'xbz-mochila-poliester-23-litros-14090-1645644743',
  'xbz-agenda-diaria-2025-preto-16299-1725908143',
  'xbz-agenda-2025-emborrachada-vermelho-16987-1753791366',
  'xbz-agenda-diaria-2027-azul-19900-1783456405',
  'xbz-agenda-diaria-2026-marrom-24159-1753978551',
  'xbz-planner-permanente-emborrachado-preto-28913-1782831573',
  'xbz-caneta-metal-touch-laranja-28914-1782834912',
  'xbz-11933-lar-kit-post-it-com-caneta-983',
  'xbz-agenda-diaria-2026-preto-20399-1753356889',
  'xbz-porta-relogios-com-24-divisorias-preto-28917-1782842970',
  'xbz-caneta-plastica-vermelho-6585-1534181449',
  'xbz-porta-relogios-com-12-divisorias-preto-28953-1783355808'
)
AND cf_sync_status = 'pending';

-- Passo 2: Atualizar primary_image_url nos produtos cujas imagens primárias foram verified agora
UPDATE products p
SET
  primary_image_url = pi.url_cdn,
  updated_at        = NOW()
FROM product_images pi
WHERE pi.product_id       = p.id
  AND pi.is_primary       = true
  AND pi.cf_sync_status   = 'verified'
  AND pi.cf_verified_at  >= NOW() - INTERVAL '5 minutes'
  AND (
    p.primary_image_url IS NULL
    OR p.primary_image_url NOT LIKE '%imagedelivery.net%'
  );
;
