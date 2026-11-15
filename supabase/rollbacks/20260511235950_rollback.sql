-- Rollback de 20260511235950 (ESPELHO): a coluna já existia em produção antes desta migration e é usada
-- por views/bootstrap (20260512000000). Remover a coluna NÃO é um rollback seguro: esta
-- migration só registra drift (repair-only). Nada a desfazer.
SELECT 1;
