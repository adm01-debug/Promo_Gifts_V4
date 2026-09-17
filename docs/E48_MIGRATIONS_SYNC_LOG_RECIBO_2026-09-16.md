# E48 — `MIGRATIONS_SYNC_LOG.md` como recibo, não como narrativa (2026-09-16)

`[GIT]`. Sem `[REQUER-PO]` no core desta etapa — reformatação de documento +
gate de CI, tudo somente leitura sobre o Supabase (uma única query SQL, via
`mcp__supabase__execute_sql`, contra `supabase_migrations.schema_migrations`,
para o backfill retroativo). As entradas de E08 Lote 2 e E09 registradas
dentro do novo log seguem `[REQUER-PO]` — nada nelas foi aplicado nesta
etapa nem em etapas anteriores; ver §5.

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` (§E48,
linha ~944). Depende de E08 (lotes de repair) e E11 (allowlist/cutoff de
`statements`).

---

## 1. Problema (conforme o plano)

`supabase/MIGRATIONS_SYNC_LOG.md` existia, mas como narrativa: frases como
"sincronizado" sem hash eram lidas como se fossem certificação de que uma
migration foi de fato aplicada. Ação pedida: um contrato tabular — uma
linha por aplicação real, com `versão | sha256 arquivo | md5 statements |
executor | método | data UTC | pós-check` — cabeçalho com "último recibo" e
"ledger hash", histórico antigo movido para uma seção "legado — não
verificado", e um gate de CI que bloqueia PR que toca
`supabase/migrations/` sem linha nova correspondente no log.

---

## 2. O que foi feito

### 2.1 Reformulação do log (`supabase/MIGRATIONS_SYNC_LOG.md`, 511 → 1307 linhas)

- **Nada foi apagado.** As 511 linhas originais (narrativa de E11, E46, Kit
  Maker, reconciliações, sort-order fix, preview markers, motor_v2 etc.)
  foram movidas **byte-a-byte** para `## Legado — não verificado`, no final
  do arquivo — verificado com `diff` contra uma cópia do arquivo original
  antes de qualquer edição: diff vazio.
- **Novo cabeçalho/contrato**: seção `## Contrato (vigente a partir de
  2026-09-16)` define as 7 colunas, com a regra do gate.
- **Backfill retroativo, dados reais**: consulta ao vivo (somente leitura)
  via `mcp__supabase__execute_sql` contra
  `supabase_migrations.schema_migrations` do projeto canônico
  `doufsxqlfjyuvxuezpln`, filtrada para `version` canônica (14 dígitos)
  **maior** que o cutoff já estabelecido pela E11 (`20260623111612`) —
  fronteira onde a E11 confirmou que toda linha canônica tem `statements`
  preenchido (598/598, **reconfirmado nesta sessão**, mesmo número — nenhuma
  migration nova aplicada entre as duas sessões). Resultado: **598 linhas**
  na tabela "Recibos" (`## Recibos — aplicações confirmadas por hash`),
  cada uma com:
  - `sha256 arquivo`: SHA-256 real do arquivo local correspondente,
    calculado nesta sessão (`sha256sum` sobre o conteúdo atual do arquivo no
    repo).
  - `md5 statements`: calculado **no próprio Postgres**
    (`md5(array_to_string(statements, E'\n'))`), não localmente — elimina
    risco de transcrição incorreta do SQL.
  - `executor`/`método`/`pós-check`: `n/d` em massa, porque o ledger não
    registra essas 3 informações por linha (não existe coluna para isso em
    `schema_migrations`) — isto é a verdade, não uma lacuna de
    preenchimento. Uma linha tem contexto real documentado e foi preenchida
    de verdade: `20260911130357` (Kit Maker), com evidência de
    RLS/policy/RPC/rollback já registrada no legado.
  - As ~1.906 linhas restantes (2.504 total − 598 pós-cutoff), sem
    `statements` capturável ou fora do formato canônico, permanecem como
    narrativa em `## Legado — não verificado` — não foram fabricadas como
    linhas tabulares.
- **Fonte estruturada**: `docs/E48_LEDGER_RECEIPTS_2026-09-16.json`
  (341.896 bytes, schema_version 1, 598 `rows`) — a tabela markdown é
  gerada dele; usar esse arquivo para qualquer verificação automatizada.
  Validado como JSON parseável com `row_count` == `len(rows)` == 598.
- **"Último recibo"**: `20260916155725` /
  `catalog_stats_price_range_top_colors_materials` / `2026-09-16 15:57:25
  UTC` — a linha de maior `version` no ledger no momento do backfill. **Não**
  é uma aplicação feita por esta etapa (E48 não escreve no banco).
- **Achado novo desta sessão** (fora do escopo de remediação de E48): essa
  mesma linha (`20260916155725`) não tem **nenhum** arquivo local
  correspondente em `supabase/migrations/` — candidato a drift out-of-band
  (mesma classe do detector da E12), reportado no log, não corrigido aqui.
- **"Ledger hash"**: a fórmula não estava especificada no plano — definida
  explicitamente na seção `### Definição de "ledger hash"` do log:
  ```
  ledger_hash = sha256(
    join("\n", [f"{versão}|{sha256_arquivo}|{md5_statements ou '-'}" for cada linha,
                em ordem ascendente de versão])
  )
  ```
  Cobre as 598 linhas inteiras (não uma amostra). Valor calculado nesta
  sessão:
  ```
  8086444739de2607c127a1fedf231f96505c27482d5a18fc5cdbead6a4c85193
  ```
- **3 exceções conhecidas** dentro das 598, documentadas no log: 2 colisões
  de versão já catalogadas pela E10 (`20260623120000`,
  `20260623130000` — 2 arquivos locais cada, `sha256 arquivo` marcado
  `AMBIGUO (2 arquivos com esse prefixo — ver E10)` em vez de escolher um
  arbitrariamente) + o achado novo de `20260916155725` acima.

### 2.2 Entradas de E08/E09 no novo formato (checklist do plano)

- `## Recibos agregados — lotes e reparos (E08)`: E08 Lote 1 (90 versões,
  `repair`, status **aplicada** 2026-09-16 — confirmado via ledger direto) e
  E08 Lote 2 (179 versões, `repair` **proposto**, status "proposto,
  aguardando aprovação PO" — `docs/PACOTE_APROVACAO_1_2026-09-16.md`
  confirma "Nenhuma ação abaixo foi executada"). Confirmado nesta sessão,
  por interseção de conjuntos em Python, que as 179 versões do Lote 2 têm
  **zero overlap** com as 598 linhas já ledgeradas pós-cutoff — categorias
  limpas, sem risco de dupla contagem.
- `## Recibos individuais — E09` (4 IDs não-canônicos, de
  `docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md`): 2 stubs nunca executáveis
  (`repair --status reverted` proposto), 1 UPDATE real já aplicado em
  produção mas sem migration commitada (backfill de arquivo canônico +
  `repair --status applied`, proposto), e 1 ID malformado mas internamente
  consistente (`2026062311292414001`, 19 dígitos em vez de 14 — sha256 real
  `c03d47ba1092d52f69f53f24c0fd4a4bda564df820c78a5bf3d36c8f349cab1d`, md5
  `295937419d88bdce784aba42f37ef5e4`, ambos computados/consultados ao vivo
  nesta sessão, "documentado — sem remediação proposta"). **Nenhuma** das
  ações `[REQUER-PO]` foi executada nesta etapa.

### 2.3 Gate de CI

- **Script**: `scripts/check-migrations-sync-log-gate.mjs`. Compara
  `git diff --name-only --diff-filter=ACMR <base>...HEAD --
  supabase/migrations` contra todo token entre crases em
  `supabase/MIGRATIONS_SYNC_LOG.md` que pareça uma `versão` de migration
  (regex `` `(\d{8,19}(?:_[A-Za-z0-9]+)*)` `` — cobre canônico 14 dígitos,
  malformado 19 dígitos e não-canônico `20260623_bugalert1`; hashes
  SHA-256/MD5 não colidem, confirmado por teste dedicado). Segue o padrão de
  graceful-degradation de `scripts/check-result-contract.mjs`
  (`CHECK_RESULT_STATUS`, `concludeCheck`): `passed`/`failed` no caminho
  normal, `inconclusive` (exit 2) só se o log não existir ou o `git diff`
  não puder ser calculado (ex. clone raso sem a base) — nunca um
  passed/failed silencioso por causa alheia ao conteúdo da PR. 100%
  local/git, sem credencial Supabase.
- **Teste**: `tests/scripts/check-migrations-sync-log-gate.test.mjs`, 20
  testes — funções puras (`extractMigrationVersion`,
  `extractRegisteredVersions` incluindo o caso "não confunde hash com
  versão", `changedMigrationFilenames`, `evaluateSyncLogGate`,
  `resolveBaseRef`) + `runCheck` fim-a-fim com `diffOutput`/`logContent`
  injetados (falha quando falta recibo, passa quando presente, passa
  trivialmente quando o diff não toca migrations, inconclusive sem log e
  sem git utilizável) + um smoke test de integração que lê o
  `MIGRATIONS_SYNC_LOG.md` real do repo.

  Evidência de execução nesta sessão:
  ```
  $ npx vitest run tests/scripts/check-migrations-sync-log-gate.test.mjs
  Test Files  1 passed (1)
       Tests  20 passed (20)

  $ npx eslint scripts/check-migrations-sync-log-gate.mjs tests/scripts/check-migrations-sync-log-gate.test.mjs
  (sem erros)

  $ node --check scripts/check-migrations-sync-log-gate.mjs
  syntax ok
  ```

  **Demonstração com dados reais** (`node scripts/check-migrations-sync-log-gate.mjs --base main`,
  rodado contra o diff real desta branch `claude/audit-gaps-20260915` vs
  `main`): o gate **falhou** corretamente, apontando 6 de 7 migrations novas
  desta branch (`20260512000000_bootstrap_missing_application_schemas.sql`,
  `20260601140841_09e0073b-18f6-4003-b416-da44bb9d14f8.sql`,
  `20260916193000_e25_...sql`, `20260916200000_e17_...sql`,
  `20260916201000_e19_...sql`, `20260916202000_e23_...sql`) sem recibo no
  log — esperado: são arquivos adicionados por outras etapas (E17/E19/E23/E25
  e drafts) nesta mesma sessão multi-etapa, ainda não aplicados/ledgerados no
  banco canônico, portanto legitimamente ausentes do backfill (que só cobre
  o que **já foi aplicado**). Não é um bug do gate — é exatamente o
  comportamento pretendido (bloquear PR sem recibo), e confirma que o gate
  funciona com sinal real, não só com fixtures sintéticas.

- **Wiring em CI**: workflow novo e dedicado
  `.github/workflows/migrations-sync-log-gate.yml` (`pull_request`,
  `branches: [main]`, `paths: ["supabase/migrations/**"]` — só dispara
  quando o PR toca migrations; `fetch-depth: 0` no checkout para garantir
  `origin/<base>` disponível). YAML validado com `yaml.safe_load` (Python).
  Não usa `npm ci` — o script só usa módulos nativos do Node, então o
  workflow fica mais leve e com menos superfície de falha.

  **Por que workflow dedicado e não um step em `quality-gate.yml`**:
  `quality-gate.yml` roda em **todo** PR (`branches: [main]`, sem filtro de
  `paths`) — um step ali executaria em 100% dos PRs só para, na prática,
  fazer early-return em quase todos (poucos tocam
  `supabase/migrations/**`). Mesma decisão de design já usada por
  `schema-snapshot-export.yml` (E46) e `ddl-out-of-band-detector.yml`
  (E12).

  **npm script**: `check:migrations-sync-log-gate` adicionado a
  `package.json`, mesmo padrão de `ledger:verify-statements` (E11).

---

## 3. Pendência de wiring deliberadamente não resolvida nesta sessão

A E11 já tinha criado `scripts/check-ledger-statements-gate.mjs`
(`ledger:verify-statements`) sem plugá-lo em nenhum workflow — gap
documentado por aquela sessão. Avaliei resolver os dois wirings juntos
(E48 depende de E11 no plano), mas decidi **não** empacotar: são gates com
fontes de dados e modos de falha diferentes — E48 é git-diff local,
síncrono, sem credencial; E11 precisa de
`SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF` via Management API e já tem
comportamento `inconclusive` documentado para quando a credencial falta.
Acoplar os dois no mesmo workflow tornaria o novo workflow do E48 menos
previsível sem necessidade real. **Fica como pendência documentada** (igual
ao padrão que a própria E11 já usou): plugar `ledger:verify-statements` em
`quality-gate.yml` (ou em workflow próprio com credencial) é trabalho
independente, fora do escopo desta etapa.

---

## 4. Verificação final antes de fechar

Antes de escrever a versão final de `supabase/MIGRATIONS_SYNC_LOG.md`, o
arquivo foi relido integralmente e comparado (via `diff`) contra a cópia
feita antes de qualquer edição — confirmado que todo o conteúdo prévio
(incluindo as seções de E11 e E46, escritas por sessões irmãs em paralelo)
está preservado sem alteração dentro de `## Legado — não verificado`.
Nenhuma escrita foi feita no banco por esta etapa: a única interação com o
Supabase foi leitura (`mcp__supabase__execute_sql`, `SELECT` puro, via
`pg_catalog`/tabela do sistema — nunca PostgREST, REGRA #8 corolário).

---

## 5. Resumo do que fica `[REQUER-PO]`

Nada foi aplicado por esta etapa. Ficam como propostas, exatamente como já
estavam antes de E48 (que só as **registrou** no novo formato, não as
executou):
- E08 Lote 2 (179 versões, `repair` proposto).
- E09: 2 stubs (`repair --status reverted` proposto) + 1 backfill de arquivo
  canônico + `repair --status applied` (proposto) para
  `20260623_fix_google_provider_secret_name`.
- `2026062311292414001` (ID malformado): sem remediação proposta — decisão
  explícita de não mexer, por já ser internamente consistente.
