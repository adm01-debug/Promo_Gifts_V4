-- Snapshot in-database para rollback rápido caso algo dê errado
CREATE TABLE IF NOT EXISTS _backup_20260425_tabela_preco_gravacao_oficial AS
SELECT * FROM tabela_preco_gravacao_oficial;

CREATE TABLE IF NOT EXISTS _backup_20260425_tabela_preco_gravacao_oficial_faixa AS
SELECT * FROM tabela_preco_gravacao_oficial_faixa;

CREATE TABLE IF NOT EXISTS _backup_20260425_tecnicas_gravacao AS
SELECT * FROM tecnicas_gravacao;

COMMENT ON TABLE _backup_20260425_tabela_preco_gravacao_oficial IS
  'Snapshot pré-execução plano de correções 25-abr-2026. Drop após 30 dias se tudo estável.';
COMMENT ON TABLE _backup_20260425_tabela_preco_gravacao_oficial_faixa IS
  'Snapshot pré-execução plano de correções 25-abr-2026. Drop após 30 dias se tudo estável.';
COMMENT ON TABLE _backup_20260425_tecnicas_gravacao IS
  'Snapshot pré-execução plano de correções 25-abr-2026. Drop após 30 dias se tudo estável.';
