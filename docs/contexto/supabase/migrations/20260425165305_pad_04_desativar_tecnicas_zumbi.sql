UPDATE tecnicas_gravacao
SET ativo = false,
    updated_at = NOW()
WHERE codigo IN (
  'LASER_UV', 'FILME_RECORTE', 'ADESIVO',
  'DECALQUE', 'HOT_STAMPING', 'HEAT_TRANSFER',
  'EMBORRACHADO', 'ETIQUETA'
)
AND NOT EXISTS (
  SELECT 1 FROM tabela_preco_gravacao_oficial
  WHERE grupo_tecnica = tecnicas_gravacao.codigo AND ativo = true
);
