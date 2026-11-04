-- Reset cirúrgico: apenas comercial01 para teste
-- Senha alvo: @Promobrindes2021
-- Reversível: troca no próximo login

UPDATE auth.users 
SET 
  encrypted_password = crypt('@Promobrindes2021', gen_salt('bf')),
  updated_at = now()
WHERE email = 'comercial01@promobrindes.com.br';
