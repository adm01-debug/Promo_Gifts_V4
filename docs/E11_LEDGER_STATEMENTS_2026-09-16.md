# E11 — `statements` obrigatório para toda entrada nova do ledger (2026-09-16)

`[GIT]`. Sem `[REQUER-PO]` — nenhum artefato desta etapa aplica DDL nem
escreve no banco; é gate + allowlist + documentação, tudo somente leitura.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (linhas 379-386).

---

## 1. Problema (conforme o plano)

483 linhas do ledger (`supabase_migrations.schema_migrations`) sem
`statements` — 20 % do histórico não pode ser comparado por hash com o
arquivo local (`supabase/migrations/<version>_*.sql`), tornando a
metodologia do E33 do plano 09-15 impossível para esse subconjunto. Ação
pedida: aceitar o passado como não-verificável (registrar em
`MIGRATIONS_SYNC_LOG.md`) e criar um gate de CI que exija `statements`
não vazio em toda linha **nova** a partir de agora.

---

## 2. Estado herdado desta sessão

Esta sessão começou com três artefatos já presentes na working tree,
produzidos por uma sessão anterior que morreu por erro de infraestrutura
(não por engano de conteúdo): `docs/E11_LEDGER_STATEMENTS_ALLOWLIST.json`,
`scripts/check-ledger-statements-gate.mjs` (403 linhas) e
`tests/scripts/check-ledger-statements-gate.test.mjs` (32 testes), mais uma
seção já escrita em `supabase/MIGRATIONS_SYNC_LOG.md`. Faltavam os dois
entregáveis finais: este documento e o blockquote de evidência no plano.

**Auditoria desta sessão sobre o material herdado:** li os três arquivos
inteiros, reconfirmei todos os números ao vivo (via
`mcp__supabase__execute_sql`, sem escrita), rodei o gate e a suíte de
testes, e rodei eslint. Resultado: o script e o allowlist estavam corretos
— todos os números batem exatamente com uma segunda medição independente
nesta sessão. A única imprecisão encontrada foi de **redação**, não de
lógica ou de número: a distribuição mensal em prosa na seção do
`MIGRATIONS_SYNC_LOG.md` citava "2025-12 e 2026-01 a 2026-05 (23, 15, 22,
65, 176, 94...)" — 6 números para 5 meses, sem rótulo explícito; o primeiro
número (23) era na verdade de 2025-01, e o mês 2024-12 (2 linhas, ambas
faltando) tinha ficado de fora da lista. A soma total (483) já batia, então
não era um erro de contagem — só de atribuição mês-a-mês. Corrigido nesta
sessão (ver §2 do log e a tabela abaixo). Também corrigi uma alegação
imprecisa: a seção original dizia que o gate "passa a exigir `statements`"
como se já estivesse ativo em CI — na prática ele existe e passa nos testes,
mas **não está plugado em nenhum workflow** (ver §6).

---

## 3. Números reconfirmados ao vivo nesta sessão `[RO]`

```sql
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE statements IS NULL) AS null_statements,
       count(*) FILTER (WHERE statements IS NOT NULL
                         AND array_length(statements,1) IS NULL) AS empty_array_statements,
       count(*) FILTER (WHERE statements IS NULL
                         OR array_length(statements,1) IS NULL) AS missing_statements_total
FROM supabase_migrations.schema_migrations;
```

`total_rows=2504`, `null_statements=428`, `empty_array_statements=55`,
`missing_statements_total=483`. Idêntico ao allowlist herdado
(`liveCountAtMeasurement`) e ao texto já existente no
`MIGRATIONS_SYNC_LOG.md`.

```sql
SELECT max(version) FROM supabase_migrations.schema_migrations
WHERE version ~ '^[0-9]{14}$'
  AND (statements IS NULL OR array_length(statements,1) IS NULL);
```

`20260623111612` — mesmo cutoff já gravado em
`docs/E11_LEDGER_STATEMENTS_ALLOWLIST.json` (`cutoffVersion`).

```sql
SELECT count(*), count(*) FILTER (WHERE statements IS NULL OR array_length(statements,1) IS NULL)
FROM supabase_migrations.schema_migrations
WHERE version ~ '^[0-9]{14}$' AND version > '20260623111612';
```

598 linhas canônicas depois do cutoff, **0** sem `statements` — confirma que
o cutoff é justo (não isenta nenhuma linha que já deveria estar em
conformidade).

```sql
SELECT version, name, statements IS NULL AS statements_null
FROM supabase_migrations.schema_migrations
WHERE version !~ '^[0-9]{14}$' ORDER BY version;
```

10 versões não-canônicas. 5 com `statements` NULL e `name` NULL —
`"001"`..`"005"` — exatamente as 5 na `nonCanonicalExemptVersions` do
allowlist herdado. As outras 5 (`20260623_bugalert1`,
`20260623_create_process_notifications_queue_rpcs`,
`20260623_fix_google_provider_secret_name`, `2026062311292414001`,
`20260712`) já têm `statements` preenchido — confirmado, não precisam de
isenção.

### Distribuição mensal completa (reconfirmada; corrige a prosa anterior do log)

Todas as linhas com `version` canônico de 14 dígitos, agrupadas por
`to_char(to_date(version[1:8],'YYYYMMDD'),'YYYY-MM')`:

| Mês | Total | Sem `statements` |
|---|---:|---:|
| 2024-12 | 2 | 2 |
| 2025-01 | 24 | 23 |
| 2025-12 | 54 | 54 |
| 2026-01 | 15 | 15 |
| 2026-02 | 22 | 22 |
| 2026-03 | 165 | 65 |
| 2026-04 | 246 | 176 |
| 2026-05 | 368 | 94 |
| 2026-06 | 1.379 | 27 |
| 2026-07 | 156 | 0 |
| 2026-08 | 13 | 0 |
| 2026-09 | 50 | 0 |

Soma das linhas canônicas sem `statements`: 478. + 5 não-canônicas (`00N`)
= **483**, batendo com a contagem bruta. A lacuna é concentrada em
2024-12–2026-06 e zerada a partir de 2026-07 — confirma a leitura já
registrada no log: processo de aplicação já vinha sanando isso
organicamente desde 2026-06-23.

---

## 4. Metodologia do gate (`scripts/check-ledger-statements-gate.mjs`)

- **Escopo (HARD, falha o gate):** toda linha com `version` canônico
  (14 dígitos) **maior** que `cutoffVersion` (`20260623111612`), e toda
  linha não-canônica **fora** de `nonCanonicalExemptVersions` (`001`-`005`),
  precisa ter `statements` não vazio. Linhas históricas (`<= cutoff`, ou na
  lista de exceção) são isentas por construção — não podem ser corrigidas
  retroativamente.
- **Comparação de hash (ADVISORY por padrão, promovível a HARD via
  `--strict-hash`):** quando existe `supabase/migrations/<version>_*.sql`
  sem colisão de versão, compara `md5` dos `statements` concatenados contra
  o arquivo, em forma crua e em forma normalizada
  (`normalizeSqlForHash` — colapsa CRLF, espaços à direita e o run de
  `;`/whitespace final). Por quê advisory: o teste herdado prova, com bytes
  reais de `20260623111856` (lidos do arquivo local e da coluna
  `statements` ao vivo), que a reconstrução não é sempre byte-exata mesmo
  dentro do escopo — um hard-fail teria falso positivo até a E15 (workflow
  de aplicação controlada) garantir paridade byte-a-byte na origem.
- **Query live já filtrada no SQL** (`WHERE version > cutoff OR
  não-canônica`) — não trafega as ~1.900 linhas históricas isentas a cada
  execução.
- **Fonte de dados:** Management API read-only via
  `scripts/supabase-read-only-query.mjs` (mesmo padrão de
  `check-ddl-out-of-band.mjs`/`check-ledger-manifest-drift.mjs`). Sem
  `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF` → `static-pass` (ou
  `inconclusive` com `--require-live`), contrato de
  `scripts/check-result-contract.mjs`.
- **Zero escrita:** nenhuma chamada a `apply_migration`/`migration repair`;
  só `SELECT` e leitura de arquivo local.

---

## 5. Evidência de execução nesta sessão

- `node scripts/check-ledger-statements-gate.mjs` (sem credenciais) →
  `static-pass`, exit 0:
  ```
  [ledger-statements] static-pass: sem SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF; checagem ficou em modo estático
  ```
- `npx vitest run tests/scripts/check-ledger-statements-gate.test.mjs` →
  **32/32 passando** (inclui o caso que reproduz o achado real de
  `20260623111856` com bytes reais lidos do arquivo local, e o caso "sem
  credenciais degrada com graça").
- `npx eslint scripts/check-ledger-statements-gate.mjs
  tests/scripts/check-ledger-statements-gate.test.mjs` → 0 erros, 0
  warnings (o `.json` do allowlist não é alvo de lint — comportamento
  esperado, não é código executável).
- Caminho live testado nesta sessão via `mcp__supabase__execute_sql`
  diretamente (não pelo script, que não tem token neste ambiente de
  sessão) — as 4 queries do §3 acima reproduzem exatamente a lógica que
  `scopedLiveSql()` roda, e os números batem 100 % com o que o allowlist já
  tinha. Não executei o script com `SUPABASE_ACCESS_TOKEN` real (essa
  credencial não está disponível nesta sessão local); a validação do
  caminho live do próprio script fica para a primeira execução em CI
  (mesma situação do E46/E12 nesta rodada de etapas).

---

## 6. Achado desta sessão: gate implementado, não plugado em CI

`grep -rln "check-ledger-statements-gate\|ledger:verify-statements"
.github/workflows/` não retorna nenhum arquivo. O script existe, tem `npm
run ledger:verify-statements` (`package.json` linha 168), passa nos
testes e roda localmente — mas nenhum workflow do GitHub Actions o chama.
Comparando com o padrão usado pelo `check-migration-filename-contract.mjs`
irmão (E10), que está plugado como step em `.github/workflows/quality-gate.yml`
linha 72, o E11 ficou sem o passo equivalente.

Isso é diferente de "achado fora de escopo" (como as 5 versões `00N` do
§3) — é um item do próprio checklist da etapa
("Gate `ledger:verify-statements` implementado **e no CI**") que só está
parcialmente cumprido. Decidi não adicionar esse step a
`quality-gate.yml` nesta sessão: workflows CI não estão na lista de
arquivos em escopo desta auditoria (`docs/E11_LEDGER_STATEMENTS_ALLOWLIST.json`,
`scripts/check-ledger-statements-gate.mjs`,
`tests/scripts/check-ledger-statements-gate.test.mjs`, a seção E11 do log e
do plano, este documento), e tocar num workflow de quality gate é uma
mudança de superfície maior (pode alterar o resultado de PRs em voo) que
merece revisão própria, não um adendo de auditoria. Registrado aqui e no
checklist abaixo como pendência explícita, não como "concluído".

---

## 7. Checklist de conclusão (do plano)

- [x] `MIGRATIONS_SYNC_LOG.md` declara as 483 como "não verificáveis por
  hash — verificadas por objeto (E07)" — presente desde antes desta sessão,
  reconfirmado e com a prosa da distribuição mensal corrigida nesta sessão.
- [x] Gate `ledger:verify-statements` **implementado** (script + allowlist +
  32 testes, tudo passando) — mas **não plugado em nenhum workflow de CI**
  ainda (ver §6). Marco como feito o "implementado"; o "no CI" fica como
  pendência explícita para uma sessão que tenha workflows `.yml` em escopo.
- [x] Toda entrada criada a partir do cutoff tem `statements` — confirmado
  ao vivo nesta sessão (598/598 linhas canônicas com `version >
  20260623111612` já têm `statements`, zero linhas faltando desde 2026-07).
  Nota: esta é uma invariante **observacional** hoje (o processo de
  aplicação já vem cumprindo isso organicamente); só vira uma garantia
  **imposta** quando o item acima (gate no CI) for fechado.

---

## 8. Resumo

| Item | Tipo | Risco | Reversível |
|---|---|---|---|
| `docs/E11_LEDGER_STATEMENTS_ALLOWLIST.json` (herdado, auditado) | Doc/config | Nenhum | Sim |
| `scripts/check-ledger-statements-gate.mjs` (herdado, auditado) | Script RO | Nenhum — zero escrita, confirmado por leitura + execução direta | Sim |
| `tests/scripts/check-ledger-statements-gate.test.mjs` (herdado, auditado) | Teste | Nenhum | Sim |
| `supabase/MIGRATIONS_SYNC_LOG.md` §E11 (herdado, corrigido nesta sessão) | Doc | Nenhum | Sim |
| Este documento (novo) | Doc | Nenhum | Sim |
| Wiring em CI (`quality-gate.yml` ou workflow dedicado) | — | — | **Não feito — pendência aberta, ver §6** |

Nenhum item desta etapa é `[REQUER-PO]`. O trabalho auditado nesta sessão é
commitável diretamente; a pendência de wiring em CI (§6) deve virar um item
de follow-up explícito antes de considerar a E11 100 % concluída no sentido
literal do checklist do plano.
