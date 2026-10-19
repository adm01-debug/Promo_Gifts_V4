# E42 — Edge Functions: hash do bundle (não só nome) + allowlist de `verify_jwt=false` (2026-09-16)

Etapa do `PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`. Sem
migration, sem DDL, sem deploy — só extensão de gate de CI (workflow +
script novo + allowlist), executado em modo `[RO]` contra a Management API.

---

## 1. Método `[RO]`

Contagem e paridade nome-a-nome confirmadas via `mcp__supabase__list_edge_functions`
(`GET /v1/projects/doufsxqlfjyuvxuezpln/functions`): **108 funções ao vivo**,
todas com os campos `slug`, `verify_jwt` e `ezbr_sha256`. Detalhe por função
(inclui `files: [{name, content}]` do bundle deployado) confirmado via
`mcp__supabase__get_edge_function` para `crm-db-bridge`, usado como amostra
para investigar o formato de `ezbr_sha256` e o conteúdo real do bundle (§2 e §3).

`.security/edge-functions-verify-jwt-false-allowlist.json` e
`scripts/check-edge-verify-jwt-allowlist.mjs` foram criados nesta etapa.
`.github/workflows/edge-functions-drift-check.yml` foi estendido (não
substituído) com dois novos passos e o step de hash existente foi reescrito
para comparar um manifesto completo de arquivos em vez de só `index.ts`
(§4).

---

## 2. Achado #1 — `ezbr_sha256` não é reproduzível localmente

O campo `ezbr_sha256`, exposto pela Management API por função, não tem
algoritmo documentado publicamente — a documentação oficial da Supabase
declara o campo só como `string` opcional, com valor de exemplo placeholder
(`"lorem"`), sem especificar hash de quê (arquivo único? concatenação
ordenada? nome+conteúdo? por caminho?).

Testado empiricamente contra os dados reais de `crm-db-bridge` (9 arquivos
retornados pelo bundle deployado): 5 candidatos de algoritmo — hash da
concatenação na ordem retornada pela API, hash da concatenação ordenada por
nome, hash de `nome+conteúdo` concatenado e ordenado, hash-dos-hashes
(sha256 de cada arquivo, depois sha256 da lista ordenada) e hash só dos
índices/posições — **nenhum bateu** com o `ezbr_sha256` ao vivo.

**Decisão:** `ezbr_sha256` é tratado como campo de observabilidade apenas
(capturado no relatório `--out=` do script novo para inspeção manual/futura
investigação), nunca usado como critério de pass/fail do gate. O critério de
pass/fail de conteúdo é o hash canônico calculado localmente via
`supabase functions download` (método já existente no workflow, ver §4) —
que é reproduzível porque tanto o "canônico" quanto o "repo" são hasheados
com o mesmo algoritmo (`sha256sum`) pelo próprio workflow.

---

## 3. Achado #2 — bundle deployado exclui arquivos de teste (`*.test.ts`)

Antes de estender a comparação de hash, era preciso saber exatamente que
arquivos entram no bundle real, porque várias functions têm arquivos
`*.test.ts` co-localizados no mesmo diretório (ex.: `crm-db-bridge` tem 7:
`ping.test.ts`, `breaker-status.test.ts`, `creds_health.test.ts`,
`diag.test.ts`, `inspectInsertResult.test.ts`, `singleton-client.test.ts`,
`firstRowAsRecord.test.ts`).

Confirmado via `mcp__supabase__get_edge_function('crm-db-bridge')`: o bundle
deployado retorna exatamente 9 arquivos — `index.ts` + 8 arquivos sob
`_shared/` que o `index.ts` de fato importa (`cors.ts`, `bot-protection.ts`,
`security.ts`, `circuit-breaker.ts`, `external-fetch.ts`, `request-id.ts`,
`credentials.ts`, `kill_switch.ts`) — **nenhum** dos 7 `*.test.ts` locais.

**Consequência para o design do gate:** se a comparação de hash tivesse sido
implementada como "hashear tudo no diretório local da function", o gate
começaria a reportar DRIFT falso-positivo em toda function com teste
co-localizado (pelo menos `crm-db-bridge` [8 arquivos locais no total],
`simulation-orchestrator` [4], `connections-auto-test` [4],
`webhook-inbound` [3], `voice-agent` [3], `visual-search` [3],
`product-webhook` [3], `magazine-import-local` [3],
`ema-pipeline-health` [3], e mais 7 com 2 arquivos) — quebrando
silenciosamente o gate hoje verde ("MODO ENFORCE").

**Decisão de design:** o step `hash_diff` usa o **manifesto de arquivos do
próprio download canônico** (`supabase functions download --use-api`) como
lista de arquivos de referência — para cada caminho relativo devolvido pelo
download, hasheia o arquivo correspondente no repo local (ou reporta
`MISSING` se ausente) — em vez de escanear o diretório local. Isso exclui
testes corretamente (por construção, já que a Supabase não deploya
`*.test.ts`) **e** passa a cobrir `_shared/*.ts` importado, que a
comparação antiga (só `index.ts`) nunca cobria.

---

## 4. Mudança no workflow (`edge-functions-drift-check.yml`)

Extensão, não substituição — os passos existentes (paridade de slug,
detecção de órfã/faltante, comentário em PR, issue agendada, falha se
drift) continuam intactos. Mudanças:

1. **Step `hash_diff` reescrito**: CSV agora é
   `slug,status,repo_sha256,canonical_sha256,files_compared,notes`. Constrói
   `canon_manifest` a partir de `find supabase/functions -type f | sort |
   xargs sha256sum` sobre o diretório baixado pelo `supabase functions
   download` (o manifesto real do bundle, ver §3), depois hasheia os mesmos
   caminhos relativos no repo local para montar `repo_manifest` — ambos os
   manifestos são produzidos via `$(...)` (mesma normalização de
   quebra-de-linha final; um bug de teste manual mostrou que misturar
   `$(...)` com concatenação manual de string produzia hashes diferentes
   para conteúdo logicamente idêntico — corrigido antes de aplicar ao
   workflow real, ver commit desta etapa).
2. **Novo step "Verify_jwt per function — allowlist gate (E42)"**
   (`continue-on-error: true`): roda
   `node scripts/check-edge-verify-jwt-allowlist.mjs --require-live
   --out=/tmp/verify_jwt_report.json`, captura o exit code em
   `$GITHUB_OUTPUT`.
3. **Novo step "Upload verify_jwt report"** (`if: always()`): sobe o
   relatório como artifact (`if-no-files-found: ignore`, não quebra se o
   passo anterior não rodou).
4. **Novo step final "Fail if verify_jwt allowlist gate failed"**: falha o
   job (`exit 1` com `::error::`) se o exit code do gate ≠ 0. Adicionado
   **depois** do step existente "Fail if drift detected" (não o substitui).

Validado: `python3 -c "import yaml; yaml.safe_load(...)"` — parse limpo, 13
steps no job `drift` (era ~9 antes desta etapa). `actionlint
.github/workflows/edge-functions-drift-check.yml` — 0 issues.

**Limitação conhecida, sinalizada explicitamente:** este sandbox não tem
`SUPABASE_ACCESS_TOKEN`/credenciais de deploy para rodar `supabase functions
download` de verdade. A lógica do `hash_diff` reescrito foi validada via (a)
3 cenários manuais isolados em bash (aligned / content-drift / file-missing
— todos corretos após a correção do bug de quebra-de-linha) e (b) parse
YAML + `actionlint`, mas **ainda não foi exercitada em uma execução real do
CI** contra o download ao vivo. Recomendado: observar o primeiro run real
deste workflow após merge (agendado ou disparado manualmente) antes de
considerar o `hash_diff` "provado em produção".

---

## 5. Allowlist de `verify_jwt=false` — 36 entradas, zero drift

Reconfirmado ao vivo nesta etapa (mesma consulta usada para a contagem de
108, §1): **36 das 108 funções têm `verify_jwt=false`** — batendo com o "30+"
citado no plano.

`supabase/config.toml` tem exatamente 36 blocos `verify_jwt = false`
explícitos — **cross-check 1:1 com a lista ao vivo: zero divergência**
(nenhuma função com `verify_jwt=false` ao vivo que não esteja também assim
declarada em `config.toml`, e vice-versa).

`.security/edge-functions-verify-jwt-false-allowlist.json` foi criado
espelhando o formato de `.security/rls-no-policy-allowlist.json`
(`{description, documented_in, manifest_ref, snapshot_date, functions:
[{slug, category, reason}]}`), com as 36 entradas. Todo `reason` é
específico e fundamentado em código — fonte primária
`supabase/functions/_shared/edge-authz-manifest.ts` (SSOT já existente,
consumido por `scripts/check-edge-authorization.mjs` e
`tests/security/edge-authz-bypass.test.ts`) e/ou o comentário original em
`supabase/config.toml`. Nenhuma entrada usa o placeholder "motivo não
confirmado" — todas as 36 têm evidência concreta:

- **`public` (9)**: `check-login`, `get-visitor-info`, `image-proxy`,
  `log-login-attempt`, `magazine-public-react`, `magazine-public-view`,
  `magazine-reader-state-read`, `magazine-reader-state-write`,
  `webhook-inbound` — rotas chamadas antes do login (sem sessão JWT ainda),
  leitura/reação anônima por token de alta entropia, proxy público de
  imagem, ou validadas por HMAC inline.
- **`authenticated` (via cron `x-cron-secret`/`authorizeCron`, não JWT do
  gateway) (17)**: `ai-recommendations`, `cleanup-notifications`,
  `cleanup-novelties`, `collections-watcher`, `comparison-price-watcher`,
  `connections-auto-test`, `connections-health-check`, `favorites-watcher`,
  `magazine-import-local`, `ownership-audit`, `process-queue`,
  `process-scheduled-reports`, `quote-followup-reminders`, `send-digest`,
  `send-notification`, `send-scheduled-reports`, `webhook-dispatcher`.
- **`service` (4)**: `asia-ingestion`, `backfill-image-dimensions`,
  `crm-callback-alerts`, `sync-external-db` — cron/service-role/segredo
  comparado em tempo constante, sem sessão JWT (pg_cron não tem).
- **`supervisor` (1)**: `crm-callback-reprocess` — admin/dev via `has_role`
  inline.
- **`scoped` (3)**: `crm-db-bridge`, `mcp-server` — RBAC/token custom
  in-function; `receive-crm-callback` — `x-api-key` HMAC comparado em tempo
  constante.
- **`dev` (2)**: `e2e-cleanup`, `external-db-inspect` — dev-only, checagem
  `is_dev()`/segredo compartilhado inline.

Total: 9 + 17 + 4 + 1 + 3 + 2 = 36, batendo com a contagem de §5 e o JSON
(`.security/edge-functions-verify-jwt-false-allowlist.json`).

---

## 6. Script novo — `scripts/check-edge-verify-jwt-allowlist.mjs`

Segue o padrão dos scripts irmãos (`check-secdef-anon-drift.mjs`,
`check-public-views-drift.mjs`): busca ao vivo própria (fetch direto a
`https://api.supabase.com/v1/projects/{ref}/functions` com
`Authorization: Bearer $SUPABASE_ACCESS_TOKEN` — o endpoint `/functions` não
é SQL, então não reusa `scripts/supabase-read-only-query.mjs`), degradação
graciosa (`static-pass` sem token e sem `--require-live`; `inconclusive`
com `--require-live` e sem token), `--from-file=`, `--out=`,
`--update-allowlist`.

Exporta funções puras testadas isoladamente:
`normalizeFunctions(raw)` (aceita array ou `{functions:[...]}`, exclui
`_shared`/`tests` defensivamente, normaliza `verify_jwt`/`ezbr_sha256`),
`loadAllowlist(path)`, `diff(liveFunctions, doc)` → `{newFindings,
missingReasons, staleAllowlist}`.

Modos de saída testados manualmente (todos corretos):
`--from-file=/tmp/edge_functions_live.json` → `passed` (exit 0);
sem token/sem `--require-live` → `static-pass` (exit 0); sem token/com
`--require-live` → `inconclusive` (exit 2); função nova injetada com
`verify_jwt=false` → `failed`, exit 1, listada em `newFindings`;
`--update-allowlist` → adiciona entrada placeholder só quando há algo novo,
no-op caso contrário.

Reconfirmado nesta etapa (`--from-file=/tmp/edge_functions_live.json`
contra o snapshot ao vivo de 108 funções):

```
[edge-verify-jwt-allowlist] passed: 36 função(ões) com verify_jwt=false —
todas documentadas na allowlist (108 function(s) no total)
```

Exit code 0.

---

## 7. Testes

`tests/scripts/check-edge-verify-jwt-allowlist.test.mjs` — 13 testes, todos
passando:

- `normalizeFunctions`: aceita array direto e shape `{functions:[...]}`;
  exclui `_shared`/`tests`; normaliza `verify_jwt` ausente/estranho para
  `false` só quando `!== true`; devolve `[]` para payload inválido.
- Allowlist real: carrega e tem ≥36 entradas; toda entrada tem
  `slug`/`category`/`reason` não-vazios; sem slugs duplicados.
- `diff`: passa sem findings quando tudo está documentado; falha com
  `newFindings` para função nova não documentada; falha com
  `missingReasons` para `reason` vazio/só-espaço; sinaliza
  `staleAllowlist` quando uma função documentada deixou de ser
  `verify_jwt=false` ao vivo; confirma que uma função simplesmente ausente
  da consulta ao vivo (não retornada) não gera falso-positivo em
  `newFindings`.

```
Test Files  1 passed (1)
     Tests  13 passed (13)
```

`npx eslint scripts/check-edge-verify-jwt-allowlist.mjs
tests/scripts/check-edge-verify-jwt-allowlist.test.mjs` — 0 issues (exit 0).

Suíte completa `tests/scripts/` (19 arquivos, inclui os novos + os 18 já
existentes) — 160 testes, todos passando, nenhuma regressão introduzida.

---

## 8. Resumo

| Item | Status |
|---|---|
| 108/108 funções com paridade de nome confirmada | Já existia (workflow prévio), reconfirmado |
| 108/108 com hash comparado | Extensão nova (`hash_diff` reescrito, manifesto completo em vez de só `index.ts`); lógica validada localmente, **primeira execução real em CI ainda pendente** |
| `ezbr_sha256` reproduzido localmente | Não é possível (algoritmo não documentado) — tratado como campo de observabilidade, não usado em pass/fail |
| Drift de conteúdo real encontrado | Nenhum detectado na comparação de slug/paridade (inalterada); comparação de conteúdo full-manifest ainda não rodou contra dado ao vivo neste sandbox |
| Allowlist de `verify_jwt=false` | 36 entradas, todas com motivo fundamentado em código — zero drift vs. `config.toml` e vs. Management API ao vivo |
| `tests/` excluído explicitamente | Sim — `EXCLUDE = new Set(['_shared', 'tests'])` em `normalizeFunctions`, testado |
| Gate falha se função pública nova não documentada | Sim — testado com função sintética (`failed`, exit 1) |
| Testes novos | 13/13 passando, 0 issues eslint |
| Regressão em `tests/scripts/` | Nenhuma — 160/160 passando |
