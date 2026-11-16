# origin/claude/laughing-cori-o9w35e

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Era a limpeza da esteira de testes automaticos (CI) de 02/11 — nada que o usuario veja na tela; praticamente tudo de util dela ja esta no sistema de hoje, sobrou um unico ajuste de qualidade de codigo no alerta de ruptura de estoque.
- **Tip / merge-base / main:** tip `7583533933cdf34d396fd012ef97f84d5949a252` · merge-base `df94410cbbcbe7d80928a279de91214d88b0d4bb` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Era a branch da PR #3028 (30 commits, todos de 02/11/2026). Pelas mensagens de commit, o agente tinha quatro objetivos:

1. **Destravar workflows bloqueados pela politica de GitHub Actions da organizacao** — a action `supabase/setup-cli@v2` e as actions de SBOM/atestado estavam barradas, e o agente as substituiu por instalacao nativa via `wget` (commits `ca32b695d5`, `71ccab54ed`, `13b87aadbd`, `7d20c4002c`) ou simplesmente removeu os steps (`deploy-gates.yml`).
2. **Reparar um gatilho de banco que sumiu em producao** — migration `20261102063000_repair_kill_switch_hits_anon_rate_guard.sql` recriando `trg_anon_rate_guard` em `public.kill_switch_hits`, com recibo no `MIGRATIONS_SYNC_LOG.md` (commits `1f3a1734e2`, `1d93c3d516`).
3. **Fazer os portoes de lint/tipos passarem** — tirar `eslint-disable` de `useRuptureAlerts.ts` trocando por `untypedRpc`, trocar `import()` inline por `import type` no kit-builder, dar mais memoria ao `check-eslint-baseline.mjs`, sincronizar as baselines (commits `73b6648530`, `80f477ef5e`, `889e81b22b`, `115e8a93d7`, `1659dda6b3`).
4. **Documentar exaustivamente o estado da CI** — ~20 commits so de `PENDENCIAS.md` e `RELATORIO_CI.md` (itens P7, P35–P65, secoes 8 a 15 do relatorio).

A PR #3028 **nunca foi mergeada**: `git log origin/main --grep="#3028"` nao retorna nenhum commit. Mesmo assim, quase todo o conteudo chegou a main por outras PRs.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Migration de reparo `20261102063000` (trigger `trg_anon_rate_guard`) | **Esta.** Arquivo identico na main (nao aparece na lista de 20 arquivos divergentes) | `git log origin/main -- supabase/migrations/20261102063000_repair_kill_switch_hits_anon_rate_guard.sql` → `b89a44e100 fix(db): trem de banco ... (#3665)` |
| Recibo da migration no ledger (sha256 `1cfc7343…`) | **Esta**, com o mesmo sha256 e nota mais recente de 15/11 | `supabase/MIGRATIONS_SYNC_LOG.md:1693` na main: `` `20261102063000` … `1cfc7343ea254805b19c765fbce566eb3acd23f6aea36fa2b35fd38623ce2226` `` |
| Remocao das 8 entradas duplicadas "pendente" `20261027*` no ledger | **Esta.** Sem duplicatas na main | `git show origin/main:supabase/MIGRATIONS_SYNC_LOG.md \| grep -c 20261027120000` → `1`; grep do texto "a ser aplicado via db-apply-migration.yml após merge do PR #2603" → `0` |
| `import type { KitOrigin }` em `KitMakerLanding.tsx` | **Esta** | `origin/main:src/components/kit-builder/KitMakerLanding.tsx:30` = `import type { KitOrigin } from '@/lib/kit-builder/types';`; trazido por `8bc5078dbc` (PR #3023) |
| Mesmo ajuste em `useKitBuilderPageState.ts` | **Esta** | arquivo no `--stat` de `8bc5078dbc` (PR #3023) |
| Reordenacao de `KitOrigin` em `src/lib/kit-builder/types.ts` | **Esta** | `git show origin/main:src/lib/kit-builder/types.ts` linha 177: `export type KitOrigin = 'ai' \| 'manual' \| 'template';` |
| `lint-staged` com `--max-old-space-size=4096` no `package.json` | **Esta** | `origin/main:package.json:312` |
| `NODE_OPTIONS=--max-old-space-size=4096` no `scripts/check-eslint-baseline.mjs` | **Esta**, e a main foi alem (guarda `existsSync(out)`) | `origin/main:scripts/check-eslint-baseline.mjs:86` e `:94` |
| `fn_get_rupture_alerts` registrado no catalogo de referencias Supabase | **Esta**, com justificativa muito mais completa | `origin/main:audit/supabase-reference-catalog.temporary.json:453-457`; veio por `a697b04632` (#3048). A main tem ainda a migration `supabase/migrations/20261112011000_fix_sb0003_fn_get_rupture_alerts.sql` que cria a funcao — passo que a branch nao tinha |
| Limpeza da referencia morta `devin-probe-e184-legacy-refs` em `.migration-refs-baseline.json` | **Esta** | `git show origin/main:.migration-refs-baseline.json \| grep -c devin-probe-e184-legacy-refs` → `0` |
| Baselines `.as-assertions-baseline.json` / `.file-size-baseline.json` sincronizadas | **Superadas.** A main regerou depois | `generatedAt` na main = `2026-11-09T15:36:00.000Z` (branch: `2026-11-02T05:52:50.773Z`) |
| Troca de `supabase/setup-cli` por `wget` nativo em 5 workflows | **NAO ESTA — e nao deve estar.** A politica de Actions foi liberada e a main voltou a usar a action, num SHA mais novo, em 12 lugares | `git grep -n setup-cli origin/main -- .github/workflows/` → `supabase/setup-cli@689adcfb80d947100a1eab127289b97d1fb07b13 # v2` (a branch fugia do SHA antigo `45a513f8c6…`) |
| Remocao dos steps de SBOM e atestado de proveniencia do `deploy-gates.yml` | **NAO ESTA — e bom que nao esteja.** A main mantem os dois | `origin/main:.github/workflows/deploy-gates.yml:784` `anchore/sbom-action@66cbf4bc…` e `:791` `actions/attest-build-provenance@4d101475…` |
| Troca de `dorny/paths-filter` por `git diff` cru na deteccao docs-only | **NAO ESTA.** A main mantem a action e ampliou a logica (saidas `ledger` e `segredos`) | `origin/main:.github/workflows/deploy-gates.yml:86` e `:122-130`, `:205` |
| Pedido documental de `mode=repair-only` obrigatorio no `db-apply-migration.yml` (finding Qodo HIGH, P36) | **Esta, implementado em codigo** (a branch so documentava) | `origin/main:.github/workflows/db-apply-migration.yml:35-41` (input `mode: repair-only`) e `:78-98` (guarda E051 `ack_baseline_rotation`) |
| Diagnostico do ledger fora de sincronia (P7: `local_only=1140; remote_only=673`) | **Esta**, com numeros atualizados | `origin/main:PENDENCIAS.md` item **P-02**: `local_only=1144; remote_only=678` |
| Itens P7, P35–P65, `P_INFRA`, `P_EDGE_DRIFT`, `P_TIMEOUT` do `PENDENCIAS.md` | **Numeracao extinta.** A main reescreveu o arquivo em 08–09/11 com numeracao `P-01…P-19`; zero ocorrencias dos codigos antigos | `for p in P7 P40 P47 P65 …; do git show origin/main:PENDENCIAS.md \| grep -c "\b$p\b"; done` → todos `0`. Cabecalho da main: `> Gerado em: 2026-11-08` |
| Secoes 8–15 do `RELATORIO_CI.md` | **Substituidas.** A main vai de `§16` a `§33`, datadas de 07–08/11 | `git show origin/main:RELATORIO_CI.md \| grep "^## "` → comeca em `## 16. Baseline Local — Sessão 2026-11-07` |
| Temas dos itens documentais (Uptime Monitor, Magazine Header, swatch/QuickView, Personalization, Vercel preview, Kit Coverage, replenishment) | **Cobertos** na versao nova do `PENDENCIAS.md` | contagens em `origin/main:PENDENCIAS.md`: Uptime 7, Magazine Header 10, swatch 16, Personalization 9, Vercel 8, replenishment 4, Kit Coverage 1 |
| Diagnostico "E2E rupture-horizon falha por credencial `E2E_ADMIN` ausente" (P63) | **Coberto estruturalmente**, fora do PENDENCIAS | `E2E_ADMIN` documentado em `origin/main:docs/ci/SEGREDOS.md` e configurado em `origin/main:.github/workflows/e2e-stock.yml` |
| `useRuptureAlerts.ts` usando `untypedRpc` em vez de `(supabase as any).rpc` + `eslint-disable` | **NAO ESTA.** A main segue com o `eslint-disable`, e resolveu o portao registrando a excecao na baseline | blob na main `c4327ca203…` = blob do merge-base (a branch tinha `c728934f11…`); `origin/main:.eslint-disable-baseline.json:93` → `"src/hooks/stock/useRuptureAlerts.ts": 1` |
| Teste `useRuptureAlerts.test.tsx` alinhado ao `untypedRpc` | **NAO ESTA** — e coerente: o teste da main mocka `supabase.rpc`, igual ao hook da main | diff (B) do pacote: main volta a `vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: … } }))` |

## A resgatar

**1. Tirar o `eslint-disable` do alerta de ruptura de estoque** — `src/hooks/stock/useRuptureAlerts.ts` + `src/hooks/stock/__tests__/useRuptureAlerts.test.tsx`

A branch trocou `(supabase as any).rpc('fn_get_rupture_alerts')` com `// eslint-disable-next-line @typescript-eslint/no-explicit-any` pelo helper `untypedRpc`, que ja e o padrao do repo (`origin/main:src/lib/supabase-untyped.ts:63`). O comportamento e **identico** — mesma chamada RPC, mesma cadeia `.eq().neq().order().order().limit()`. O ganho e so de divida tecnica: um `eslint-disable` a menos no placar (hoje registrado como excecao permanente em `.eslint-disable-baseline.json:93`).

Por que importa: nada muda para o usuario. Importa porque e o unico pedaco desta branch que nao chegou a main, e porque o repo tem meta de reduzir esses contadores (`meta.target` nas baselines). Se for resgatado, **os dois arquivos tem de ir juntos** — mexer no hook sem mexer no mock do teste quebra os 3 testes de `useRuptureAlerts` (foi exatamente o finding Qodo HIGH que o commit `889e81b22b` corrigiu dentro da branch).

Prioridade: baixa. Pode virar um `chore:` de uma linha quando alguem mexer nesse hook por outro motivo.

## Risco de fechar esta branch

Baixo, com uma ressalva pequena.

O que ela entregou de concreto — o reparo do gatilho de seguranca no banco (`trg_anon_rate_guard`, que limita abuso anonimo na tabela `kill_switch_hits`), o recibo desse reparo no ledger, a limpeza das linhas duplicadas do ledger e as correcoes de lint do kit-builder — **tudo isso ja esta na main**, trazido pelas PRs #3023, #3048 e #3665. Fechar a branch nao desfaz nada disso.

As correcoes de workflow dela (instalar a ferramenta do Supabase por download manual, remover os passos de SBOM/atestado) hoje seriam **piora**: o bloqueio de politica que as motivava acabou, a main usa as actions oficiais num SHA mais novo e mantem os passos de seguranca que a branch havia removido. Nao ha nada a trazer dali.

A documentacao (20 commits em `PENDENCIAS.md` e `RELATORIO_CI.md`) perde-se como registro historico: a main reescreveu os dois arquivos em 08–09/11 com numeracao nova, e os codigos P7/P35–P65 nao existem mais. Os problemas de fundo continuam rastreados (o ledger fora de sincronia virou P-02, com numeros maiores e mais recentes), mas o rastro de qual run provou o que em 02/11 so existe nesta branch. Para quem decide negocio isso nao muda nada; para auditoria de CI e uma perda de memoria, nao de capacidade.

Ressalva: o unico item vivo a resgatar e o ajuste de qualidade descrito acima. Se a branch for apagada sem registrar esse item, ele se perde — por isso o veredito nao e "incorporada total".

## Nao verificado

- **Nao executei nenhum teste, lint ou build.** Todas as afirmacoes acima sao comparacao de conteudo entre `origin/main` e a tip da branch. Nao afirmo que a main "passa" nos portoes, apenas que o conteudo esta lá.
- **Nao verifiquei no banco de producao** se `trg_anon_rate_guard` existe hoje em `public.kill_switch_hits`. O proprio ledger da main diz, em `supabase/MIGRATIONS_SYNC_LOG.md:1693`, que a migration `20261102063000` segue **pendente de aplicacao** e que o estado do gatilho em producao estava "NÃO VERIFICADO em 2026-11-15". Ou seja: o arquivo esta versionado na main, a aplicacao em producao continua em aberto — mas isso e pendencia da main, nao desta branch.
- **Nao comparei linha a linha os ~600 trechos de `PENDENCIAS.md` e `RELATORIO_CI.md`.** Verifiquei por tema (10 assuntos) e por codigo de item (28 codigos). Pode haver alguma observacao pontual de 02/11 sem equivalente na main que meu levantamento por tema nao pegou.
- **Nao consultei a API do GitHub** sobre o estado da PR #3028 (aberta/fechada). A conclusao de que ela nao foi mergeada vem de `git log origin/main --grep="#3028"` nao retornar nada e de o repo usar squash-merge com `(#NNN)` no assunto.
