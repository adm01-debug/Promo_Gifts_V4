UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  COALESCE(opcoes_modificadores, '{}'::jsonb),
  '{regra_anti_paradoxo}',
  '"MAX_ENTRE_FAIXAS"'::jsonb,
  true
),
updated_at = NOW()
WHERE ativo = true
  AND (
    opcoes_modificadores IS NULL
    OR opcoes_modificadores->>'regra_anti_paradoxo' IS NULL
  );
