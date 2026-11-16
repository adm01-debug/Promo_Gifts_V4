# Auditoria do ledger de migrations — sha256 registrado × arquivo real

**Data:** 2026-11-16 · **`main` auditada:** `7dad78c4ce` · **Arquivo auditado:** `supabase/MIGRATIONS_SYNC_LOG.md` (1848 linhas)

## O que foi medido

Para cada linha do ledger que registra `version` + `sha256`, comparei o hash registrado com o
`sha256sum` do arquivo correspondente em `supabase/migrations/` na `main` de hoje.

| | |
| --- | --- |
| Linhas de recibo com `version` + `sha256` | **278** |
| Hash confere com o arquivo | **266** (95,7%) |
| Hash **não** confere | **12** |
| Arquivo ausente | 0 |
| Versions com **mais de um** sha256 no ledger | **1** (`20261031000000`) |

Os 266 acertos provam qual é a convenção do ledger: é o `sha256sum` do arquivo `.sql` cru, sem
normalização. Por isso as 12 divergências são divergências de fato, não diferença de método.

## As 12 divergências

| Version | Arquivo | sha256 no ledger | sha256 do arquivo hoje | Linha |
| --- | --- | --- | --- | --- |
| `20261022100001` | `20261022100001_security_fn_cron_guard_revoke_anon.sql` | `91404707c71551f6…` | `1bcf2515c3151f0e…` | ledger:956 |
| `20261022194000` | `20261022194000_security_revoke_external_connections_anon.sql` | `58785577281c32a9…` | `cf143e83a55fc4b7…` | ledger:963 |
| `20261022194100` | `20261022194100_security_revoke_mockup_approval_links_anon.sql` | `389601c24ab27be5…` | `44cf101355cc4e3f…` | ledger:964 |
| `20261022194200` | `20261022194200_security_revoke_mcp_kv_get_authenticated.sql` | `0685d1c62e3908de…` | `fda90b7ceff03b01…` | ledger:965 |
| `20261022195616` | `20261022195616_fix_update_company_fields_security_definer_search_path.sql` | `662fa38e1e09eed7…` | `29ce1ac3b06e1c52…` | ledger:989 |
| `20261022203935` | `20261022203935_update_company_fields_security_fix.sql` | `83558c38fda00255…` | `f03f1310d9a4309c…` | ledger:990 |
| `20261024163500` | `20261024163500_fix_audit_security_definer_acl_regrole_cast.sql` | `7345f667cddc4f12…` | `3e02ba6695da7403…` | ledger:966 |
| `20261024180002` | `20261024180002_workspace_notifications_idempotency_p08.sql` | `84ca72d9da2c14b8…` | `29d0a0fedf75017f…` | ledger:968 |
| `20261024190001` | `20261024190001_cron_auth_p01_image_dimensions_backfill.sql` | `eb5c03f7d8f69029…` | `81ef2580d3fdbce8…` | ledger:970 |
| `20261031000000` | `20261031000000_create_stock_notes.sql` | `209ba7abacce4f1c…` | `fa2248e97543b5fc…` | ledger:972 |
| `20261031000000` | `20261031000000_create_stock_notes.sql` | `92dcc8ed708bc593…` | `fa2248e97543b5fc…` | ledger:1002 |
| `20261107180000` | `20261107180000_security_fix_suppliers_authenticated_credential_leak_v2.sql` | `ad43364e7897bf5c…` | `d10d9af07075b38a…` | ledger:1133 |

`20261031000000` aparece **duas vezes**, com dois hashes diferentes (`209ba7ab…` na linha 972 e
`92dcc8ed…` na linha 1002), e **nenhum dos dois** é o hash do arquivo (`fa2248e9…`).

## O que isto significa — e o que NÃO significa

**Não é um furo de segurança aberto.** Oito das doze são migrations de segurança. Conferi o efeito
de quatro delas direto no banco de produção (`doufsxqlfjyuvxuezpln`, consulta somente leitura,
2026-11-16):

| Verificação em produção | Resultado |
| --- | --- |
| `anon` ainda escreve em `external_connections`? | **não** (INSERT/UPDATE/DELETE = false) |
| `anon` ainda lê ou escreve em `mockup_approval_links`? | **não** |
| `authenticated` ainda faz `SELECT` na tabela `suppliers` inteira? | **não** |
| `anon` ainda faz `SELECT` na tabela `suppliers` inteira? | **não** |
| `public.stock_notes` existe? | **sim** |

Ou seja: o efeito pretendido por essas migrations está valendo em produção.

**É um furo na prova.** O ledger existe para responder "qual SQL exatamente foi aplicado neste
banco". Para estas 12 ele não responde: o hash registrado não é o do arquivo que está no
repositório. Então, para estas 12 migrations, ninguém pode afirmar por evidência que o arquivo
versionado é o que rodou em produção — só que o resultado parece o esperado.

**Causa mais provável:** o arquivo foi editado DEPOIS de aplicado, sem reemitir o recibo. Esse
padrão já está registrado no próprio ledger em outro caso ("Hash recalculado após corrigir a
assinatura `fn_hex_to_rgb(text)` → `fn_hex_to_rgb()`"). Não foi possível provar isso para cada uma
das 12 a partir do repositório: **NÃO VERIFICADO**, porque o histórico de cada arquivo precisaria
ser cruzado com a data de cada run, e três das runs citadas já não existem mais no Actions.

## Por que nenhum portão pegou isto

`scripts/check-migration-receipts.mjs` (Gate 1.13.3) verifica se existe recibo para migrations
aplicadas há mais de 24 h. Ele **não** compara o hash do recibo com o arquivo. Nenhum outro script
em `scripts/check-*` faz essa comparação — é o que permitiu as 12 divergências passarem.

## O que fazer (fora do escopo desta PR)

1. Decidir, para cada uma das 12, qual é a verdade: reemitir o recibo com o hash do arquivo atual,
   ou restaurar o arquivo para a versão que foi aplicada. Isso é decisão do dono, porque muda o que
   o repositório afirma sobre produção.
2. Acrescentar ao Gate 1.13.3 (ou a um gate novo) a comparação `sha256` do recibo × arquivo, para a
   divergência número 13 não acontecer em silêncio.
3. Resolver a duplicidade de `20261031000000`.

## Reprodução

```bash
git show origin/main:supabase/MIGRATIONS_SYNC_LOG.md > /tmp/led.md
python3 - <<'PY'
import re, hashlib, glob
led = open('/tmp/led.md', encoding='utf-8').read().split('\n')
for i, l in enumerate(led, 1):
    m = re.match(r'^\|\s*`(\d{14})`\s*\|\s*`?([0-9a-f]{64})`?\s*\|', l)
    if not m:
        continue
    v, h = m.group(1), m.group(2)
    fs = sorted(glob.glob(f'supabase/migrations/{v}_*.sql'))
    if not fs:
        continue
    real = hashlib.sha256(open(fs[0], 'rb').read()).hexdigest()
    if real != h:
        print(f'{v} ledger={h[:12]} arquivo={real[:12]} linha={i}')
PY
```
