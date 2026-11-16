# origin/importado/backup-20261028/claude/audit-gaps-20260915

- **Veredito:** RESGATAR_PARCIAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** construiu os freios automáticos que impedem alguém de mexer no banco de produção sem deixar rastro — e dois desses freios foram desligados depois, sem ninguém avisar.
- **Tip / merge-base / main:** tip `bf11d09b1d60f71d5d189ddad0f6063a079f0717` · merge-base `1d2fafccdfe516cce2d52e527ec5ce964c99207f` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c` (2026-11-15)

---

## O que a branch quis fazer

É a branch de execução do plano de banco/engenharia de 2026-09-16/17 (etapas E11 a E49). Em 24
commits ela:

1. **Construiu os portões de CI de banco**: o único caminho autorizado para aplicar migration em
   produção (`db-apply-migration.yml`/E15), o detector de DDL aplicada por fora (E12), o gate que
   impede GRANT de escrita para visitante anônimo (E22), o gate de recibo de migration (E48), o
   gate de drift semanal ledger×manifesto (E46), o contrato de colunas das views públicas (E16), o
   diff estrutural de `types.ts` (E41), o hash do pacote de edge functions (E42), e os monitores de
   capacidade (E30), desempenho/SLO (E40) e wraparound (E33).
2. **Preparou 16 migrations** (nenhuma aplicada na época, todas marcadas `[REQUER-PO]`), incluindo o
   achado crítico de segurança E18 (`mcp_kv_get` deixava um segredo legível por qualquer usuário
   logado) e a correção de desempenho E35 (uma rotina de estoque levando 17,8 s por chamada).
3. **Escreveu 50 documentos de investigação** (E08–E49, 2 pacotes de aprovação, 1 pós-mortem) e o
   plano de 50 etapas.
4. Fechou a causa-raiz processual: 29 commits de governança tinham ficado só no disco local. Criou a
   REGRA #9 ("sessão de governança termina com push/PR") + pós-mortem.

Essa branch é a PR **#1865** (merge squash em 2026-09-17), completada pela PR **#1866** ("completa a
cauda do PR #1865 — squash pegou snapshot anterior ao último push"). Evidência: o próprio
pós-mortem da branch cita `https://github.com/adm01-debug/Promo_Gifts_V4/pull/1865`, e
`git log origin/main -- supabase/migrations/20260917110000_e45_fix_products_comment.sql` retorna
`33475f4830 … (#1865)`.

**Medida de incorporação:** das 141 alterações da branch, **39 arquivos estão byte-a-byte iguais na
main** (entre eles 9 migrations, `scripts/check-anon-write-grants.mjs`,
`scripts/check-public-views-drift.mjs`, `scripts/wraparound-monitor-check.mjs` e 10 arquivos de
teste). Dos 50 documentos da branch, **44 estão byte-a-byte iguais** na main (41 movidos para
`docs/arquivo/2026-09/`). Os 7 scripts npm que ela adicionou (`check:types-inventory`,
`check:types-inventory-drift`, `check:ddl-out-of-band`, `check:ledger-manifest-drift`,
`ledger:verify-statements`, `check:public-views-drift`, `check:migrations-sync-log-gate`) estão
todos no `package.json` da main.

---

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| E15 — workflow único de aplicação de migration | `.github/workflows/db-apply-migration.yml` | 4 chamadas a `preflight-migration-apply` + 1 a `append-migration-receipt` no workflow da main |
| E15 — corolário na governança | `AGENTS.md` ("vai a produção **só** pelo workflow `db-apply-migration.yml`. Sem exceção") | `git show origin/main:AGENTS.md` |
| E12 — detector de DDL fora do fluxo | `.github/workflows/ddl-out-of-band-detector.yml` + `scripts/check-ddl-out-of-band.mjs` | 2 chamadas ao script no workflow da main; `docs/E12_...md` byte-idêntico |
| E22 — gate anti-GRANT de escrita para anônimo | `supabase-security-gate.yml` CHECK 5 | `origin/main:.github/workflows/supabase-security-gate.yml:124-131` (`check-anon-write-grants.mjs --require-live`); script byte-idêntico |
| E48 — gate de recibo de migration | `scripts/check-migrations-sync-log-gate.mjs`, ligado em `static-checks.yml:183` | workflow dedicado foi aposentado (`recovery/workflows-aposentados/migrations-sync-log-gate.yml`), gate continua rodando |
| E48 — 599 recibos de migration no log | entraram na main intactos em #1866 | `git show 44857d549b:supabase/MIGRATIONS_SYNC_LOG.md` → 599 linhas de recibo (idêntico ao da branch) |
| E46 — gate de drift semanal (script) | `scripts/check-ledger-manifest-drift.mjs` | presente, +9/−1 vs. branch |
| **E06/E46 — baseline real do ledger** | **NÃO ESTÁ** — substituído por um *stub* | ver "A resgatar" item 1 |
| E16 — contrato das 8 views públicas | `scripts/check-public-views-drift.mjs` (substituiu `check-public-views-columns.mjs`, como a própria branch pretendia) | script e teste byte-idênticos; achado P6 preservado em `docs/SCHEMA_REFERENCE.md:183` |
| E41 — diff estrutural de `types.ts` | `scripts/extract-types-inventory.mjs` + `check-types-inventory-drift.mjs`, 3 chamadas em `regenerate-supabase-types.yml` | allowlist `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json` na main é superconjunto (1.180 → 7.827 bytes) |
| E42 — hash do pacote de edge functions | `scripts/check-edge-verify-jwt-allowlist.mjs`, 4 chamadas em `edge-functions-drift-check.yml` | exigência de `reason` não-vazio preservada e endurecida na main (linha 165) |
| E30 — monitor de capacidade | migration `20260916211500_e30_ops_table_size_history.sql` **byte-idêntica**; `capacity-growth-report.yml` | 2 chamadas a `capacity-growth-projection` no workflow da main |
| E40 — baseline de desempenho/SLO | migration `20260917150000_e40_ops_pgss_history.sql` **byte-idêntica**; `pgss-slo-report.yml` | 1 chamada a `pgss-slo-check` |
| E33 — monitor de wraparound | migration `20260917160000_e33_ops_wraparound_monitor.sql` **byte-idêntica**; `wraparound-monitor-report.yml`; `scripts/wraparound-monitor-check.mjs` byte-idêntico | 2 chamadas ao script |
| E18 — revoke de `mcp_kv_get` (crítico) | migration na main **e aplicada em produção** | `has_function_privilege('authenticated', 'public.mcp_kv_get', 'EXECUTE')` = **false** (consulta ao vivo, 2026-11-16) |
| E18 — revoke dos 4 gaps de autorização | migration na main e **registrada no ledger** | `supabase_migrations.schema_migrations` contém `20260917061500` |
| E18 — allowlist de 94 SECDEF com motivo por função | `.security/lint-0029-allowlist.json` (114 entradas hoje) | 64 dos 66 motivos "E18 (2026-09-17)" preservados; as 3 ausentes evoluíram legitimamente (`mcp_kv_get` saiu porque o revoke foi aplicado; `respond_discount_approval_transactional` mudou de assinatura; `fn_check_login_allowed` foi removida em #1904/SEC-008v4) |
| E19 — allowlist de RLS sem policy | `.security/rls-no-policy-allowlist.json` | cabeçalho e 5 primeiras entradas byte-idênticos |
| E23 — FORCE RLS em tabelas de segredo | migration `20260916202000_e23_force_rls_secret_tables.sql` | na main, +1 linha (cabeçalho `-- Rollback:`) |
| E37 — query §8.4 corrigida (wrapped vs bare) | `docs/SCHEMA_REFERENCE.md:357-385` da main, verbatim | `is_wrapped`, contagem de `fn_cron_safe_run(` |
| E25/E27 — testes de hook dentro do CI | `.github/workflows/ci-security-drift.yml:128-129`, nome do passo idêntico ao da branch | + `ci.yml:398` roda `tests/hooks/` |
| Correção de tipagem no Kit Maker | `src/lib/kit-builder/snapshot/read-draft.ts:21-24` — mesmas 4 linhas, só mudou de arquivo | o hook `useKitBuilderPageState.ts` passou a importar de lá |
| REGRA #9 (governança exige push/PR) | `AGENTS.md:68` ("Governança … só por PR, inclusive para CODEOWNER e para o dono da conta") | evoluiu de REGRA #9 → "MUDANÇAS DE GOVERNANÇA EXIGEM PR" (#3038) |
| Política de DDL (3 condições) | `docs/db/POLITICA_DDL.md` da main é superconjunto (todo o texto da branch + seções E75) | diff branch→main só adiciona |
| **Pós-mortem dos commits locais** | **NÃO ESTÁ** — apagado em #2284 | ver "A resgatar" item 2 |
| `qa/migrations-draft/DRAFTS_STATUS.md` seção "Decisão por objeto (E13)" | texto apagado por regeneração automática do arquivo (2026-11-01) | conteúdo íntegro em `docs/arquivo/2026-09/E13_DRAFTS_MIGRATIONS_2026-09-16.md` (byte-idêntico) — sem perda real |
| `supabase/migrations-snapshot/SCHEMA_DRIFT.sql` | removido pelo snapshot semanal (#2169) | é artefato gerado, sem DDL (só comentário); a ausência já está registrada em `.migration-refs-baseline.json` da main |
| filtro de caminho em `stock-module-quality.yml` | workflow removido de propósito em #2595 (30 workflows → matrizes) | o teste que ele cobria (`tests/components/inventory/ReliabilityKpiBar.test.tsx`) está byte-idêntico na main e roda em `npm run test:quality` |

---

## A resgatar

### 1. O freio de drift do banco está desligado por construção — `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json`

**O que a branch entregou:** o retrato real do histórico oficial do banco — 2.413 registros do
ledger com assinatura (sha256) de cada um, mais uma lista de **543** exceções conhecidas
(2.377.056 bytes, 63.114 linhas). Entrou na main intacto em #1865
(`git cat-file blob 33475f4830:docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json | wc -c`
→ `2377056`, idêntico à branch).

**O que aconteceu:** foi **apagado** em #2284 (2026-10-19) e **recriado como "stub"** em #3000
(2026-11-01, "adiciona MANIFESTO stub — corrige weekly-live-drift INCONCLUSIVE"). O arquivo de hoje
tem 367.824 bytes, zero assinaturas, e a própria descrição diz:
`"Baseline E06 recriado em 2026-11-01 (stub). knownLocalWithoutLedger: todas as migrations locais."`

**Por que importa (e por que é o item mais grave):** `scripts/check-ledger-manifest-drift.mjs:131`
descarta do alerta toda versão listada nesse campo:

```
.filter((v) => !ledgerVersions.has(v) && !baseline.knownLocalWithoutLedger.has(v))
```

O stub lista **3.654 versões** — mais do que os **3.097** arquivos `.sql` que existem no repositório.
Ou seja: qualquer migration existente já está pré-declarada como "desvio conhecido", e o portão
semanal **não consegue mais acusar nada**. Ele fica verde sempre. Esse portão é justamente o que
avisaria que alguém mexeu na estrutura do banco de produção por fora do caminho autorizado.

**Como resgatar:** o gerador já está na main e é idêntico ao da branch
(`scripts/build-migration-ledger-manifest.mjs`). Basta regerar o baseline contra o ledger vivo de
hoje e substituir o stub, em PR (é arquivo de governança — Git 10). O arquivo da branch serve de
prova do formato esperado (chaves `entries`, `statement_sha256`, `summary`).

### 2. `docs/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md` — apagado, com 4 documentos vivos apontando para ele

**O que era:** 69 linhas explicando como 29 commits de governança (entre eles os dois workflows mais
importantes do banco) ficaram invisíveis por várias sessões, o impacto (nenhum incidente), a
causa-raiz (processual) e a correção (REGRA #9).

**O que aconteceu:** entrou na main em #1866 e foi apagado em #2284 (2026-10-19), sem substituto
(`git show 46275a9b27 --name-status` → `D docs/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md`).

**Por que importa:** 4 documentos da main ainda o citam, e um deles afirma algo que hoje é falso:

- `docs/plans/PLANO_ENGENHARIA_SENIOR_50_ETAPAS_2026-09-17.md:378` — "`docs/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md` **existe em `main`**"
- `docs/audits/AUDITORIA_20DIM_2026-10-02.md:206` — usa o pós-mortem como *evidência de manutenção* do projeto
- `docs/auditoria-planejado-nao-executado-2026-10-11/A11_auditorias_bugs_issues.md:126`
- `docs/plans/PLANO_MELHORIAS_CORRECOES_200_ETAPAS_2026-10-18.md:1518`

E uma auditoria anterior **já decidiu** restaurá-lo e isso nunca aconteceu:
`analise-branches/auditoria-261115/VEREDITOS_165_BRANCHES.md:22` —
"`docs/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md` (backup-20261028/claude/audit-gaps-20260915) ->
`docs/arquivo/2026-09/` no trem final".

**Como resgatar:** copiar o blob da branch para `docs/arquivo/2026-09/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md`
(`git show bf11d09b1d:docs/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md`) e ajustar as 4 referências.
Custo baixo, fecha a pendência que a auditoria de 15/11 deixou aberta.

---

## Risco de fechar esta branch

**Baixo-moderado, e o risco não é perder código — é perder o rastro.** Todo o código executável
(portões de CI, scripts, migrations, testes) já está na main, boa parte byte-a-byte. Apagar a branch
hoje significa:

1. **Perder a única cópia** do baseline real do histórico do banco (item 1). Enquanto o stub estiver
   lá, o aviso semanal de "alguém mexeu no banco por fora" está mudo — e ninguém saberá que ele está
   mudo, porque ele reporta verde. É um alarme de incêndio com a bateria removida.
2. **Perder a única cópia** do pós-mortem (item 2), que 4 documentos ainda citam, incluindo um
   usado como prova de qualidade do projeto.

Os dois itens podem ser resgatados antes de apagar; feito isso, a branch pode ser fechada sem perda.

**Informação separada, para decisão do dono (não é da branch — é estado da main):** 15 das 16
migrations que esta branch preparou estão versionadas no repositório mas **nunca foram registradas
no ledger de produção**. Consulta ao vivo em 2026-11-16 mostra:

| item preparado | estado em produção hoje |
|---|---|
| E18 — segredo legível por usuário logado (`mcp_kv_get`) | ✅ **corrigido** (`EXECUTE` para `authenticated` = false) |
| E18 — 4 gaps de autorização | ✅ registrado no ledger (`20260917061500`) |
| E35 — rotina de estoque a 17,8 s por chamada | ❌ **não aplicado** — o predicado lento original ainda está na função `fn_aggregate_stock_daily` |
| E47 — isolamento do job de drift (jobid 245) | ❌ não aplicado (ainda 1 chamada, não 2) |
| E38 — 2 jobs mortos (274, 202) | ⚠️ seguem desligados (`active=false`), não removidos |
| E45 — comentário de `products` | ❌ ainda diz "152 colunas" (real: 184) — só metadado |

O único com efeito de negócio relevante é o **E35** (relatório de reposição de estoque lento).
Isso é backlog da main, não motivo para manter a branch.

---

## Não verificado

- **Se as 290 versões de recibo que hoje faltam no `supabase/MIGRATIONS_SYNC_LOG.md` da main
  (521 linhas hoje × 599 entregues pela branch) saíram de propósito.** Provado que entraram intactas
  em #1866 (599 linhas em `44857d549b`), portanto **não é trabalho desta branch que ficou de fora** —
  é evolução posterior da main, com dezenas de commits no arquivo desde então. Decidir se essa poda
  foi correta exige auditoria do próprio log, fora do escopo deste dossiê.
- **Se o stub do manifesto (item 1) foi uma decisão consciente de trade-off ou um atalho.** A
  mensagem de #3000 diz que o objetivo era tirar o portão do estado INCONCLUSIVE; não há registro de
  que o efeito colateral (portão verde por construção) tenha sido avaliado. Não li a discussão da PR.
- **Conteúdo integral dos 4 arquivos gerados de `supabase/migrations-snapshot/`** (`ALL_IN_ONE.sql`,
  `SCHEMA_LIVE.sql`, `SNAPSHOT_META.json`, `README.md`): são saída do workflow semanal
  `schema-snapshot-export.yml`, regerados várias vezes desde setembro. Verificados por existência e
  pelo mecanismo que os produz, não linha a linha.
- **Se os 3 rascunhos "pendentes" apontados pelo E13 ainda são gaps reais.** A classificação está
  preservada em `docs/arquivo/2026-09/E13_DRAFTS_MIGRATIONS_2026-09-16.md`, mas a auditoria da própria
  main (`docs/auditoria-planejado-nao-executado-2026-10-11/A06_banco_dba.md:118`, item DB-062) já
  marca isso como 🟨 PARCIAL com divergência de contagem (4 × 5 arquivados) nunca esclarecida.
