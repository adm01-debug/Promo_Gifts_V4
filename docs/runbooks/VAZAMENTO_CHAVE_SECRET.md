# Runbook — Vazamento de chave/secret (ex.: credencial em `COMMENT ON`, código ou log)

Projeto Gold SSOT: `doufsxqlfjyuvxuezpln`.

Criado no incidente 2026-10-13 (Fase 9, etapa 99) — caso real que motivou
este runbook: token Cloudflare Stream (`cfat_...`) exposto em texto claro no
`COMMENT ON TABLE public.video_import_queue` desde ~2026-06-07, encontrado e
sanitizado na migration
`20261013120000_incidente20261013_fase5_permissoes_auditoria.sql` (etapa 60).

## Sintomas / onde procurar

```sql
-- Comentários de objetos do banco (tabelas, funções, colunas) — vazamento
-- mais comum neste projeto, porque comentários costumam documentar
-- integrações externas com exemplos "reais".
SELECT objoid::regclass AS obj, objsubid, description
FROM pg_description
WHERE description ILIKE '%token%' OR description ILIKE '%secret%'
   OR description ILIKE '%api_key%' OR description ILIKE '%password%'
   OR description ~ '[A-Za-z0-9_-]{20,}'; -- strings longas suspeitas

-- Dentro do repositório (código/docs versionados)
-- rodar localmente, fora do SQL:
--   git grep -nE '(cfat_|sk-|AIza|xox[baprs]-|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
```

Também checar: `edge_function_invocations.request_metadata` (não deveria ter
headers de auth — se tiver, é vazamento ativo contínuo, prioridade máxima),
e logs de erro (`query_telemetry.error_message`, `postgres_logs` via MCP
`query_logs`) que às vezes incluem a URL completa com querystring.

## Contenção imediata

1. **Não** espalhar o segredo achado em mais lugares (não colar em issue
   pública, não colar em chat sem necessidade, não deixar em arquivo de
   migration novo — como foi feito corretamente na etapa 60: o `COMMENT ON`
   novo documenta *que havia* um token exposto, sem repetir o valor).
2. Sanitizar o local do vazamento imediatamente:
   - `COMMENT ON TABLE/COLUMN/FUNCTION ... IS '<texto sem credencial>'`
   - Se for código: remover do arquivo e, se já foi commitado, tratar como
     comprometido mesmo após remover (histórico do git ainda tem o valor —
     ver `git log -p -- <arquivo>`; reescrever histórico é uma decisão do PO,
     não uma ação automática desta sessão).
3. **Rotação do segredo em si é sempre decisão/execução do PO ou de quem tem
   acesso ao provedor externo** (Cloudflare, Bitrix, etc.) — uma sessão
   automatizada documenta a pendência, não rotaciona credencial de serviço
   externo por conta própria.
4. Se o segredo vive no Supabase Vault (`vault.secrets`/
   `integration_credentials`), confirmar quem tem `SELECT`:
   ```sql
   SELECT grantee, privilege_type FROM information_schema.role_table_grants
   WHERE table_schema='vault' AND table_name='decrypted_secrets';
   ```
   Deve ser vazio/apenas `service_role`/`postgres` — nunca `authenticated`/`anon`.

## Depois da rotação (quando o PO confirmar que rotacionou)

- Atualizar o secret no Vault/`integration_credentials` com o novo valor.
- Confirmar em `secret_rotation_log` que o evento foi registrado (a tabela
  já tem RLS que bloqueia INSERT direto via JWT — o registro deve vir de uma
  função/edge function de rotação, não de um INSERT manual).
- Revisar se o token antigo aparece em outro lugar do schema:
  ```sql
  SELECT objoid::regclass, description FROM pg_description
  WHERE description ILIKE '%<prefixo_do_token_antigo>%';
  ```

## Não faça

- Não tente "testar" se o segredo vazado ainda funciona contra o serviço
  externo — isso usa a credencial comprometida.
- Não rotacione uma credencial de serviço externo (Cloudflare, Bitrix, n8n)
  a partir de uma sessão automatizada sem aprovação explícita do PO — fora
  do escopo de DDL/infraestrutura interna do Supabase.
