
-- Correção T34: a tabela tem 16 colunas (documentação dizia 19 mas era de attribute_equivalences)
-- Está correta — o teste tinha número errado. Ajuste cosmético no teste, não na tabela.

-- Correção T41 WARN: 2 produtos têxteis SPOT com CombinedSizes = tamanhos (não dimensão)
-- Renomear attribute_key de 'dimensoes' para 'tamanhos' nesses casos
UPDATE product_attributes
SET attribute_key = 'tamanhos',
    is_filterable = true,
    updated_at = now()
WHERE attribute_key = 'dimensoes'
  AND attribute_value ILIKE '%Tamanhos:%';
;
