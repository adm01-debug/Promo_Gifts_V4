# origin/fix/e2e-url-state-defaults-20261030

- **Veredito:** RESGATAR_PARCIAL  ·  **Confiança:** alta
- **O que isso faz pelo negócio:** fecha uma brecha no controle automático de segurança das bibliotecas do sistema (hoje ele pode deixar passar uma falha conhecida que já tem correção disponível) e repõe o arquivo de "desfazer" de uma mudança de banco já aplicada em produção.
- **Tip / merge-base / main:** tip `3de80569caeb50064a9d595d9b1ed56b6ea26f11` · merge-base `ec06a45724e7b907315d7b454cea63a7a38fdc91` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

Contexto decisivo: esta branch era o head da PR [#2941](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2941), que foi **fechada sem merge** (`merged_at: null`, `closed_at: 2026-11-07T02:43:21Z`, `mergeable_state: dirty`). Logo, nada dela entrou na main por essa PR — o que está na main hoje chegou por outros caminhos, item por item.

## O que a branch quis fazer

Pelas mensagens dos 30+ commits, a branch acumulou cinco frentes (o nome da branch não descreve mais o conteúdo):

1. **Gate de auditoria de dependências** (`6706f8ed29`, finding Qodo HIGH): a função que decide se um alerta de vulnerabilidade da cadeia do ESLint pode continuar "liberado" só checava `fixAvailable` para o pacote `minimatch`. Para os outros pacotes da cadeia, um alerta que passasse a ter correção compatível continuaria liberado para sempre. A branch adicionou essa checagem + 2 testes negativos.
2. **Allowlist de funções SECURITY DEFINER** (`085dd48e6e`, `c6f7241b96`, `e94b22e5a4`, `f26ffb0e6d`): remover entrada obsoleta `mcp_kv_get`, acrescentar `perf002_drop_unused_snapshot_indexes` e `cleanup_expired_auth_sessions`, e corrigir metadados errados (PR, contagem de índices, documento inexistente) e a afirmação falsa de que o REVOKE já tinha sido aplicado.
3. **URL compartilhável da aba do painel de estoque** (`29db0c1ab8`): quando a preferência salva no navegador do usuário era igual ao default, o `?tab=` era apagado da URL e um segundo usuário abria a aba errada.
4. **Arquivo de rollback faltante** (`35971ec40c`): a migration `20261101140001_sb0001_remove_auth_users_realtime` foi aplicada sem o arquivo de reversão exigido pelo preflight (E058/E063).
5. **Deduplicação do log de migrations** (`f9e6536add`) e ~20 commits de documentação de CI (`PENDENCIAS.md`, `RELATORIO_CI.md`) — fotografias do estado dos checks em 2026‑11‑01/02.

## Item por item: está na main?

| item | onde está na main (ou NÃO ESTÁ) | evidência |
|---|---|---|
| Checagem de `fixAvailable` para pacotes não‑`minimatch` da cadeia ESLint | **NÃO ESTÁ** | `git show origin/main:scripts/check-dependency-audit.mjs \| grep -n fixAvailable` → só linhas 244 (dentro do ramo `if (packageName === 'minimatch')`) e 407 (`hasExpectedFixAvailable`, cadeia `pptxgenjs`, outra família). Entre a checagem de `isDirect` (linha 237‑239) e o "Effects check" (linha 275) não há verificação de `fixAvailable`. `git log -S"isKnownSemVerMajorFix" origin/main` → vazio (o símbolo nunca entrou). |
| 2 testes negativos do gate (`fixAvailable` com `isSemVerMajor: false`; `fixAvailable: false`) | **NÃO ESTÁ** | `git show origin/main:tests/scripts/check-dependency-audit.test.mjs \| grep -n "fixAvailable changed\|fixAvailable is false"` → sem resultado; só existe o teste de `effects` (linha 338, "Regression for Qodo HIGH finding"). |
| `supabase/rollbacks/20261101140001_rollback.sql` | **NÃO ESTÁ** — e a migration correspondente está na main **e** no ledger de produção | `git ls-tree origin/main --name-only supabase/rollbacks/ \| grep 20261101` → `20261101150000`, `20261101190101`, `20261101201000`, `20261101202000` (sem `20261101140001`). `git ls-tree origin/main supabase/migrations/ \| grep 20261101140001` → `20261101140001_sb0001_remove_auth_users_realtime.sql` presente. `SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='20261101140001'` → 1. Exigência: `scripts/preflight-migration-apply.mjs:313` ("arquivo de rollback … não encontrado", E058/E063). |
| URL compartilhável da aba de estoque (`stockTabDefault`) | **ESTÁ**, refatorada para módulo próprio | `git show origin/main:src/components/inventory/stockTabDefault.ts` → `export function initialStockTab(reliabilityFlag, readPref, search = …)` com a mesma lógica dos dois cenários; `StockDashboard.tsx` da main importa `initialStockTab` e faz `useState(() => initialStockTab(reliabilityFlag, readActiveTabPref))`. |
| Remoção da entrada obsoleta `public.mcp_kv_get(...)` da allowlist | **ESTÁ** | `git show origin/main:.security/lint-0029-allowlist.json \| grep mcp_kv_get` → sem resultado. |
| Inclusão de `perf002_drop_unused_snapshot_indexes` e `cleanup_expired_auth_sessions` na allowlist | **ESTÁ** | mesma allowlist na main: linha 411 (`perf002_drop_unused_snapshot_indexes()`) e linha 39 (`cleanup_expired_auth_sessions()`). |
| Contrapartida das 2 funções em `docs/security/ALLOWLISTS_MEMORY.md` (gate de cross-check) | **ESTÁ** | `git show origin/main:docs/security/ALLOWLISTS_MEMORY.md` linhas 185 e 186 — uma entrada para cada função. (A branch havia criado entradas **duplicadas** da mesma função; a versão da main é a correta.) |
| Texto "RISCO RESIDUAL ATIVO" do `perf002` (REVOKE pendente) | **NÃO ESTÁ** — e ficou **obsoleto**: a função não existe mais em produção | `SELECT count(*) FROM pg_proc … proname='perf002_drop_unused_snapshot_indexes'` → **0** no projeto `doufsxqlfjyuvxuezpln`. A main já traz a migration `20261101202000_drop_revoke_agent_created_functions.sql` com `DROP FUNCTION IF EXISTS public.perf002_drop_unused_snapshot_indexes();`. Não há risco a documentar. |
| Remoção das 8 entradas duplicadas em `supabase/MIGRATIONS_SYNC_LOG.md` (teste E48) | **ESTÁ** (efeito presente) | contagem por versão no arquivo da main: `20261027120000`→1, `140000`→1, `160000`→1, `180000`→1, `220000`→0, `230000`→0, `233000`→0, `234500`→0. Nenhuma duplicata. |
| Ajuste de texto em `analise-branches/dossies/devin-probe-e184-legacy-refs.md` | **ESTÁ**, com redação melhor | diff (B) do pacote: a main tem `**Busca por referências ao projeto legado \`pqpdolkaeqlyzpdpbizo\` [LEGACY_INFORMATIVO] nesta sessão:**`. |
| ~20 commits de `PENDENCIAS.md` / `RELATORIO_CI.md` (estado do CI em 2026‑11‑01/02, PR #2941, runs enfileirados) | **SUPERADO** — a main reescreveu os dois arquivos | diff (B): `PENDENCIAS.md` na main começa com "Gerado em: 2026-11-08 … Atualizado em: 2026-11-09T01:30", título "Workflows com falha não corrigível nesta sessão", `@@ -1,2422 +1,1090 @@`. São fotografias de CI de uma PR fechada, sem valor hoje. |

## A resgatar

1. **`scripts/check-dependency-audit.mjs` — checagem de `fixAvailable` fora do ramo `minimatch`.** Inserir o bloco entre a checagem de `isDirect` (linha 237) e o "Effects check" (linha 275) da main: aceitar só `fixAvailable === true` ou o objeto semver-major conhecido (`eslint-plugin-unused-imports@1.1.3`, `isSemVerMajor: true`); qualquer outro objeto (p. ex. `isSemVerMajor: false`) ou `false` reprova. **Por que importa:** sem isso, os 6 pacotes diretos + transitivos da cadeia do ESLint continuam na lista de exceções mesmo quando a correção da falha já estiver disponível — o controle automático deixa de avisar que é hora de atualizar.
2. **`tests/scripts/check-dependency-audit.test.mjs` — os 2 testes negativos.** Sem eles, o item 1 pode ser desfeito por qualquer refatoração futura sem ninguém perceber.
3. **`supabase/rollbacks/20261101140001_rollback.sql`.** 5 linhas, só documentação de reversão (`ALTER PUBLICATION supabase_realtime ADD TABLE auth.users;` com aviso explícito de exposição de PII). Não aplica nada. **Por que importa:** a mudança de banco correspondente já está em produção sem plano de reversão versionado, e o preflight (`scripts/preflight-migration-apply.mjs:313`) exige o arquivo.

## Risco de fechar esta branch

Fechar sem resgatar os 3 itens acima deixa dois buracos permanentes: (a) o controle automático que vigia falhas de segurança nas bibliotecas de desenvolvimento pode continuar ignorando uma falha que já tem correção pronta — ninguém será avisado; (b) uma mudança feita no banco de produção fica sem o arquivo que descreve como desfazê-la, e a conferência automática de migrations continua reclamando desse arquivo.

Os demais itens (URL compartilhável do estoque, allowlist de segurança, log de migrations, documentação de CI) já estão na main ou ficaram obsoletos — fechar não perde nada ali.

## Não verificado

- Se os 3 itens a resgatar passam `lint`/`typecheck`/`vitest` aplicados sobre a main de hoje: não foi executado nenhum comando de build ou teste nesta análise (só leitura de git e consulta somente-leitura ao banco).
- Por qual PR/commit cada item incorporado chegou à main: verificado por comportamento (símbolo, arquivo, conteúdo), não por rastreio de autoria.
- Por que a migration `20261101202000` não consta do ledger de produção (`SELECT … WHERE version='20261101202000'` → 0) embora a função já esteja ausente do banco. Fora do escopo desta branch, mas é uma divergência real entre ledger e schema.
