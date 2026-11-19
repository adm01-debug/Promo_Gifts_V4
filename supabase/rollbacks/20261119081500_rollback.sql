-- Rollback: 20261119081500_elevenlabs_credential_reemissao
--
-- Remove o NOME da credencial criado pela reemissao. A guarda `secret_value = ''`
-- e deliberada: se alguem ja preencheu a chave em /admin/conexoes, esta reversao
-- NAO apaga o segredo — ela nao faz nada. Reverter so vale enquanto a linha esta
-- inerte, que e o estado em que a migration a cria.

DELETE FROM public.integration_credentials
WHERE secret_name = 'ELEVENLABS_API_KEY'
  AND secret_value = '';
