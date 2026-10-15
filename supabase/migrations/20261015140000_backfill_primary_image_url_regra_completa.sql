-- Backfill de products.primary_image_url com a regra completa (follow-up B2 do incidente 2026-10-13)
--
-- Rollback: restaurar os 11 valores antigos exatos com o UPDATE … FROM (VALUES …) comentado no
--   bloco "ROLLBACK" no fim deste arquivo (id → valor antigo, capturados read-only em 2026-10-15).
--   Não há DDL nesta migration; o rollback é só de dados.
--
-- APLICAR DEPOIS de 20261013180000 (DROP de trg_sync_primary_image_url / fn_sync_primary_image_url).
-- Enquanto aquele trigger existir, um UPDATE em product_images que lista is_primary/is_active/url_cdn
-- sem mudar valor volta a gravar a regra simplificada e reabre a divergência corrigida aqui.
--
-- Contexto: fn_sync_product_images_to_products() (triggers trg_sync_product_images e
-- trg_sync_product_images_update em product_images) calcula primary_image_url com a regra
-- completa: só imagens ativas, exclui image_type box/pouch/location/area/component e ordena por
-- main+primary, main, gallery/product+primary, gallery/product, ambient, set+primary, set, logo,
-- depois is_primary DESC, display_order ASC NULLS LAST. O trigger antigo trg_sync_primary_image_url
-- (regra simplificada) era o único a disparar em UPDATEs que não mudavam valor, e deixou produtos
-- com primary_image_url fora da regra completa.
--
-- Medição read-only em produção (doufsxqlfjyuvxuezpln), 2026-10-15:
--   - 411 produtos com primary_image_url IS DISTINCT FROM <regra completa>;
--   - 11 deles têm ao menos 1 product_image ativa → alvo desta migration (todos is_active = true;
--     em todos o valor calculado é uma imagem 'main', não nulo, sem empate no ORDER BY);
--   - 400 não têm nenhuma product_image → ficam de fora (a regra daria NULL e apagaria a URL atual);
--   - 0 têm só imagens inativas.
--   O SELECT equivalente ao UPDATE abaixo retornou exatamente esses 11 ids.
--
-- Escopo: só primary_image_url. images, og_image_url e primary_image_fallback_url não são tocados.
-- updated_at fica a cargo do trigger set_updated_at_trigger.
--
-- app.write_source = 'pipeline' (SET LOCAL, só nesta transação): fn_products_capture_manual_edits
-- (trg_aa_capture_manual_edits) trataria o backfill como edição manual e acrescentaria
-- primary_image_url a locked_fields. Nos 11 alvos o campo já está em locked_fields (conferido em
-- 2026-10-15), então locked_fields não muda de qualquer forma; o set_config só deixa isso explícito.
--
-- Idempotente: o WHERE exige valor diferente do calculado, então reaplicar atualiza 0 linhas.

-- Falha rápido (1s) se o lock de linha não vier, em vez de enfileirar atrás de escritas em products.
SET LOCAL lock_timeout = '1s';

SELECT set_config('app.write_source', 'pipeline', true);

UPDATE public.products p
SET primary_image_url = (
  SELECT pi.url_cdn
  FROM public.product_images pi
  WHERE pi.product_id = p.id AND pi.is_active = true
    AND pi.image_type NOT IN ('box','pouch','location','area','component')
  ORDER BY
    CASE
      WHEN pi.image_type = 'main'    AND pi.is_primary = true  THEN 0
      WHEN pi.image_type = 'main'                              THEN 1
      WHEN pi.image_type IN ('gallery','product') AND pi.is_primary = true THEN 2
      WHEN pi.image_type IN ('gallery','product')              THEN 3
      WHEN pi.image_type = 'ambient'                           THEN 4
      WHEN pi.image_type = 'set'    AND pi.is_primary = true   THEN 5
      WHEN pi.image_type = 'set'                               THEN 6
      WHEN pi.image_type = 'logo'                              THEN 7
      ELSE 9
    END,
    pi.is_primary DESC,
    pi.display_order ASC NULLS LAST
  LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM public.product_images pa
    WHERE pa.product_id = p.id AND pa.is_active = true
  )
  AND p.primary_image_url IS DISTINCT FROM (
    SELECT pi.url_cdn
    FROM public.product_images pi
    WHERE pi.product_id = p.id AND pi.is_active = true
      AND pi.image_type NOT IN ('box','pouch','location','area','component')
    ORDER BY
      CASE
        WHEN pi.image_type = 'main'    AND pi.is_primary = true  THEN 0
        WHEN pi.image_type = 'main'                              THEN 1
        WHEN pi.image_type IN ('gallery','product') AND pi.is_primary = true THEN 2
        WHEN pi.image_type IN ('gallery','product')              THEN 3
        WHEN pi.image_type = 'ambient'                           THEN 4
        WHEN pi.image_type = 'set'    AND pi.is_primary = true   THEN 5
        WHEN pi.image_type = 'set'                               THEN 6
        WHEN pi.image_type = 'logo'                              THEN 7
        ELSE 9
      END,
      pi.is_primary DESC,
      pi.display_order ASC NULLS LAST
    LIMIT 1
  );

-- ROLLBACK (não executar junto com a migration; rodar numa transação própria):
-- Restaura o valor antigo exato só onde o valor ainda é o gravado por esta migration
-- (não sobrescreve mudanças legítimas posteriores feitas pelo trigger de sync).
--
-- SET LOCAL lock_timeout = '1s';
-- SELECT set_config('app.write_source', 'pipeline', true);
-- UPDATE public.products p
-- SET primary_image_url = v.valor_antigo
-- FROM (VALUES
--   ('022d1feb-b0e0-4b60-a1d6-ddf1c72e9606'::uuid, -- sku 00055-4GB
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-00055-14235/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-000554gb-0554gbpred2jpg/public'),
--   ('1038bfaa-8fca-4ef9-b518-8cdd57b59713'::uuid, -- sku 14413
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-caderno-com-autoadesivo-11589d2-1582123186/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-caderno-c-autoadesivo-azul-11591-1582117137/public'),
--   ('1164a3e5-65b4-4cfb-8339-436d9fbcfcbb'::uuid, -- sku 18717
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-porta-joias-16688d2-1690475198/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-porta-joias-verde-16692-1690475156/public'),
--   ('46372dda-79a1-47f7-a5ff-aa33bdc7da7e'::uuid, -- sku 15022
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-oculos-de-sol-plastico-19163d2-1715861041/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-oculos-de-sol-plastico-amarelo-19164-1715860883/public'),
--   ('48fce784-863f-42e9-ba2d-6f6b76551da4'::uuid, -- sku 18736
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-porta-garrafa-tnt-18025d2-1706883235/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-porta-garrafa-tnt-vermelho-18300-1706883162/public'),
--   ('641bf3f8-b097-47f6-8048-f30d4c7c6450'::uuid, -- sku 08053
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-08053-02/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-sacola-plastica-laranja-20575-1728071758/public'),
--   ('a4b5d872-2420-499e-9c3d-7d2aff2b12c4'::uuid, -- sku 18650
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-necessaire-pu-impermeavel-14120d2-1648136152/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-18650-14145/public'),
--   ('a56adc69-3243-49c3-9319-f4b853c22911'::uuid, -- sku 05026
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-porta-copo-ou-garrafa-isotermica-esportiva-15690d2-1675340728/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-porta-copo-ou-garrafa-isotermica-esportiva-vinho-15693-1674489947/public'),
--   ('effb8581-0f4e-4762-affd-9e272c31ff6c'::uuid, -- sku 18647M
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-necessaire-pvc-impermeavel-14117d2-1648131471/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-necessaire-pvc-impermeavel-rosa-claro-14163-1648132966/public'),
--   ('f36b4ad7-d893-444d-a830-f205e264e4c3'::uuid, -- sku 18560
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-saca-rolhas-11425d2-1579278305/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-saca-rolhas-eletrico-com-led-preto-11427-1618242604/public'),
--   ('ff48acfc-242c-4c78-a07c-4bdd6e471ed5'::uuid, -- sku 12480
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-kit-viagem-com-3-pecas-1795d2-1633017886/public',
--    'https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/xbz-kit-viagem-preto-1798d2-1480507798/public')
-- ) AS v(id, valor_antigo, valor_novo)
-- WHERE p.id = v.id
--   AND p.primary_image_url IS NOT DISTINCT FROM v.valor_novo;
