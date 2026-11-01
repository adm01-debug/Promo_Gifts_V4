-- AUTH-001: Limpeza de sessões expiradas (>30 dias)
-- Severidade: ALTO | Tipo: INTEGRIDADE/AUTH
-- Evidência: SELECT COUNT(*) FROM auth.sessions → 28.997 linhas para 39 usuários
--            Razão ~743:1 indicativa de acúmulo sem limpeza periódica.
-- Impacto: Tabela auth.sessions inflada degrada performance de autenticação.
-- Risco de regressão: baixo — remove apenas sessões com mais de 30 dias
--                    (considera refresh_token_rotation não habilitado).
-- ATENÇÃO: Usuários com sessão ativa criada há mais de 30 dias serão deslogados.

DELETE FROM auth.sessions
WHERE created_at < NOW() - INTERVAL '30 days';

-- Verificação pós-apply:
--   SELECT COUNT(*) FROM auth.sessions;
--   → deve ser significativamente menor que 28.997

-- ROLLBACK: Não há rollback — dados removidos. Backup/PITR para restauração se necessário.
