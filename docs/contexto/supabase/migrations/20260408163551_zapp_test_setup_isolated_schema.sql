-- Limpa qualquer execução anterior (idempotente)
DROP SCHEMA IF EXISTS zapp_test CASCADE;

-- Cria schema isolado de teste
CREATE SCHEMA zapp_test;

-- Tabela de usuários fake pra simular auth.users (já que não temos JWT real)
CREATE TABLE zapp_test.fake_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT NULL
);

-- Insere atendentes fictícios
INSERT INTO zapp_test.fake_users (id, email, full_name, department) VALUES
  ('11111111-1111-1111-1111-111111111111', 'joao.vendedor@promo.test', 'João Vendedor',     'vendas'),
  ('22222222-2222-2222-2222-222222222222', 'maria.financ@promo.test',  'Maria Financeiro',  'financeiro'),
  ('33333333-3333-3333-3333-333333333333', 'pedro.financ@promo.test',  'Pedro Financeiro',  'financeiro'),
  ('44444444-4444-4444-4444-444444444444', 'ana.suporte@promo.test',   'Ana Suporte',       'suporte'),
  ('55555555-5555-5555-5555-555555555555', 'carlos.vend@promo.test',   'Carlos Vendedor',   'vendas');

SELECT 'Schema zapp_test criado com 5 usuários fake' AS status;
