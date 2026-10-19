# E24 — Higiene de Credenciais (2026-09-16)

Etapa `[RO]` do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 489–496).
Objetivo: provar que nenhum cron job **vivo** hoje tem segredo em texto plano, e que
o achado do `docs/SCHEMA_REFERENCE.md` §7 (prompt `CANONICAL_DB_CREATION_PROMPT`, não
executado) não tem equivalente real no banco de produção `doufsxqlfjyuvxuezpln`.

Método: auditoria via `pg_catalog`/`cron.job` (MCP Supabase, read-only), nunca PostgREST —
conforme REGRA #8 do `CLAUDE.md`. Nenhum segredo é reproduzido neste documento.

---

## 1. `cron.job` — segredo literal em jobs vivos

Query executada (read-only, `mcp__supabase__execute_sql`):

```sql
SELECT jobid, jobname, command
FROM cron.job
WHERE command ~* 'apikey|bearer|eyJ|service_role';
```

**Resultado:** 2 linhas — `generate-blurhashes` (jobid 242) e `hash-product-images`
(jobid 243). Em ambas, o header `Authorization` é montado com
`'Bearer ' || public.get_edge_anon_key()` — uma **chamada de função** que lê o segredo
do vault em runtime, não um literal. Nenhuma das duas linhas contém uma chave/JWT
em texto plano.

**Conclusão: 0 cron jobs com segredo literal no `cron.job` atual.**

Verificação adicional (fora do escopo estrito do checklist, feita por completude):
o job `connections-auto-test` (jobid 211) — que é justamente o job que teve uma chave
hardcoded no passado (ver §2) — foi consultado diretamente:

```sql
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname ILIKE '%connections-auto-test%';
```

Hoje ele usa `url := 'https://doufsxqlfjyuvxuezpln.supabase.co/...'` (URL canônica correta)
e `'x-cron-secret', public.get_edge_function_secret('CRON_SECRET')` — sem header `apikey`
e sem nenhum literal. É por isso que ele não aparece no resultado da query acima: o
comando vivo não contém mais nenhum dos padrões buscados.

---

## 2. JWT commitado em `supabase/migrations/` (histórico git)

Comandos executados:

```
git log -p -S 'eyJ' -- supabase/migrations 2>&1 | head -200
grep -rn 'eyJ' supabase/migrations --include=*.sql -l
```

**Achado:** existe, sim, 1 arquivo de migration com um JWT em texto plano:

- **Arquivo:** `supabase/migrations/20260601140100_fix_cron_connections_auto_test_hardcode_url.sql`
- **Commit de introdução:** `620afebc0` (2026-06-01, PR #574 — "fix(colapso): fecha
  colapso de conexões — kill-switch, hardening DB, crons e smoke")
- **Natureza do segredo:** o `header` `apikey` do `net.http_post` do job
  `connections-auto-test`, com um JWT literal cujo claim `role` é `anon` (chave anon/pública
  do Supabase — o próprio comentário do commit já dizia "a chave anon é pública").
- **Inconsistência notável:** a URL hardcoded nesse mesmo arquivo apontava para o projeto
  **proibido** `pqpdolkaeqlyzpdpbizo` (REGRA #1 do `CLAUDE.md`), enquanto o claim `ref`
  dentro do próprio JWT correspondia ao projeto canônico `doufsxqlfjyuvxuezpln` — ou seja,
  URL e chave já nasceram desencontradas.
- **Correção subsequente (mesmo repositório, já commitada):**
  - `supabase/migrations/20260602020000_fix_hardcoded_api_key_cron.sql` — descrita no
    próprio arquivo como remediação de "COLAPSO #5 (CRÍTICO SEGURANÇA) — Cron job tem a
    anon key hardcoded diretamente no SQL. Qualquer um com SELECT em cron.job vê a chave."
    Troca o header `apikey` literal por `x-cron-secret` via `get_edge_function_secret()`.
    (Essa versão intermediária ainda usa a URL do projeto legado [LEGACY_INFORMATIVO]
    `pqpdolkaeqlyzpdpbizo` — sem chave — o que também já não é mais o estado vivo,
    ver abaixo.)
  - `supabase/migrations/20260619210000_fix_cron_connections_auto_test_canonical_url.sql`
    — troca a URL hardcoded pela canônica `doufsxqlfjyuvxuezpln`. É esse o estado
    confirmado como vivo em `cron.job` no item 1.
- **Cópia adicional do mesmo literal:** `supabase/migrations-snapshot/ALL_IN_ONE.sql`
  contém 1 ocorrência do mesmo padrão `eyJ` — é um snapshot/concatenação gerado a partir
  do histórico de migrations, não uma introdução nova de segredo.

**Classificação de risco:** o literal é a chave **anon** (papel público por design,
a mesma chave já está intencionalmente em `src/integrations/supabase/client.ts` para uso
no browser). Não é `service_role`. O problema real não é "vazamento de segredo secreto",
é higiene de código (segredo em texto plano em SQL versionado, mesmo que de baixo risco) —
já corrigido em 2 migrations subsequentes, dentro do próprio período de 2026-06.

**Nenhum JWT com claim `role: service_role` foi encontrado em `supabase/migrations/`.**

**Conclusão: 1 arquivo histórico com anon key literal (já remediado, estado vivo em
`cron.job` limpo — confirmado no item 1). 0 arquivos com `service_role` literal.**

---

## 3. `.env.local` ignorado pelo git

```
$ git check-ignore .env.local
.env.local        # retornou o nome do arquivo → confirmado ignorado (exit code 0)

$ cat .gitignore | grep -i env
# Environment variables
.env
.env.*.local
.env.local
```

**Conclusão: `.env.local` está corretamente listado em `.gitignore` e é ignorado pelo git.**

---

## 4. `service_role` hardcoded em `src/`

```
grep -rn 'service_role' src/ --include=*.ts --include=*.tsx | grep -v -i 'type\|interface\|// \|comment'
```

6 ocorrências, todas inspecionadas individualmente:

| Arquivo | Natureza |
|---|---|
| `src/lib/sensitive-masking.ts:51` | Regex que **mascara** `service_role`/`service_role_key` em logs — é a ferramenta de proteção, não um vazamento |
| `src/lib/sensitive-masking.ts:105` | Idem — regex de detecção para mascaramento |
| `src/pages/admin/OwnershipAuditAdminPage.tsx:316` | Texto de UI em português explicando que uma operação "só funciona via service_role / cron" — string de copy, não credencial |
| `src/pages/magazine/hooks/useMagazineReaderState.ts:12` | Comentário de código (apesar de não começar com `//` na linha exata, é continuação de bloco `/* */`) |
| `src/hooks/products/useProductEngravingOptions.ts:10` | Comentário de código, mesmo padrão |
| `src/utils/security-audit.ts:9` | String de resultado de auditoria (texto descritivo, não uma chave) |

Nenhuma das 6 ocorrências contém uma chave/JWT em texto plano. Todas são: (a) o próprio
mecanismo de mascaramento de segredos, (b) comentários/documentação de código, ou (c)
texto de interface/relatório mencionando o **nome do papel** `service_role`, nunca um valor.

**Conclusão: 0 ocorrências de `service_role` como credencial hardcoded em `src/`.**

---

## Resumo final

| Item | Resultado |
|---|---|
| 1. Cron jobs vivos com segredo literal (`pg_catalog`/`cron.job`) | **0** — confirmado via SQL read-only |
| 2. JWT commitado em `supabase/migrations/` | **1 arquivo histórico** (`20260601140100_...hardcode_url.sql`, commit `620afebc0`), chave **anon** (pública por design), já remediado por 2 migrations posteriores; estado vivo em `cron.job` limpo. 0 arquivos com `service_role` |
| 3. `.env.local` ignorado | **Sim** — confirmado por `git check-ignore` e `.gitignore` |
| 4. `service_role` hardcoded em `src/` | **0** — todas as ocorrências são mascaramento, comentários ou texto de UI |

**O achado do `docs/SCHEMA_REFERENCE.md` §7 (prompt não executado, com `"apikey":"<ANON_KEY>"`
literal) não tem equivalente vivo no banco de produção `doufsxqlfjyuvxuezpln` hoje.** O único
caso real de chave literal commitada (`connections-auto-test`, junho/2026) era uma chave
**anon** (não `service_role`), já corrigido em git e sem literal remanescente no `cron.job`
atual. Nenhum segredo foi reproduzido neste documento.
