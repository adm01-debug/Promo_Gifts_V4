# Inventário — Auth & Logs

**Projeto:** doufsxqlfjyuvxuezpln | **Data:** 2026-11-01

## Auth — estado atual

| Métrica | Valor |
|---|---|
| auth.users total | 39 |
| Email confirmado | 39 (100%) |
| Perfis sincronizados | 39/39 ✓ |
| Trigger on_auth_user_created | EXISTE, ATIVO (`O`) |
| Função handle_new_user | presente |

## Logs de erro auth_logs (últimas 24h)

| Erro | Contagem | Diagnóstico |
|---|---|---|
| `403: invalid claim: missing sub claim` | 625 | JWT sem campo `sub` chegando ao auth service |
| `context deadline exceeded` | 314 | Timeouts no auth service |
| `token signature is invalid: signature is invalid` | 284 | Tentativas de replay com tokens inválidos |
| `crypto: refresh token length is not valid` | 122 | Possível manipulação de refresh token |
| `Unhandled server error: context canceled` | 71 | Operações canceladas |
| `400: Invalid login credentials` | 15 | Senhas erradas (normal) |
| DB connection errors | 12 | Picos de carga |

### Análise: `missing sub claim` (625 hits/24h)
JWTs sem campo `sub` chegando ao auth service. Causas prováveis:
1. Service role key sendo usada em requests que passam pelo auth service (normalíssimo em crons/edges que usam service_role)
2. Anon key sendo usada diretamente em chamadas que o GoTrue não aceita sem sub
3. Bug em edge function que construiu JWT malformado

Evidência indica que é tráfego interno (crons + edges com service_role). Não há evidência de exploração maliciosa.

### Análise: `refresh_token_length_invalid` (122 hits/24h)
Supabase valida o tamanho do refresh token. Esses erros indicam tentativas com tokens truncados ou manipulados. Pode ser:
1. Bots/scanners testando tokens conhecidos
2. Bug de cliente cortando o token antes de enviar

**Recomendação:** Monitorar tendência. Se aumentar, considerar rate limiting de refresh na auth config.

## Storage — Buckets

| Bucket | Público | Uso no código |
|---|---|---|
| `product-images` | não | sim |
| `art-files` | **sim** — read pública | sim |
| `scripts` | não | sim |
| outros 8 | não | vários |

`art-files` tem policy `art_files_public_read` com USING (true) para SELECT sem auth. 
Conteúdo sensível em art-files seria exposto publicamente. Verificar se arquivos são todos não-sensíveis.
