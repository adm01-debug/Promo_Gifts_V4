# Plano de Integração de Branches — 300 etapas (2026-10-19)

> **Objetivo:** o repositório termina com **uma única branch de desenvolvimento: `main`**, verde em CI.
> Todo trabalho útil das outras 105 branches é absorvido via PR; o resto é arquivado (tag) e excluído.
> **Executor:** agente de IA de menor custo. **Autor do plano:** Claude Code (sessão de análise).
> **Base da análise:** `origin/main` = `4179c0148` (2026-10-19 08:01 -03), 106 branches remotas além de `main`.
> **Inventário completo (máquina-legível):** `docs/plans/INVENTARIO_BRANCHES_2026-10-19.tsv`.

---

## 0. Como ler e executar este plano (LEIA ANTES DA ETAPA 1)

### 0.1 Legenda das etapas

| Tag | Significado |
|---|---|
| `[L]` | Leitura / diagnóstico. Sem efeito colateral. Executar sem pedir. |
| `[W]` | Escrita em branch própria (commit/push/PR). Executar sem pedir. |
| `[M]` | Merge em `main` (= deploy em produção via Lovable/Vercel). Só com CI verde. |
| `[D]` | Destrutivo (excluir branch, fechar PR). **Só depois da tag de arquivo da etapa E011.** |
| `[PO]` | **Parar e pedir aprovação do Joaquim** (DDL em produção, segredos, Actions settings, arquitetura, workflows/CI, deleção sem volta). Apresentar como escolha de negócio. |

Cada etapa tem: **ação → comando/ferramenta → ✅ critério de aceite**. Uma etapa só está concluída quando o critério foi **verificado de verdade** (comando rodado, saída conferida). Nunca marque concluída por suposição.

### 0.2 Regras invioláveis para o executor

1. **Clone completo obrigatório.** O container clona com `--depth 50`. Com histórico raso, *todas* as branches parecem não ter ancestral comum com `main` (foi o primeiro erro desta análise). Rode `git fetch --unshallow origin` antes de qualquer comparação.
2. Escrita no GitHub via MCP **`GITHUB - MCP - FOREVER`** (`mcp__GITHUB_-_MCP_-_FOREVER__*`). O MCP `github` padrão dá 403 em escrita.
3. **Nunca** commitar/push em `main`. **Nunca** force-push em `main`. **Nunca** commitar em branch de outro agente (Devin, Codex, Fábrica Hermes, dependabot, outra sessão Claude): para aproveitar o conteúdo, crie **branch nova** a partir de `main` e faça cherry-pick.
4. Branch nova = `claude/<tipo>-<slug>-<AAMMDD-HHMM>` (tipo ∈ fix|feat|chore|infra). Uma tarefa = uma branch = uma PR.
5. Commit em PT-BR, formato `tipo(escopo): descrição` + linha da sessão (CLAUDE.md REGRA #6).
6. CLAUDE.md é lei: REGRA #1 (`CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` em `src/integrations/supabase/client.ts`), REGRA #2 (campos do `Product`), REGRA #4 (`npm run check:types-inventory-drift`), REGRA #5 (nunca afrouxar gate / `continue-on-error` em gate), REGRA #8 (nenhum DDL/migration sem PO; nunca `supabase db push`; migration só via `.github/workflows/db-apply-migration.yml`; edge function só via `.github/workflows/deploy-edge-functions.yml`).
7. **Antes de qualquer exclusão**, a branch precisa ter tag `archive/2026-10-19/<nome-da-branch>` no remoto (etapa E011). Tag não é branch: o objetivo "só `main`" continua cumprido e a exclusão vira reversível.
8. Exclusão em lote: `git push origin --delete <b1> <b2> ...` (uma chamada por lote de até 20). Se o push direto falhar por permissão, use `mcp__GITHUB_-_MCP_-_FOREVER__github_delete_branch` uma a uma.
9. Economia: diagnóstico com `git` local (gratuito). MCP só para PR/CI/Actions. Logs de CI: `github_get_run_failure_summary` com `tail ≤ 40` e `max_chars ≤ 4000`. Saídas grandes de `github_list_*` vão para arquivo — processe com `node -e` (não há `python3` garantido).
10. Travou (falta permissão, segredo, aprovação)? **Registre na seção 11 (Diário de execução), pule para a próxima etapa independente** e volte depois. Não pivote para trabalho fora do plano.

### 0.3 Funções utilitárias (copie para o shell no início de cada sessão)

```sh
cd <raiz-do-repo>
git fetch --unshallow origin 2>/dev/null; git fetch origin --prune '+refs/heads/*:refs/remotes/origin/*' '+refs/tags/*:refs/tags/*'
git config diff.renameLimit 20000

# arquivos da branch que AINDA NÃO estão no main (0 = branch totalmente absorvida)
pend() { b=origin/$1; mb=$(git merge-base origin/main $b); for f in $(git diff --name-only $mb $b); do
  [ "$(git rev-parse -q --verify $b:$f)" = "$(git rev-parse -q --verify origin/main:$f)" ] || echo "$f"; done; }

# o patch da branch, arquivo a arquivo, já está no main? (IN_MAIN / APLICA / CONFLITA)
patchstat() { b=origin/$1; mb=$(git merge-base origin/main $b); git worktree add -q --detach /tmp/wt-ps origin/main 2>/dev/null
  for f in $(git diff --name-only $mb $b); do p=$(git diff --binary $mb $b -- "$f")
    if echo "$p" | git -C /tmp/wt-ps apply -R --check - 2>/dev/null; then echo "IN_MAIN  $f"
    elif echo "$p" | git -C /tmp/wt-ps apply --check - 2>/dev/null; then echo "APLICA   $f"
    else echo "CONFLITA $f"; fi; done; git worktree remove --force /tmp/wt-ps; }

# commits únicos (não equivalentes por patch-id) da branch
uniq_commits() { git cherry -v origin/main origin/$1 | grep '^+' | cut -c44-; }
```

---

## 1. Diagnóstico (fatos medidos em 2026-10-19)

### 1.1 Estado do `main`

- `main` está **vermelho**. No push `4179c0148` (11:01 UTC) rodaram 40 workflows: **19 sucesso, 17 falha, 2 skipped, 2 cancelados**.
- `4179c0148` ("feat(ci): Gate 0/1/1.1/…") **não tem `(#NNNN)` no título** → foi push direto em `main`, por isso o *Branch Protection Sentinel* falhou ("Audit every commit in push").
- Falhas no `main` (run id → passo que falhou):

| Workflow | Run | Passo que falhou | Hipótese de causa raiz |
|---|---|---|---|
| Deploy Gates (Gate Final) | 39241609691 | Gate 3 — `Run Playwright smoke tests` | Credencial E2E / login em CI (C1) |
| E2E (Playwright) | 39241609709 | `Fail-fast se header sticky falhou` (`e2e/flows/22-header-sticky.spec.ts`) | Regressão de layout **ou** consequência de C1 (C2) |
| E2E — Critical Flows | 39241609199 | `Setup auth state` + `Check min tests executed` | C1 |
| E2E — Personalization | 39241609568 | testes + `Check min tests executed` | C1 |
| E2E • Swatch QuickView (3 engines) | 39241609694 | suíte + `Check min tests executed` | C1 |
| Cart Invariants Smoke (sharded) | 39241609197 | `invariants do header/sidebar` | C1/C2 |
| E2E · Carts Undo RPC Atomic | 39241609805 | `Run undo/restore E2E` | C1 |
| E2E · Cart Delete Popover | 39241609441 | `Rodar bateria exaustiva` (chromium/webkit) | C1 |
| Quote Builder Delivery Quality | 39241609610 | `E2E & Visual Regression` | C1 |
| Visual Baseline Tests | 39241609207 | visual `chromium-public` **e** `chromium-authed` | C1 + drift de snapshot (C7) |
| CI - Replenishment Quality | 39241609632 | `Run Module Tests (Unit & Integration)` | teste unitário real (C3) |
| Supabase Linter Gate | 39241609488 | `Check Security Advisors and live catalog gates` | advisor ao vivo (C4) |
| CI Security & Drift | 39241609240 | `Supabase lint 0029 drift gate (SECURITY DEFINER exec)` | função SECDEF executável por anon/authenticated (C4) |
| Release Please | 39241609326 | `release-please failed: Resource not accessible by integration` (criar release do PR #2184) | permissão do `GITHUB_TOKEN` (C5) |
| Branch Protection Sentinel | 39241609430 | `Audit every commit in push` | push direto `4179c01` (C6) |
| Uptime Monitor | 39246127991 / 39242441468 | `Probe site + edge function` | site responde 200; investigar probe de edge/auth (C8) |

- **Conclusão:** ~11 dos 17 vermelhos são **uma causa só (C1: login E2E em CI)**. Toda PR aberta herda esse vermelho — por isso "centenas de workflows em failure": são 17 PRs × ~40 workflows.

### 1.2 Inventário das 106 branches

| Categoria | Qtde | Destino |
|---|---|---|
| **A** — 0 commits à frente do `main` (100% absorvida) | 16 | arquivar + excluir (Fase 2) |
| **B** — tem commits, mas o merge não muda nenhum arquivo (conteúdo já no `main`) | 6 | arquivar + excluir (Fase 2) |
| **C** — `e15-receipt-*` (recibos já presentes em `supabase/MIGRATIONS_SYNC_LOG.md`) | 5 | arquivar + excluir (Fase 2) |
| **D** — PR aberta | 17 | revisar → mergear / fatiar / fechar (Fases 3–4) |
| **E** — branch de bot obsoleta (`bot/*`, `chore/schema-live-*`) | 3 | arquivar + excluir (Fase 2) |
| **F** — `v2/*` (Fábrica Hermes / "Claude (integrador)") | 16 | 11 sem PR com conteúdo **inédito**; consolidar (Fase 5) |
| **G** — PR já mergeada, mas branch com resíduo (squash ou commit pós-merge) | 18 | triagem de pós-merge → salvar ou descartar (Fase 6) |
| **H** — PR fechada sem merge | 20 | verificar se o objetivo já está no `main` (Fase 6) |
| **I** — órfã sem PR (`codex/fix-high-priority…`, `codex/magazine-dbdeploy…`, `rescue/local-main…`) | 3 | triagem (Fase 6) |
| **X** — `gh-pages` (fonte do GitHub Pages: relatórios E2E em `adm01-debug.github.io/Promo_Gifts_V4/`) | 1 | **manter** (decisão [PO] em E270) |
| **P** — `claude_pink/serene-keller-y4gogg` (branch deste plano) | 1 | excluir após merge da PR do plano |

### 1.3 Falhas e gaps encontrados (fora do CI vermelho)

| # | Gap | Evidência | Etapa |
|---|---|---|---|
| G1 | Clone raso engana qualquer análise de branch | `git rev-parse --is-shallow-repository` = true; todas as branches "sem merge-base" | E002 |
| G2 | Push direto em `main` burlou PR | `4179c0148` sem `(#NNNN)`; Sentinel vermelho | E068–E070, E271 |
| G3 | PR #2271 faz o Gate 3 passar **pulando** autenticação (`E2E_MOCK_AUTH=1` quando credencial é inválida) — afrouxa gate (viola REGRA #5) | título/commit `12be0c212` | E112–E115 |
| G4 | PR #2228 **renomeia 38 migrations já aplicadas** e move 68 para `supabase/sql-legacy/` — diverge do ledger `supabase_migrations.schema_migrations` | `git diff -M --name-status` | E161–E195 |
| G5 | Bot de snapshot visual commita `chore(e2e): update Dialog visual snapshots [skip ci]` **dentro de PRs alheias** (dependabot #2264, #2212, devin #2235) e às vezes reverte | `git log` dessas branches; #2264 com 123 arquivos para um bump de action | E145, E274 |
| G6 | Release Please não consegue criar release (#2184 travada) | run 39241609326 | E060–E064 |
| G7 | `bun` ainda usado em 13 workflows (E96 "npm como runtime único" só existe na branch fechada `claude/security-2208-resolved-261018-1845`) | `grep -rln 'setup-bun\|bun install' .github/workflows` | E236–E240 |
| G8 | `supabase/functions/cnpj-lookup/index.ts:31` lê `SIMULATION_BYPASS_KEY` em edge de produção | grep | E276 |
| G9 | Branch de PR **fechada** não é apagada (`deleteBranchOnMerge` só cobre merge) → 20 branches H + 5 recibos | GraphQL `deleteBranchOnMerge: true` | E273 |
| G10 | Trabalho duplicado entre agentes: E18 ×3, E19 ×2, E33 ×2, E75 ×2, actionlint ×3, Gate 3 ×4 | inventário | E272 |
| G11 | 31 commits feitos **depois** do merge da PR #1827 em `claude/promo-brindes-audit-301lml` (E21, E32, E79, E80 …) nunca foram para o `main` | `git log` com data > mergedAt | E226–E233 |
| G12 | 11 branches `v2/*` com trabalho inédito **sem PR** (inclui edge function nova `mockup-assistant`) | inventário | Fase 5 |

---

## FASE 0 — Preparação e rede de segurança (E001–E020)

- **E001** `[L]` Ler `CLAUDE.md` inteiro e este plano até o fim antes de agir. ✅ Executor sabe onde estão REGRA #1, #2, #4, #5, #8.
- **E002** `[L]` `git fetch --unshallow origin` e depois `git fetch origin --prune '+refs/heads/*:refs/remotes/origin/*'`. ✅ `git rev-parse --is-shallow-repository` = `false` e `git rev-list --count origin/main` ≥ 16368.
- **E003** `[L]` Carregar as funções da seção 0.3. ✅ `type pend patchstat uniq_commits` responde as 3.
- **E004** `[L]` Contar branches remotas: `git branch -r | grep -v HEAD | wc -l`. ✅ Anotar no Diário. Se ≠ 107 (106 + main), listar as novas com `git for-each-ref --sort=-committerdate refs/remotes/origin --format='%(refname:short) %(committerdate:short)' | head -20` e classificá-las pela tabela 1.2 antes de seguir.
- **E005** `[L]` Conferir que `main` não mudou desde a análise: `git log --oneline 4179c0148..origin/main`. ✅ Se houver commits novos, anotar; as etapas continuam válidas, mas toda checagem "IN_MAIN" deve ser refeita contra o `main` atual.
- **E006** `[L]` Listar PRs abertas (`github_list_pull_requests state=open per_page=100`, processar o arquivo com `node -e` extraindo `number, head.ref, user.login, title`). ✅ Bate com as 17 da tabela 4.1; divergências anotadas.
- **E007** `[L]` Ler proteção do `main`: `github_get_branch_protection branch=main` e `github_list_rulesets`. ✅ Anotar contexts obrigatórios (esperado: "Gate Final - Deploy Ready") e se `enforce_admins` está ligado.
- **E008** `[L]` Comparar `.github/required-checks.json` com os contexts obrigatórios reais de E007. ✅ Lista de divergências anotada (usada em E248).
- **E009** `[L]` Confirmar Pages: `github_get_pages` → `source.branch = gh-pages`. ✅ Confirmado → `gh-pages` entra na lista de NÃO EXCLUIR.
- **E010** `[L]` Gerar a lista de branches a arquivar: todas de `docs/plans/INVENTARIO_BRANCHES_2026-10-19.tsv` exceto `gh-pages`. ✅ Arquivo `/tmp/archive-list.txt` com 105 nomes.
- **E011** `[W]` Criar tags de arquivo para **todas** as 105 branches: `while read b; do git tag "archive/2026-10-19/$b" "origin/$b"; done < /tmp/archive-list.txt` e `git push origin 'refs/tags/archive/2026-10-19/*'`. ✅ `git ls-remote --tags origin 'archive/2026-10-19/*' | wc -l` = 105. **Nenhuma exclusão acontece antes disso.**
- **E012** `[L]` Validar que cada tag aponta para o mesmo SHA da branch: `while read b; do [ "$(git rev-parse origin/$b)" = "$(git rev-parse archive/2026-10-19/$b^{commit})" ] || echo "DIVERGE $b"; done < /tmp/archive-list.txt`. ✅ Saída vazia.
- **E013** `[W]` Gerar bundle offline de segurança: `git bundle create /tmp/promo-gifts-all-branches-2026-10-19.bundle --all`. ✅ `git bundle verify` OK. (Opcional: anexar como artifact de workflow ou release privada — **[PO]** se for subir para fora do GitHub.)
- **E014** `[L]` Ler `.github/PULL_REQUEST_TEMPLATE.md` (todas as PRs do plano seguem esse template). ✅ Seções anotadas.
- **E015** `[L]` Rodar baseline local no `main` (para separar falha herdada de falha nova): `npm ci && npm run lint && npx tsc --noEmit -p tsconfig.app.json && npx vitest run --reporter=dot`. ✅ Resultado salvo em `/tmp/baseline-main.txt` (contagem de erros/falhas por comando).
- **E016** `[L]` `node scripts/validate-supabase-config.mjs` no `main`. ✅ Exit 0 (Gate 0). Se falhar, **parar tudo** e corrigir antes (REGRA #1).
- **E017** `[L]` `npm run check:types-inventory-drift` no `main`. ✅ Exit 0 (Gate 1.2).
- **E018** `[L]` `npx --yes actionlint` em `.github/workflows/*.yml` do `main`. ✅ Lista de erros salva (usada em E241–E244).
- **E019** `[W]` Criar a issue de acompanhamento "Integração de branches — plano 300 etapas" com checklist das fases 0–8 e link para este arquivo. ✅ Issue criada; número anotado no Diário.
- **E020** `[L]` Comunicar congelamento: comentar na issue de E019 que, até o fim da Fase 3, nenhuma PR nova deve ser aberta por agentes contra `main` exceto as deste plano. **[PO]** confirmar com o Joaquim que os outros agentes (Devin, Codex, Fábrica Hermes, Lovable) ficam pausados. ✅ Resposta do PO registrada.

---

## FASE 1 — Deixar o `main` verde (E021–E075)

> Sem `main` verde, nenhuma PR consegue provar que está correta. Esta fase vem **antes** de qualquer integração.

### 1A — C1: login E2E em CI (destrava ~11 workflows)

- **E021** `[L]` Ler o log completo do passo `Setup auth state` do job `E2E — Full User Flows (authed)` (run 39241609199): `github_get_job_logs` do job, filtrar com `grep -iE "error|invalid|captcha|turnstile|401|403|credential"`. ✅ Mensagem de erro exata anotada.
- **E022** `[L]` Ler o log do Gate 3 (job 118028285876, run 39241609691) com `tail=200` e filtrar o output do Playwright (`✘`, `Error:`). ✅ Spec e linha que falham anotadas.
- **E023** `[L]` Ler `e2e/auth.setup.ts`, `e2e/smoke.spec.ts` e o step de env dos workflows E2E (`grep -n "E2E_" .github/workflows/deploy-gates.yml .github/workflows/e2e-flows.yml`). ✅ Mapa de quais segredos cada job usa (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_ADMIN_*`, `E2E_MOCK_AUTH`, Turnstile).
- **E024** `[L]` Classificar a causa: (a) credencial inválida (`Invalid login credentials`), (b) Turnstile/captcha bloqueando `check-login`, (c) segredo ausente (variável vazia), (d) outro. ✅ Classe escolhida com a linha de log como prova.
- **E025** `[L]` Se (a): confirmar o usuário de teste no Auth sem expor senha — `SELECT id, email, banned_until, email_confirmed_at, last_sign_in_at FROM auth.users WHERE email = '<E2E_USER_EMAIL>'` via MCP Supabase de leitura do projeto `doufsxqlfjyuvxuezpln`. ✅ Usuário existe / não existe / banido / não confirmado.
- **E026** `[PO]` Se (a): pedir ao Joaquim a rotação da senha do usuário de teste e atualização dos segredos `E2E_USER_PASSWORD` (e `E2E_ADMIN_PASSWORD` se for o caso) em Settings → Secrets → Actions. Apresentar: "sem isso, 11 verificações seguem vermelhas e nenhuma PR pode ser validada; custo zero; risco nenhum para cliente". ✅ PO confirma segredos atualizados.
- **E027** `[W]` Se (b): ler `supabase/functions/check-login/index.ts` e o bypass de Turnstile para CI que o `main` já tem (commit `4179c01` menciona "Turnstile bypass"); confirmar se o workflow injeta o header/variável esperado. Corrigir **o workflow** (não o gate) numa branch `claude/fix-e2e-turnstile-ci-<AAMMDD-HHMM>`. ✅ Diff mínimo; nenhum teste pulado.
- **E028** `[W]` Se (c): adicionar o segredo faltante ao `env:` do step (padrão R5 de `docs/ci/PADRAO_WORKFLOW.md`) e documentar em `docs/ci/SEGREDOS.md` (Gate 1.14). ✅ `node scripts/check-secrets-inventory.mjs --gate` passa.
- **E029** `[L]` Reproduzir o setup de auth localmente com o mesmo comando do workflow (`npx playwright test --project=setup` ou o projeto equivalente listado em `playwright.config.ts`). ✅ Passa localmente com as credenciais de CI (se disponíveis) ou falha com o mesmo erro de CI.
- **E030** `[W]` Abrir PR com a correção de C1 (se houver mudança de código). Título: `fix(e2e): restaura login E2E em CI — <causa>`. ✅ PR aberta; link no Diário.
- **E031** `[L]` Disparar novamente os workflows E2E no `main` **só depois** de E026 (segredo novo vale para re-run): `github_rerun_failed_jobs` nos runs 39241609199 e 39241609691. ✅ `Setup auth state` verde.
- **E032** `[L]` Se `Setup auth state` ficou verde mas testes ainda falham, separar por spec: anotar quais specs seguem vermelhas. ✅ Lista residual (entra em 1B/1C).
- **E033** `[D]` Decidir as PRs que tentaram contornar C1 — **#2269** (smoke usa `E2E_USER_EMAIL` como primário) e **#2271** (bypass `E2E_MOCK_AUTH`). Se C1 foi resolvido pela credencial, ambas perdem o motivo: ver E111–E118. ✅ Decisão anotada.

### 1B — C2: header sticky

- **E034** `[L]` Ler `e2e/flows/22-header-sticky.spec.ts` e rodar só ela localmente: `npx playwright test e2e/flows/22-header-sticky.spec.ts --project=<projeto do workflow e2e.yml>`. ✅ Passa ou falha localmente (com evidência).
- **E035** `[L]` Se passa local e falha no CI → era consequência de C1 (rota autenticada redirecionou para login). Revalidar depois de E031. ✅ Verde no CI.
- **E036** `[L]` Se falha local: `git log -5 --format='%h %s' -- src/components/layout/MainLayout.tsx src/components/layout/Header*.tsx src/index.css tailwind.config.ts` para achar o commit que introduziu `overflow`/`transform`/`filter` em ancestral do `<header>`. ✅ Commit culpado identificado.
- **E037** `[W]` Corrigir a causa (manter `overflow-x-clip`, nunca `overflow-x-hidden`; animação só de `opacity` no wrapper — ver comentários em `MainLayout.tsx:107-192`). Branch `claude/fix-header-sticky-<AAMMDD-HHMM>`. ✅ Spec passa nos viewports do teste.
- **E038** `[W]` PR `fix(layout): restaura header sticky — <causa>`. ✅ CI do PR: `E2E (Playwright)` verde.

### 1C — C3: Replenishment unit tests

- **E039** `[L]` Log do job `audit` (run 39241609632), passo 7, `tail=120`; filtrar `FAIL|✗|AssertionError`. ✅ Arquivo/teste falhando anotado.
- **E040** `[L]` Rodar localmente o mesmo comando do workflow (`grep -n "run:" .github/workflows/replenishment-quality.yml`). ✅ Reproduzido.
- **E041** `[L]` `git log -5 -- <arquivo de teste> <arquivo testado>` para achar a mudança que quebrou. ✅ Causa identificada (mudança intencional de comportamento × bug).
- **E042** `[W]` Se bug: corrigir o código. Se mudança intencional: atualizar o **teste de contrato** (REGRA #5), não snapshot. Branch própria. ✅ Teste verde local.
- **E043** `[W]` PR `fix(replenishment): <causa>`. ✅ `CI - Replenishment Module Quality Gate` verde no PR.

### 1D — C4: Supabase Linter Gate + lint 0029 (SECURITY DEFINER)

- **E044** `[L]` Log do passo 15 do job `quality-gate` (run 39241609240) com `tail=80`. ✅ Nome(s) da(s) função(ões) SECDEF flagradas.
- **E045** `[L]` Log do passo 5 do job `linter` (run 39241609488) com `tail=80`. ✅ Advisor(s) e objeto(s) flagrados.
- **E046** `[L]` Confirmar no catálogo (REGRA #8 corolário — só `pg_catalog`): `SELECT p.oid::regprocedure, p.prosecdef, has_function_privilege('anon', p.oid, 'EXECUTE') anon, has_function_privilege('authenticated', p.oid, 'EXECUTE') auth FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN (<nomes de E044>)`. ✅ Estado real confirmado.
- **E047** `[L]` Verificar se é função nova sem migration (DDL fora de banda): `grep -rln "<nome>" supabase/migrations | tail -3`. ✅ Existe migration? sim/não.
- **E048** `[W]` Escrever a migration corretiva (`REVOKE EXECUTE … FROM anon, authenticated` ou `SET search_path`), com cabeçalho de rollback lógico (Gate 1.3), numa branch própria. ✅ `npm run check:migration-contracts` (ou o script do Gate 1.3) passa.
- **E049** `[PO]` **Aplicar em produção só com aprovação do Joaquim** e só via `db-apply-migration.yml` (workflow_dispatch com a versão). Apresentar: "fecha brecha de segurança X; reversível; 0 impacto em cliente se a função não é chamada pelo front anônimo". ✅ PO aprovou; run verde; recibo E15 no `MIGRATIONS_SYNC_LOG.md`.
- **E050** `[L]` Re-run de `Supabase Linter Gate` e `CI Security & Drift Checks` no `main`. ✅ Verdes.
- **E051** `[L]` Se o advisor flagrado for falso-positivo documentado, conferir se há allowlist do gate (`grep -rn allowlist scripts/*linter* scripts/*0029*`). Entrada só com justificativa específica. ✅ Nunca allowlist genérica.

### 1E — C7: Visual baselines

- **E052** `[L]` Log de `visual-baseline (2, 2)` passo 8 (`chromium-public`) com `tail=60`: quais snapshots divergem e por quantos pixels. ✅ Lista.
- **E053** `[L]` Se só os `authed` falham → C1. Se `public` falha → drift real. ✅ Classificado.
- **E054** `[L]` Para cada snapshot `public` divergente, achar a mudança de UI que causou (`git log -3 -- <componente>`). ✅ Mudança intencional × regressão.
- **E055** `[W]` Regressão → corrigir componente. Intencional → regenerar snapshots via o workflow oficial de update (`.github/workflows/e2e-update-dialog-snapshots.yml` / equivalente) **em branch própria**, 1 commit agregado (REGRA #5). ✅ `Visual Baseline Tests` verde no PR.
- **E056** `[L]` Conferir Gate 1.4 (`Visual baselines commitados`) no PR. ✅ Verde.

### 1F — C8: Uptime Monitor

- **E057** `[L]` Log do passo 3 do run 39246127991 (`tail=60`), procurar `exit code` por probe (o workflow imprime 0/≠0 por URL). ✅ Probe(s) que falha(m) identificado(s).
- **E058** `[L]` Testar a URL com os mesmos headers do workflow (ler linhas 70–90 de `.github/workflows/uptime-monitor.yml`). Site `https://www.promogifts.com.br/` respondeu 200 nesta análise; `health-check` e `auth/v1/health` respondem 401 sem `apikey`. ✅ Causa: produção fora × header/segredo ausente no probe.
- **E059** `[W]` Se header/segredo: corrigir o workflow em branch própria **[PO]** (workflow = governança). Se produção fora: **parar e avisar o Joaquim imediatamente** (incidente). ✅ Uptime verde ou incidente aberto.

### 1G — C5: Release Please

- **E060** `[L]` Ler `.github/workflows/release-please.yml` (já tem `contents: write` e `pull-requests: write`). ✅ Permissões do job confirmadas.
- **E061** `[L]` `github_get_workflow_permissions` (Settings → Actions → Workflow permissions). ✅ `default_workflow_permissions` e `can_approve_pull_request_reviews` anotados.
- **E062** `[L]` `github_list_rulesets` + tags protegidas: alguma regra bloqueia criação de tag/release pelo `github-actions[bot]`? ✅ Anotado.
- **E063** `[PO]` Propor ao Joaquim a correção (uma das duas): (1) permitir `GITHUB_TOKEN` criar release/tag na regra que bloqueia; (2) usar token de app/PAT dedicado em segredo `RELEASE_PLEASE_TOKEN` (registrar em `docs/ci/SEGREDOS.md`). Recomendação: (1), custo zero. ✅ Decisão do PO.
- **E064** `[L]` Re-run do Release Please. ✅ Release `v1.2.1` criada; PR #2184 fechada pelo bot.

### 1H — C6: Sentinel (push direto)

- **E065** `[L]` Ler `scripts/sentinel-check.sh` e o job "Verify push to main matches accepted patterns": o que ele aceita (título com `(#NNNN)`, merge commit, bot)? ✅ Regra anotada.
- **E066** `[L]` Descobrir quem/como fez `4179c0148`: `github_list_commit_prs` para o SHA. ✅ Sem PR = push direto confirmado.
- **E067** `[L]` Verificar se o conteúdo de `4179c0148` passou pelos gates em alguma PR (procurar PR com mesmo título): `github_search_issues "Gate 0/1/1.1/1.2/1.3/1.7/1.9/E2E" repo:adm01-debug/promo_gifts_v4 is:pr`. ✅ Anotado.
- **E068** `[W]` Registrar o incidente em `docs/POSMORTEM_PUSH_DIRETO_MAIN_2026-10-19.md` (o que entrou, quem, por que o branch protection permitiu — admin bypass?). Mesma branch da PR do E070. ✅ Arquivo criado.
- **E069** `[L]` Confirmar que o Sentinel só audita os commits do push: o próximo merge via PR (qualquer PR desta fase) deve deixá-lo verde. ✅ Verde no próximo push.
- **E070** `[PO]` Propor ligar `enforce_admins` (ou ruleset sem bypass) em `main` para impedir novo push direto. ✅ Decisão do PO registrada (execução em E271).

### 1I — Fechamento da Fase 1

- **E071** `[M]` Mergear as PRs da Fase 1 **em ordem de dependência**: C1 → C2 → C3 → C4 → C7 → C8. Uma por vez, esperando o `Gate Final - Deploy Ready` verde de cada. Squash. ✅ Cada merge com CI verde.
- **E072** `[L]` Após cada merge, conferir o deploy (Lovable/Vercel) — `github_list_deployments` ou `mcp__Vercel__list_deployments` do projeto. ✅ Deploy `READY`.
- **E073** `[L]` Listar runs do novo HEAD do `main` (`github_list_workflow_runs head_sha=<sha>`), contar por `conclusion`. ✅ 0 `failure` (exceto os opcionais declarados: Lighthouse/Gate 4).
- **E074** `[L]` Atualizar a issue de E019 com o placar do `main`. ✅ Comentário postado.
- **E075** `[L]` **Portão da Fase 1:** só seguir para a Fase 3 com `main` verde. A Fase 2 (limpeza de branches mortas) pode correr em paralelo porque não toca código. ✅ Portão registrado no Diário.

---

## FASE 2 — Limpeza das branches mortas (E076–E110)

> Todas aqui já estão 100% no `main` (medido) ou são lixo de bot. Excluir reduz ruído de CI e de análise.
> Pré-requisito: E011/E012 concluídas (tags de arquivo).

### 2A — Categoria A (0 commits à frente)

- **E076** `[L]` Revalidar `ahead=0` para as 16: `for b in master fix/ci-eslint-baseline-minimatch fix/revert-react-router-v6 fix/tsc-intelligence-analytics codex/final-release-evidence-20260828 codex/plan-100-forward-only-20260828 codex/vercel-sourcemap-gate-20260828 codex/wave1-forward-only-20260828 codex/approved-plan-execution-20260829 claude/audit-fixes-20260830 codex/actions-gates-20260829 codex/fix-runtime-chunks-notifications-20260831 codex/fix-sentinel-merge-title-20260831 codex/reconcile-deploy-20260831 codex/reconcile-required-checks-20260831 claude/feat-e72-e75-codeowners-migrations-261018-1548; do echo "$b $(git rev-list --count origin/main..origin/$b)"; done`. ✅ Todas `0`.
- **E077** `[L]` `master`: confirmar que nenhum workflow nem config referencia `master` (`grep -rn "\bmaster\b" .github/ vercel.json netlify.toml 2>/dev/null`). R7 do PADRAO_WORKFLOW já proíbe. ✅ Sem referência ativa.
- **E078** `[L]` Confirmar que nenhuma das 16 é *default branch* nem alvo de PR aberta (`github_list_pull_requests base=<b>`). ✅ Nenhuma.
- **E079** `[D]` Excluir as 16 em um lote: `git push origin --delete <16 nomes>`. ✅ `git ls-remote --heads origin <nome>` vazio para cada.
- **E080** `[L]` Marcar no Diário. ✅ 16 excluídas.

### 2B — Categoria B (commits sem efeito líquido)

- **E081** `[L]` Para cada uma: `claude/feat-kit-ai-title-description-260923-2200`, `claude/fix-e19-cancel-in-progress-261018-1950`, `claude/fix-gate3-smoke-261018-1435`, `v2/adr-fronteira-mockup-magicup-int`, `devin/1792351727-fix-actionlint-secrets-if`, `claude/fix-gate111-allowlist-lineno-261019-1130` → rodar `pend <b>`. ✅ Saída vazia para todas.
- **E082** `[L]` Para as duas com PR fechada recente (#2250, #2270), ler o comentário de fechamento para garantir que não havia pendência declarada. ✅ Sem pendência.
- **E083** `[D]` Excluir as 6 em lote. ✅ Removidas.

### 2C — Categoria C (recibos E15)

- **E084** `[L]` Para cada versão `20260923114500 20261013180000 20261015120500 20261015130000 20261015140000`: `git show origin/main:supabase/MIGRATIONS_SYNC_LOG.md | grep -c <versão>` ≥ 1 **e** linha com status `aplicada`. ✅ Todas presentes (medido: 7/2/3/3/1 ocorrências).
- **E085** `[L]` `e15-receipt-20260923114500-35857184284` tem também `chore(db): promove RPCs transacionais de orçamento`: confirmar que a migration `supabase/migrations/20260923114500_*.sql` existe no `main`. ✅ Existe (medido).
- **E086** `[D]` Excluir as 5 `e15-receipt-*`. ✅ Removidas.
- **E087** `[L]` Ler `.github/workflows/db-apply-migration.yml`: o passo que cria o recibo abre PR de branch `e15-receipt-*`. Anotar para E273 (auto-limpeza quando a PR do recibo for fechada). ✅ Anotado.

### 2D — Categoria E (bots obsoletos)

- **E088** `[L]` `bot/schema-snapshot`: o commit pós-merge `6b12d4703` (snapshot W42) foi superado pelo snapshot do `main` atual? Comparar data do `docs/SCHEMA_LIVE*`/arquivo de snapshot no `main` com a W42. ✅ `main` tem snapshot ≥ W42 (ou o export semanal recria a branch).
- **E089** `[L]` Confirmar que `schema-snapshot-export.yml` recria `bot/schema-snapshot` sozinho (`grep -n "bot/schema-snapshot" .github/workflows/*.yml`). ✅ Recria → pode excluir.
- **E090** `[D]` Excluir `bot/schema-snapshot`. ✅ Removida.
- **E091** `[L]` `chore/schema-live-weekly-snapshot-20260921`: snapshot de setembro, sem PR. `pend` mostra 1 arquivo; o `main` já tem snapshot mais novo. ✅ Confirmado.
- **E092** `[D]` Excluir `chore/schema-live-weekly-snapshot-20260921`. ✅ Removida.
- **E093** `[L]` `bot/policies-baseline-seed-20261018212709` (PR #2252 fechada): comparar o baseline assinado da branch com o do `main` (`git diff origin/main origin/bot/policies-baseline-seed-20261018212709 --stat`). Se o `main` já contém as 6 policies `cf_recon` (entraram via #2234/#2254), está superado. ✅ Superado.
- **E094** `[D]` Excluir `bot/policies-baseline-seed-20261018212709`. ✅ Removida.

### 2E — Fechamento da Fase 2

- **E095** `[L]` Contar branches remotas. ✅ 106 − 30 = **76** restantes (+ main).
- **E096** `[L]` Conferir que nenhuma das excluídas era referenciada em workflow (`grep -rn "<nome>" .github/`). ✅ Nenhuma.
- **E097** `[L]` Atualizar a issue de E019. ✅ Comentário.
- **E098** `[L]` Branches novas surgidas durante a execução (E004): classificar cada uma (A–I) e aplicar a receita da categoria. ✅ Toda branch nova tratada ou anotada.
- **E099** `[L]` Vercel: confirmar que o projeto de produção usa `main` como *production branch* e que nenhuma branch excluída era alvo fixo de preview/alias (`mcp__Vercel__get_project` → `link.productionBranch`; `mcp__Vercel__list_aliases`). ✅ Só `main`.
- **E100** `[L]` Lovable: confirmar que o projeto sincroniza com `main` (fluxo GitHub-first). ✅ `main`.
- **E101** `[L]` Environments do GitHub (`github_list_environments` + `github_list_deployment_branch_policies` de cada, especialmente `production`): nenhuma policy aponta para branch excluída. ✅ Só `main` (ou padrões genéricos).
- **E102** `[L]` Rulesets (`github_list_rulesets` → `github_get_ruleset`): regras com alvo `codex/*`, `v2/*`, `fix/*`, `rescue/*` ficaram órfãs? ✅ Lista; remoção de regra órfã é [PO] (E271).
- **E103** `[L]` `.github/dependabot.yml`: `target-branch` (se existir) = `main`. ✅ OK.
- **E104** `[L]` `release-please-config.json` / workflow: branch alvo = `main`. ✅ OK.
- **E105** `[L]` Webhooks do repo (`github_list_webhooks`): o auto-sync do graphify (N8N) e integrações filtram por `main`? ✅ Nenhum depende de branch excluída.
- **E106** `[L]` Caches do Actions: `github_list_actions_caches` (per_page 100, salvar em arquivo, `node -e` agrupando por `ref`). ✅ Total de MB em refs de branches já excluídas.
- **E107** `[W]` Apagar os caches cujo `ref` é `refs/heads/<branch excluída>` ou `refs/pull/<PR fechada>/merge` (`github_delete_actions_cache`). Economia de cota de cache (10 GB) sem afetar `main`. ✅ `github_get_actions_cache_usage` menor que antes.
- **E108** `[L]` Runs em fila/execução de branches excluídas (`github_list_workflow_runs status=queued` e `in_progress`): cancelar os órfãos (`github_cancel_workflow_run`). ✅ 0 run órfão consumindo minutos.
- **E109** `[L]` Conferir que `git ls-remote --heads origin | wc -l` = (107 − 30) e que cada excluída tem a tag `archive/2026-10-19/*`. ✅ Contagem fecha.
- **E110** `[L]` Atualizar a issue de E019 com o placar da Fase 2 (branches excluídas, caches liberados, runs cancelados). ✅ Comentário.

---

## FASE 3 — PRs abertas (exceto #2228) (E111–E160)

### 3.0 Mapa das 17 PRs abertas

| PR | Branch | Autor | Arquivos líquidos | Decisão recomendada |
|---|---|---|---|---|
| #2271 | `claude/gifted-dijkstra-uojt52` | Claude | 3 (`deploy-gates.yml`, `e2e/smoke.spec.ts`, `scripts/drift-baseline.mjs`) | **Não mergear como está** (afrouxa Gate 3). Ver E111–E118 |
| #2269 | `claude/fix-gate3-smoke-credentials-261019-1115` | Claude | 1 (`e2e/smoke.spec.ts`, idêntico ao de #2271) | Fechar se C1 resolvido por credencial |
| #2267 | `claude/fix-filter-diff-261019-1135` | Claude | 1 (`scripts/drift-baseline.mjs`, **difere** do de #2271) | Comparar com #2271 → mergear a versão correta |
| #2266 / #2265 | `dependabot/.../codeql-action/{analyze,init}-4.39.0` | dependabot | 1 cada | Mergear juntas |
| #2264 | `dependabot/github_actions/actions/checkout-7.0.1` | dependabot (+ bot de snapshot) | 123 (poluída) | `@dependabot recreate`, depois avaliar major |
| #2263 | `dependabot/npm_and_yarn/development-all-45f323d05e` | dependabot | 2 | Mergear com CI verde |
| #2212 | `dependabot/npm_and_yarn/production-minor-patch-fc4ba4faef` | dependabot (+ bot de snapshot) | 4 (36 updates) | Testar completo, mergear |
| #2262 | `ci-metrics/2026-W43` | bot | 1 (doc) | Mergear |
| #2249 | `claude/fix-e22-paths-self-scripts-261018-2100` | Claude | 2 workflows | [PO] mergear |
| #2248 | `claude/feat-e18-cache-scheme-261018-1942` | Claude | 1 workflow | [PO] mergear |
| #2245 | `claude/fix-e11-sentinel-fixture-261018-2345` | Claude | 1 workflow | [PO] mergear |
| #2235 | `devin/1792343960-synclog-stale-cleanup` | Devin | 1 (`MIGRATIONS_SYNC_LOG.md`) | Revisar contra E75/#2228, mergear |
| #2234 | `devin/1792343663-main-red-fixes` | Devin | 1 (só um PNG; o resto já entrou) | Fechar (superada) |
| #2232 | `devin/1792342270-boundary-gate-fixes` | Devin | 3 | Revisar + mergear |
| #2231 | `devin/1792342342-product-webhook-notnull` | Devin | 2 (edge function) | Revisar + mergear + deploy via workflow |
| #2228 | `claude/hopeful-heisenberg-dt4bl3` | Claude | 607 | **Fase 4** (fatiar) |

### 3A — Gate 3: #2271, #2269, #2267

- **E111** `[L]` `git diff origin/main origin/claude/gifted-dijkstra-uojt52 -- .github/workflows/deploy-gates.yml`. ✅ Trecho do `E2E_MOCK_AUTH` isolado.
- **E112** `[L]` Avaliar se o trecho faz o Gate 3 passar sem autenticar quando a credencial falha. Se sim → viola REGRA #5 (gate não pode virar opcional). ✅ Veredito anotado com a linha.
- **E113** `[L]` `git diff origin/claude/fix-filter-diff-261019-1135 origin/claude/gifted-dijkstra-uojt52 -- scripts/drift-baseline.mjs`. ✅ Diferenças entre as duas versões de `filterDiff` anotadas.
- **E114** `[L]` Rodar os testes do drift com cada versão: `git checkout origin/<branch> -- scripts/drift-baseline.mjs && node --test tests/scripts/*drift*` (em worktree descartável). ✅ Qual versão passa em todos os testes.
- **E115** `[W]` Criar `claude/fix-drift-filterdiff-<AAMMDD-HHMM>` a partir do `main` com a versão vencedora de `scripts/drift-baseline.mjs` (+ teste de regressão para DDL multi-linha, se não existir). ✅ `node --test` verde.
- **E116** `[W]` Abrir PR; no corpo citar #2267 e #2271 como origem. ✅ PR aberta.
- **E117** `[M]` Mergear E116 com CI verde. ✅ Merged.
- **E118** `[D]` Fechar #2267, #2269 e #2271 com comentário: "conteúdo útil integrado em #<E116>/#<E030>; bypass `E2E_MOCK_AUTH` descartado por afrouxar o Gate 3 (REGRA #5)". Se após E031 o smoke ainda depender de `E2E_USER_EMAIL` como primário, levar só esse arquivo para a PR de C1 (E030) antes de fechar. ✅ 3 PRs fechadas.
- **E119** `[D]` Excluir `claude/gifted-dijkstra-uojt52`, `claude/fix-gate3-smoke-credentials-261019-1115`, `claude/fix-filter-diff-261019-1135`. ✅ Removidas.

### 3B — Dependabot

- **E120** `[L]` #2265 + #2266: confirmar que só mudam a versão do `codeql-action` (`github_list_pr_files`). ✅ 1 arquivo cada, só SHA/versão.
- **E121** `[W]` Como as duas mexem no mesmo workflow, mergear #2265 primeiro e comentar `@dependabot rebase` em #2266. ✅ #2266 rebaseada sem conflito.
- **E122** `[M]` Mergear #2265 e depois #2266 com CI verde. ✅ Merged; branches apagadas automaticamente (`deleteBranchOnMerge=true`).
- **E123** `[L]` #2263 (dev deps, 4 updates): `github_list_pr_files` + ler o corpo (changelog). Algum major? ✅ Anotado.
- **E124** `[L]` Rodar local na branch: `npm ci && npm run lint && npx tsc --noEmit && npx vitest run`. ✅ Igual ou melhor que `/tmp/baseline-main.txt`.
- **E125** `[M]` Mergear #2263. ✅ Merged.
- **E126** `[L]` #2212 (prod, 36 updates): a branch tem commit do bot de snapshot (`chore(e2e): update Dialog visual snapshots [skip ci]`). Ver se os PNG ainda estão no diff (`github_list_pr_files`). ✅ Anotado.
- **E127** `[W]` Se houver PNG alheio: comentar `@dependabot recreate` (o dependabot refaz a branch limpa). ✅ PR só com `package.json` + `package-lock.json`.
- **E128** `[L]` Na branch recriada: `npm ci && npm run build && npx vitest run && npx playwright test --project=<smoke>`. ✅ Sem regressão.
- **E129** `[L]` `npm audit --audit-level high` (Gate 0.5). ✅ 0 high/critical.
- **E130** `[M]` Mergear #2212. Conferir deploy (E072). ✅ Merged + deploy READY.
- **E131** `[L]` #2264 (`actions/checkout` 4.4.0 → 7.0.1, **major**, 123 arquivos por poluição de snapshot): ler release notes do checkout v5/v6/v7 (breaking: Node runtime, `persist-credentials`). ✅ Breaking changes anotadas.
- **E132** `[W]` Comentar `@dependabot recreate` em #2264. ✅ PR volta a ter só workflows.
- **E133** `[L]` Conferir se algum workflow depende de `persist-credentials` implícito para dar `git push` (`grep -rln "git push" .github/workflows`). ✅ Lista; se houver, testar um deles na PR.
- **E134** `[PO]` Workflows = governança: pedir OK do Joaquim para o major do checkout (apresentar: "elimina aviso de Node 20 depreciado em todos os runs; risco: workflows que fazem push"). ✅ Decisão.
- **E135** `[M]` Mergear #2264 após OK e CI verde. ✅ Merged.

### 3C — PRs pequenas de CI (Claude)

- **E136** `[L]` #2249 (E22 — paths de `ssot-supabase.yml` e `stock-module-quality.yml`): `patchstat claude/fix-e22-paths-self-scripts-261018-2100` → 2 `APLICA`. Verificar que os paths adicionados existem no `main` (`ls` de cada path). ✅ Paths existem.
- **E137** `[L]` `npx --yes actionlint .github/workflows/ssot-supabase.yml .github/workflows/stock-module-quality.yml` na branch. ✅ 0 erro.
- **E138** `[W]` Se a branch estiver atrás do `main`: `github_update_pr_branch` (merge do main na PR — não rebase em branch alheia). ✅ Atualizada.
- **E139** `[PO]+[M]` Mergear #2249 após OK do Joaquim (CI/workflow). ✅ Merged.
- **E140** `[L]` #2248 (E18 — remove `actions/cache` manual em `freight-quality-gates.yml`; o `main` ainda tem 11 ocorrências de `actions/cache` nesse arquivo): confirmar que todos os jobs afetados usam `setup-node` com `cache: npm` (ou o composite `setup-node-ci`). ✅ Confirmado.
- **E141** `[L]` actionlint no arquivo. ✅ 0 erro.
- **E142** `[PO]+[M]` Mergear #2248. ✅ Merged.
- **E143** `[L]` #2245 (E11 — fixture `check-protection-config` em `sentinel-self-test.yml`): rodar o self-test localmente se houver script (`grep -n "run:" .github/workflows/sentinel-self-test.yml`). ✅ Passa.
- **E144** `[PO]+[M]` Mergear #2245. ✅ Merged.
- **E145** `[L]` #2262 (`ci-metrics/2026-W43`, doc gerado por bot): conferir que só toca o arquivo de métricas. ✅ 1 arquivo.
- **E146** `[M]` Mergear #2262. ✅ Merged.

### 3D — PRs do Devin

- **E147** `[L]` #2234 (`devin/1792343663-main-red-fixes`): `pend` mostra só `e2e/ui/dialog-visual.spec.ts-snapshots/dialog-180-chromium-public-linux.png`. Todo o resto (TS2345 `useSalesHistoryMacro`, catálogo de despachos, 6 policies `cf_recon`) já está no `main`. ✅ Confirmado.
- **E148** `[L]` Esse PNG é necessário para `Visual Baseline Tests`? Comparar com o resultado de E052–E055. ✅ Necessário / não.
- **E149** `[D]` Fechar #2234 com comentário "absorvida pelo main em #2254/4179c01; snapshot tratado em #<E055>". ✅ Fechada; branch excluída.
- **E150** `[L]` #2235 (`devin/1792343960-synclog-stale-cleanup`): ler o diff de `supabase/MIGRATIONS_SYNC_LOG.md` (remove 5 linhas "pendente" de versões já aplicadas). Para cada versão removida, confirmar no ledger real: `SELECT version FROM supabase_migrations.schema_migrations WHERE version IN (<5 versões>)`. ✅ As 5 estão aplicadas → remoção correta.
- **E151** `[L]` A branch tem commit + revert do bot de snapshot: confirmar que o diff líquido é só o `.md`. ✅ 1 arquivo.
- **E152** `[M]` Mergear #2235. Depois, fechar a tarefa equivalente `claude/feat-e75-migrations-dedup-261018-1605` (E211). ✅ Merged.
- **E153** `[L]` #2232 (`devin/1792342270-boundary-gate-fixes`, 3 arquivos, aplica limpo): ler o diff; rodar o teste do boundary gate (`grep -rln "boundary" scripts tests | head`) e o gate em si. ✅ Testes do lexer passam; gate passa no `main`+PR.
- **E154** `[L]` Conferir que a tabela de crons regenerada bate com os `cron:` reais (`grep -rn "cron:" .github/workflows supabase/migrations | wc -l` vs. tabela). ✅ Bate.
- **E155** `[PO]+[M]` Mergear #2232 (é gate de CI). ✅ Merged.
- **E156** `[L]` #2231 (`devin/1792342342-product-webhook-notnull`, edge function `product-webhook`): ler diff; conferir as colunas `NOT NULL` no `pg_catalog` (`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name IN (<tabelas usadas>)`). ✅ O fix cobre todas as colunas NOT NULL sem default.
- **E157** `[L]` Rodar o teste Deno da função se existir (`ls supabase/functions/product-webhook/*test*`; `deno test`). ✅ Verde.
- **E158** `[M]` Mergear #2231. ✅ Merged.
- **E159** `[W]` Deploy da edge **só** via `deploy-edge-functions.yml` (`workflow_dispatch`, `function_name=product-webhook`) — REGRA #8. ✅ Run verde; job "Compare GitHub × Canonical" verde.
- **E160** `[L]` **Portão da Fase 3:** `github_list_pull_requests state=open` → só resta #2228 (e PRs novas do próprio plano). Contar branches. ✅ Anotado no Diário.

---

## FASE 4 — PR #2228 `claude/hopeful-heisenberg-dt4bl3` (E161–E195)

> 111 commits, 607 arquivos: 155 `supabase/`, 113 `docs/`, 96 `e2e/`, 79 workflows, 51 `src/`, 47 `tests/`, 36 `scripts/`.
> Contém mudanças de natureza muito diferente — **não pode entrar como um bloco**. Será fatiada em PRs novas (branches novas a partir do `main`, cherry-pick por arquivo/commit). A branch original é do Joaquim/outra sessão: **não commitar nela**.
> Riscos medidos: (1) renomeia **38 migrations** (troca de versão para deduplicar timestamps) e apaga 70 de `supabase/migrations/` (68 vão para `supabase/sql-legacy/`, 2 para `supabase/rollbacks/`); (2) toca `src/integrations/supabase/client.ts` (só comentário — guarda SSOT preservada, `CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln"`); (3) toca `.github/CODEOWNERS`, `.github/required-checks.json`, `deploy-gates.yml`; (4) apaga 93 docs para `docs/arquivo/`.

- **E161** `[L]` Ler o corpo da PR #2228 (`github_get_pull_request`) e os 3 PRs já mergeados da mesma branch (#2149, #2157, #2158). ✅ Objetivo de cada "Onda" (16–19) anotado.
- **E162** `[L]` `git diff --name-status -M origin/main...origin/claude/hopeful-heisenberg-dt4bl3 > /tmp/2228-files.txt`; agrupar por área. ✅ Tabela área → arquivos.
- **E163** `[L]` Separar os 111 commits por tema: `git log --format='%h %s' origin/main..origin/claude/hopeful-heisenberg-dt4bl3 > /tmp/2228-commits.txt`; classificar cada um em: (F1) docs/arquivamento, (F2) CI/workflows ondas 16–19, (F3) e2e (migração p/ composite `e2e-setup`), (F4) scripts/gates, (F5) `src/`, (F6) migrations novas, (F7) **renome/movimentação de migrations**, (F8) segurança RLS/policies (Onda 4+5). ✅ Cada commit com 1 fatia.
- **E164** `[L]` Para cada fatia, `patchstat` restrito aos arquivos dela. ✅ Arquivos `APLICA` × `CONFLITA` por fatia.
- **E165** `[PO]` Apresentar ao Joaquim o fatiamento (8 PRs) e pedir decisão sobre **F7** (renomear 38 migrations aplicadas): "Organiza o histórico, mas cada versão renomeada precisa de `migration repair` uma a uma em produção; sem isso o drift-check e o ledger divergem. Recomendação: **não renomear** — manter versões duplicadas documentadas e só bloquear duplicatas novas via gate." ✅ Decisão registrada.

### 4A — F1 Docs (sem risco)

- **E166** `[W]` Branch `claude/chore-docs-arquivo-2228-<AAMMDD-HHMM>`; trazer `docs/arquivo/**`, postmortems e `DIVIDA_CRONICA/ONCALL/RELEASE` (commits `b6bc56260`, `5aa34e6ef`, `a839764da`, `7ebcaeda7`, `728cf5a10`). ✅ Só `docs/`.
- **E167** `[L]` Garantir que nenhum doc movido é referenciado por script/gate/CLAUDE.md (`git grep -n "<caminho antigo>"` para cada movido). Ajustar referências (ex.: `docs/SCHEMA_REFERENCE.md` é protegido — **não mover**). ✅ 0 referência quebrada.
- **E168** `[M]` PR + merge. ✅ Merged.

### 4B — F2/F4 CI e scripts (governança)

- **E169** `[W]` Branch `claude/infra-ci-ondas16-19-<AAMMDD-HHMM>` com os commits de CI: `2ab70eaf5`, `c3184c5d0`, `c877e2144` (E165 lotes), `cb000dc82` (E163), `fc9452b27` (E173/E176/E178/E179), `f17a78db9` (E171/E172/E174), `bccb6b203` (E183–E190), `4c0af3eb7` (E191), `8ba59186e` (E193), `fc43051e5` (E194), `a3327d1a6` (E196), `3ff00fdc5` (E197/E199), `1b2460f17`, `e3e0ec43f`. ✅ Cherry-pick sem conflito ou conflito resolvido semanticamente (REGRA #3).
- **E170** `[L]` `npx --yes actionlint` em todos os workflows tocados. ✅ 0 erro.
- **E171** `[L]` `node scripts/check-workflow-contracts.mjs --gate` (Gate 1.11) e `node scripts/check-secrets-inventory.mjs --gate` (Gate 1.14). ✅ Verdes.
- **E172** `[L]` Se algum `name:` de job mudou em `deploy-gates.yml` → atualizar `.github/required-checks.json` na mesma PR (CLAUDE.md, seção CI). ✅ Sentinel não alerta.
- **E173** `[L]` "SAST bloqueante / gitleaks no gate" (`f17a78db9`): rodar gitleaks local no `main`+PR. ✅ 0 achado novo (senão a PR quebra todo mundo).
- **E174** `[L]` `pr-size-guard` e `commitlint` (`bccb6b203`): simular nas PRs abertas do plano — elas passariam? ✅ Sim (senão ajustar limites antes).
- **E175** `[PO]+[M]` PR + OK do Joaquim + merge. ✅ Merged.

### 4C — F3 E2E

- **E176** `[W]` Branch `claude/chore-e2e-composite-2228-<AAMMDD-HHMM>` com os arquivos `e2e/**` da #2228 não cobertos por E169. ✅ Só `e2e/`.
- **E177** `[L]` `npx playwright test --list` antes/depois: o número de testes não pode cair. ✅ Contagem ≥ anterior.
- **E178** `[M]` PR + merge com E2E verde. ✅ Merged.

### 4D — F5 `src/`

- **E179** `[L]` Listar os 51 arquivos `src/` e o motivo de cada (commit de origem). ✅ Tabela.
- **E180** `[L]` `client.ts`: a única mudança é encurtar um comentário. **Descartar** essa mudança (arquivo protegido, ganho zero). ✅ `client.ts` fora da fatia.
- **E181** `[W]` Branch `claude/fix-src-2228-<AAMMDD-HHMM>` com o resto de `src/` (inclui TS2345 `43daffda0`, `02c47b1a7`, `0dbfd3418` se tocarem `src/`). ✅ `npx tsc --noEmit` sem erro novo; REGRA #2 OK (`grep -n "price\|sale_price\|shortDescription\|category_id\|category_name" src/types/product-catalog.ts`).
- **E182** `[M]` PR + merge. ✅ Merged + deploy READY.

### 4E — F6 migrations novas (sem renome)

- **E183** `[L]` Separar as 7 migrations **adicionadas** (`A`) e as 7 **modificadas** (`M`) da #2228. ✅ Lista.
- **E184** `[L]` Para cada `M` (migration antiga editada, ex. `20260602020000_fix_hardcoded_api_key_cron.sql` trocando `pqpdolkaeqlyzpdpbizo` → `doufsxqlfjyuvxuezpln`): migration já aplicada **não se edita** — a correção certa é migration nova. Verificar se o cron em produção já usa a URL certa: `SELECT jobname, command FROM cron.job WHERE command ILIKE '%pqpdolkaeqlyzpdpbizo%'`. ✅ 0 linha = edição é só cosmética (pode entrar como comentário); >0 = precisa migration nova.
- **E185** `[W]` Branch `claude/feat-migrations-2228-<AAMMDD-HHMM>` com as 7 `A` (inclui E063/E065–E070, `medallion_coverage_snapshots` soft-delete-exempt). ✅ Gate 1.3 (contratos) verde.
- **E186** `[PO]` Cada migration nova só vai para produção via `db-apply-migration.yml` com OK do Joaquim (REGRA #8). Listar versão, efeito e risco de cada uma. ✅ Aprovação por versão.
- **E187** `[M]` Mergear a PR (o merge não aplica DDL; a aplicação é E186). ✅ Merged; recibos E15 registrados.

### 4F — F7 renome/movimentação de migrations

- **E188** `[L]` Se o PO decidiu **não** renomear (recomendado em E165): descartar F7. Registrar no Diário. ✅ Descartado.
- **E189** `[L]` Se o PO decidiu renomear: para cada uma das 38, gerar o par (versão antiga → nova) e conferir no ledger: `SELECT version, name FROM supabase_migrations.schema_migrations WHERE version IN (<antigas>)`. ✅ Mapa completo.
- **E190** `[PO]` Plano de `migration repair` **com versão explícita** (nunca sem versão; nunca `--status reverted` em lote — CLAUDE.md REGRA #8). Executar só com o PO acompanhando, via workflow. ✅ Ledger = arquivos.
- **E191** `[L]` Depois, `db-schema-drift-check` + `schema-snapshot-export.yml` com `force_rotate: true` (CLAUDE.md, corolário do baseline). ✅ Drift verde.

### 4G — F8 Segurança RLS (Onda 4+5) e fechamento

- **E192** `[L]` Separar os arquivos de RLS/policies "fechamento anon+public, RESTRICTIVE" e comparar com `pg_policies` ao vivo (Gate 1.13). ✅ Diferenças listadas.
- **E193** `[PO]` DDL de RLS em produção → aprovação do Joaquim, aplicação via workflow, migration espelho. ✅ Aplicado + baseline de policies atualizado.
- **E194** `[L]` `patchstat claude/hopeful-heisenberg-dt4bl3` de novo. ✅ Todo arquivo restante é `IN_MAIN` ou foi conscientemente descartado (lista no Diário).
- **E195** `[D]` Fechar #2228 com comentário listando as PRs-fatia e o que foi descartado (e por quê). Excluir a branch. ✅ Fechada + excluída.

---

## FASE 5 — Branches `v2/*` (Fábrica Hermes / "Claude (integrador)") (E196–E220)

> 16 branches `v2/*` restantes. **11 sem PR** com conteúdo que **não está no `main` e aplica limpo**; 4 com PR fechada; 1 com resíduo de PR mergeada.
> Origem é outro agente: não commitar nelas. Consolidar em 3 PRs novas.

- **E196** `[PO]` Confirmar com o Joaquim se o trabalho da Fábrica Hermes de 08–09/out (mockup) ainda é desejado. Apresentar as 3 PRs abaixo como pacote. ✅ Decisão (se "não": pular para E218 e só arquivar).
- **E197** `[L]` `v2/mockup-assistant-edge-int` ⊂ `v2/mockup-assistant-tests-int` (medido com `merge-base --is-ancestor`). Usar só a `-tests-int`. ✅ Confirmado.
- **E198** `[L]` `patchstat v2/mockup-assistant-tests-int` (6 arquivos `APLICA`): edge nova `mockup-assistant` (rota Flash, limite 20/min) + shim LIVE para `check:edge-live-coverage`. ✅ Lista de arquivos.
- **E199** `[L]` A edge nova precisa de segredo de LLM? (`grep -n "Deno.env.get" supabase/functions/mockup-assistant/*.ts`). Cada segredo novo vai para `docs/ci/SEGREDOS.md` (Gate 1.14). ✅ Lista de segredos.
- **E200** `[L]` A edge valida auth e entrada (zod)? (`scripts/check-edge-authorization.mjs`). ✅ Passa.
- **E201** `[W]` **PR-V2-A** `claude/feat-mockup-assistant-<AAMMDD-HHMM>`: cherry-pick dos commits de `v2/mockup-assistant-tests-int`. ✅ `deno test` da edge + gates verdes.
- **E202** `[M]` Merge + deploy da edge via `deploy-edge-functions.yml` (`function_name=mockup-assistant`). ✅ Deploy verde; drift "Compare GitHub × Canonical" verde.
- **E203** `[L]` `v2/fix-ad-prompt-timeout-int` (6 arquivos: `generate-ad-prompt` com o mesmo timeout da `generate-ad-image`; `PromptGenerator` com `timeoutMs` 60s) e `v2/m18-2610082248` (4 arquivos: Magic Up sem import morto, zod unificado). Verificar sobreposição de arquivos entre as duas. ✅ Sem conflito entre si.
- **E204** `[W]` **PR-V2-B** `claude/fix-magic-up-edges-<AAMMDD-HHMM>` com as duas. ✅ Testes verdes.
- **E205** `[M]` Merge + deploy de `generate-ad-prompt` (e demais edges tocadas) via workflow. ✅ Deploy verde.
- **E206** `[L]` Branches só de teste: `v2/aposentar-mockup-audit-fatia1-int` (2), `v2/matriz-aceite-mockup-grupo6-int` (2), `v2/n29-2610082246-int` (1), `v2/n31-2610082246-int` (1), `v2/s77-1-2610081950-int` (2), `v2/s77-4-2610081951-int` (2). Verificar sobreposição de arquivos. ✅ Mapa.
- **E207** `[L]` Rodar cada spec nova localmente contra o `main` (`npx playwright test <spec>`). ✅ Verdes (spec que falha por seletor desatualizado → corrigir o seletor, não pular).
- **E208** `[W]` **PR-V2-C** `claude/test-mockup-acceptance-<AAMMDD-HHMM>` com as 6. ✅ `Check min tests executed` sobe.
- **E209** `[M]` Merge. ✅ Merged.
- **E210** `[L]` `v2/refazer-73aad982` (1 arquivo: FAQ da fábrica de correções / VPS Hostinger): é doc interno de outro sistema. Conferir se cabe neste repo. ✅ Decisão: incluir em `docs/` ou descartar.
- **E211** `[L]` PRs fechadas: `v2/fix-busca-de-cliente-do-mockup-consulta--2610081917` (#2095), `v2/fix-remover-atalhos-destrutivos-do-gerad-2610081909` (#2096), `v2/refazer-adb7f295` (#2107), `v2/s33-2610081947` (#2103): ler o motivo do fechamento de cada (`github_list_issue_comments`). ✅ Motivo anotado.
- **E212** `[L]` Para as fechadas com motivo "refazer"/"substituída": confirmar que o substituto entrou (ex.: atalhos destrutivos removidos — `grep -rn "Ctrl+R\|Ctrl+D" src/components/mockup* | head`). ✅ Substituto presente ou ausente.
- **E213** `[PO]` Se algum substituto estiver ausente (trabalho perdido), perguntar ao Joaquim se quer recuperar. ✅ Decisão.
- **E214** `[L]` `v2/e2e-mockup-resilience-int` (PR #2093 mergeada; 1 arquivo conflita): `pend` → o arquivo divergente evoluiu no `main` depois? (`git log -3 origin/main -- <arquivo>`). ✅ Evoluiu → resíduo descartável.
- **E215** `[L]` `patchstat` final de cada `v2/*`. ✅ Cada arquivo `IN_MAIN` ou com descarte justificado.
- **E216** `[D]` Fechar PRs abertas restantes de v2 (nenhuma esperada). ✅ —
- **E217** `[D]` Excluir as 16 `v2/*` restantes em lote. ✅ Removidas.
- **E218** `[L]` (Se E196 = "não") Registrar que o conteúdo fica só nas tags `archive/2026-10-19/v2/*`. ✅ Registrado.
- **E219** `[L]` Contar branches. ✅ Anotado.
- **E220** `[L]` Atualizar a issue de E019. ✅ Comentário.

---

## FASE 6 — Resíduos, PRs fechadas e órfãs (E221–E265)

### 6A — Categoria G (PR mergeada + resíduo)

> Regra: se **não há commit depois do `mergedAt`** da última PR mergeada, o resíduo é efeito de squash/evolução do `main` → descartar. Se há, cada commit pós-merge é avaliado.

- **E221** `[L]` Sem commit pós-merge (medido): `claude/audit-gaps-20260915`, `claude/auditoria-cb3-f04-t22p1`, `claude/auth-and-ratchet-followup`, `claude/quality-gates-hardening-20260913`, `claude/system-status-roadmap-oe6awn`, `claude/zapp-catalog-stats-governance-20260915`, `codex/kit-maker-completion-20260912`, `codex/reconciliation-integrity-20260915`, `codex/stabilization-completion-100`, `codex/vercel-workflow-health-20260831`. Revalidar com `git log --format=%cI origin/main..origin/<b> | sort | tail -1` < mergedAt. ✅ Todas sem pós-merge.
- **E222** `[L]` Amostragem de segurança: para `claude/audit-gaps-20260915` (41 arquivos "conflitam"), conferir 5 arquivos ao acaso com `git log -2 origin/main -- <arquivo>` → o `main` mexeu depois do merge. ✅ Evolução posterior confirmada.
- **E223** `[D]` Excluir as 10 de E221. ✅ Removidas.
- **E224** `[L]` `claude/fix-conflict-pr1910-260927-1400` — pós-merge `1bc80b0b2` (cache keys `bun.lockb`→`bun.lock`): `grep -rn "bun.lockb" .github/workflows | wc -l` no `main` = 0. ✅ Absorvido → excluir.
- **E225** `[L]` `claude/fix-plano-erros-validacao-20260927-0039` — pós-merge `8f9f89f8e` (fork guard + canal único de deploy): `main` já tem fork guard em 20 workflows. Confirmar o "canal único de deploy" (`grep -rln "vercel deploy\|vercel --prod" .github/workflows`). ✅ Absorvido → excluir.
- **E226** `[L]` `claude/promo-brindes-audit-301lml` — **31 commits pós-merge** (G11). Listar: `git log --format='%h %cI %s' origin/main..origin/claude/promo-brindes-audit-301lml | awk '$2>"2026-09-04T13:57:40Z"'` > `/tmp/301lml.txt`. ✅ 31 linhas.
- **E227** `[L]` Para cada commit: `git show --stat <sha>` e `patchstat` restrito aos arquivos; classificar `JA_NO_MAIN` / `APLICA` / `CONFLITA`. ✅ Tabela 31 × status.
- **E228** `[L]` Checagens já medidas: E32 (`grep: /@smoke/` no `playwright.config.ts:147`) **já está no main**; E21 (`auth.setup.ts` falha hard em CI sem credencial) **não encontrado** no `main` (`grep -nE "throw|CI" e2e/auth.setup.ts` vazio) — candidato forte. ✅ Confirmado.
- **E229** `[L]` E79 (`DRY_RUN=1` nos scripts de carga/fuzz) e E80 (allowlist `lint-untyped-from`): conferir no `main`. ✅ Status de cada.
- **E230** `[W]` Branch `claude/fix-resgate-301lml-<AAMMDD-HHMM>` com os commits `APLICA` que ainda fazem sentido (E21 junto com `claude/feat-e21-auth-ci-strict-011001-2035`, ver E246). ✅ Testes verdes.
- **E231** `[L]` Commits `CONFLITA`: reimplementar manualmente só se o objetivo ainda não foi atingido no `main` (checar pelo efeito, não pelo texto). ✅ Lista do que foi reimplementado/descartado.
- **E232** `[M]` PR + merge. ✅ Merged.
- **E233** `[D]` Excluir `claude/promo-brindes-audit-301lml`, `claude/fix-conflict-pr1910-260927-1400`, `claude/fix-plano-erros-validacao-20260927-0039`. ✅ Removidas.
- **E234** `[L]` `fix/incidente-2026-10-13-*` (5 branches): pós-merge são commits vazios `ci: re-trigger pipeline` + cabeçalhos de rollback lógico em migrations (`d78516345`, `23f591c43`), registro de remoção justificada (`74af9ff4c`), caminho de allowlist (`f54deaca6`). Para cada arquivo: `pend fix/incidente-2026-10-13-<x>`; e conferir se o cabeçalho de rollback já existe no `main` (`grep -l "rollback" <migration>`). ✅ Status por arquivo.
- **E235** `[W]` Se algum cabeçalho/registro faltar: PR `docs(migrations): completa cabeçalhos de rollback do incidente 2026-10-13`. Senão, pular. ✅ PR mergeada ou "nada a salvar".
- **E236** `[D]` Excluir as 5 `fix/incidente-2026-10-13-*`. ✅ Removidas.

### 6B — Categoria H (PR fechada sem merge) — verificar objetivo no `main`

- **E237** `[L]` `claude/security-2208-resolved-261018-1845` (#2224 fechada; 17 commits; 22 arquivos `APLICA`). O `main` tem `f0d8b8e fix(security): E017/E018/E020/E021/E028/E043/E044/E045 hardening (#2236)`. Rodar `patchstat` e cruzar cada `APLICA` com o tema do commit. ✅ Tabela.
- **E238** `[L]` Itens provavelmente **não** absorvidos: E96 (remover `bun` de 11 workflows — o `main` ainda tem 13 workflows com bun, G7), E73 (pin `setup-node-ci` v7.1.0, `deno-version` exato), E33+R5 (`PGPASSWORD` step-level em 7 workflows), E68 (`schema-snapshot-export` paths). Confirmar cada um com grep no `main`. ✅ Lista do que falta.
- **E239** `[W]` Branch `claude/infra-resgate-security-2208-<AAMMDD-HHMM>` só com os itens faltantes. Atenção a `fdb08516b` (remove "Compare GitHub × Canonical" do `required-checks.json`) — **conflita** com `claude/fix-e73-e74-sha-stable-jobs-261018-2155` (adiciona). Decidir pelo branch protection real de E007. ✅ `required-checks.json` = contexts reais.
- **E240** `[PO]+[M]` PR (workflows) + OK + merge. ✅ Merged. Excluir a branch.
- **E241** `[L]` Actionlint ×3 (`claude/fix-actionlint-secrets-if-261018-2030` #2251, `devin/1792351727-…` já excluída, commits em #2271): rodar actionlint no `main` (resultado de E018). ✅ Se 0 erro sobre `secrets` em `if:` → objetivo atingido.
- **E242** `[W]` Se ainda houver erro: PR única `fix(ci): actionlint — secrets em if de step` a partir do `main`. ✅ actionlint 0.
- **E243** `[M]` Merge (se E242). ✅ —
- **E244** `[D]` Excluir `claude/fix-actionlint-secrets-if-261018-2030`. ✅ Removida.
- **E245** `[L]` Objetivos E já atingidos no `main` (medido nesta análise) → excluir direto após confirmar o comando: E18 (`grep -rnE "node-version: *['\"]?[0-9]" .github/workflows` = 0) → `claude/chore-node-version-nvmrc-e18-270927-2005`, `claude/fix-e18-nvmrc-node-version-011001-1630`; E13 (composite `setup-node-ci` usado 9× em `deploy-gates.yml`) → `claude/feat-e13-setup-node-ci-composite-20261001-1706`; E23 (`_secrets-check` existe) → `claude/feat-e23-secrets-check-011001-2045`; E05 (`overrides.image-size = ^2.0.4`) → `claude/fix-image-size-vuln-e05-270927-2008`; E26 (0 `continue-on-error: true` em `replenishment-quality.yml`) → `claude/fix-e26-replenishment-quality-011001-2050`; E14 (`paths-filter` em `deploy-gates.yml`) → `claude/fix-e14-paths-docs-filter-261018-2010`; E57 (`consecutive` em `edge-functions-drift-check.yml`) → `claude/feat-e57-drift-consecutive-failures-261018-1608`. ✅ 8 confirmadas.
- **E246** `[L]` E21 strict (`claude/feat-e21-auth-ci-strict-011001-2035`): **não** está no `main` (E228). Levar junto com E230. ✅ Incluído em E230.
- **E247** `[L]` E19 cron jitter (`claude/chore-cron-jitter-e19-270927-2015`, `claude/fix-e19-cron-jitter-011001-1720`): o `main` ainda tem 2 crons em `:00/:30` (`policies-baseline.yml` `30 10 * * 1` — intencional, comentário E89; `e2e-focused.yml` `0 2 * * 1`). Crons do Supabase (`cron.job`) também: `SELECT jobname, schedule FROM cron.job WHERE schedule ~ '^(0|30) '`. ✅ Residual anotado; se relevante, PR pequena (e2e-focused → `:07`). Excluir as 2 branches.
- **E248** `[L]` E73/E74 (`claude/fix-e73-e74-sha-stable-jobs-261018-2155`, #2223): `required-checks.json` do `main` já tem "Compare GitHub × Canonical"; conferir contra E007/E008 e com o `fetch-depth 2` do drift check. ✅ Absorvido ou PR mínima. Excluir branch.
- **E249** `[L]` E33 freight thresholds (`claude/fix-e33-freight-gates-thresholds-261001-0000`, `claude/fix-e33-v2-261002-1530` — mesma tarefa duas vezes): `git diff origin/main origin/claude/fix-e33-v2-261002-1530 -- .github/workflows/freight-quality-gates.yml` — o `main` tem thresholds reais e `DRY_RUN` explícito? ✅ Absorvido / falta.
- **E250** `[W]` Se faltar: PR mínima (combinar com E140 se #2248 ainda aberta não — fazer depois). ✅ —
- **E251** `[L]` E04 ledger parity (`claude/fix-e04-ledger-parity-011001-1630`): `git diff origin/main origin/claude/fix-e04-ledger-parity-011001-1630 -- .github/workflows/db-schema-drift-check.yml scripts/`; o `main` reescreveu o drift-check com baseline (CLAUDE.md corolário). ✅ Superado (esperado) ou falta.
- **E252** `[L]` Gate 1.9 file-size (`claude/fix-gate1.9-file-size-baseline-261018-1900`) e no-shadow (`claude/fix-no-shadow-mockup-history-test-261009-1937`): rodar o ratchet de file-size e `npx eslint src/**/MockupHistoryPage.test.tsx` no `main`. ✅ Verdes → superadas.
- **E253** `[L]` E75 dedup sync-log (`claude/feat-e75-migrations-dedup-261018-1605`): coberto por #2235 (E152). ✅ Superada.
- **E254** `[D]` Excluir em lote todas as branches H confirmadas em E245–E253 (até 16). ✅ Removidas.

### 6C — Categoria I (órfãs sem PR)

- **E255** `[L]` `codex/fix-high-priority-bug-in-oauth-smoke-test` (27 commits de maio/2026, sem PR, 75 arquivos conflitam): temas — remoção de backdoor `simulation-bypass` hardcoded (`b5b3d0d6f`), rules-of-hooks em `useOnboardingContext`, race conditions no `AuthContext`, null-safety em `useQuotes`. ✅ Lista dos 27 temas.
- **E256** `[L]` Confirmar backdoor removido no `main`: `git grep -nE "(sim|bypass)[_-]?key\s*[:=]\s*['\"][A-Za-z0-9]{16,}" -- supabase/functions src scripts` = 0 e `node scripts/check-no-bypass-literals.mjs` exit 0. ✅ Sem literal hardcoded.
- **E257** `[L]` Confirmar rules-of-hooks: `npx eslint src --rule 'react-hooks/rules-of-hooks: error' --quiet` sem erro. ✅ 0.
- **E258** `[D]` Excluir `codex/fix-high-priority-bug-in-oauth-smoke-test`. ✅ Removida.
- **E259** `[L]` `codex/magazine-dbdeploy-20260909` (5 commits, "executor isolado das RPCs Magazine"): superado pelo caminho único `db-apply-migration.yml` (E15). Confirmar que as RPCs Magazine existem: `SELECT proname FROM pg_proc WHERE proname ILIKE '%magazine%'`. ✅ Existem.
- **E260** `[D]` Excluir `codex/magazine-dbdeploy-20260909`. ✅ Removida.
- **E261** `[L]` `rescue/local-main-20260909-1145` (5 commits de docs "plano de 100 etapas"): mesmos títulos de `codex/stabilization-completion-100`, já `IN_MAIN`. Conferir com `pend`. ✅ Os docs existem no `main` (ou divergem só por evolução).
- **E262** `[D]` Excluir `rescue/local-main-20260909-1145`. ✅ Removida.
- **E263** `[L]` Contar branches remotas. ✅ Esperado: `main`, `gh-pages`, branch deste plano + branches de PRs ainda abertas do próprio plano.
- **E264** `[L]` Para qualquer branch fora dessa lista: classificar e tratar (receita da categoria). ✅ Nenhuma sobra.
- **E265** `[L]` Atualizar a issue de E019. ✅ Comentário.

---

## FASE 7 — Prevenção (não voltar a ter 100 branches) (E266–E285)

- **E266** `[L]` Confirmar `deleteBranchOnMerge = true` (medido: true). ✅ OK.
- **E267** `[L]` Ler os workflows que criam branches (`e15-receipt-*`, `bot/*`, `ci-metrics/*`, snapshots): `grep -rn "git push\|create-pull-request\|peter-evans" .github/workflows | cut -d: -f1 | sort -u`. ✅ Lista de geradores.
- **E268** `[L]` Para cada gerador: a branch some quando a PR fecha sem merge? ✅ Lista dos que deixam lixo.
- **E269** `[W]` PR `chore(ci): limpeza automática de branch de PR fechada` — workflow `on: pull_request: types: [closed]` que apaga a head-branch quando `merged == false` **e** o autor é bot conhecido (dependabot, github-actions, devin) ou o prefixo é `e15-receipt-`/`bot/`/`ci-metrics/`. Seguir as 8 regras E12 (`permissions: contents: write` só nesse job, `timeout-minutes`, etc.). ✅ actionlint 0; testado numa PR descartável.
- **E270** `[PO]` `gh-pages`: manter (recomendado — publica relatórios E2E usados por `global-search-gate.yml` e `e2e-cnpj.yml`) **ou** migrar Pages para `actions/deploy-pages` (artifact, sem branch). Apresentar: manter = custo zero; migrar = elimina a última branch extra, ~2h de trabalho, risco de quebrar links de relatório. ✅ Decisão.
- **E271** `[PO]` Executar a decisão de E070 (bloquear push direto em `main`, inclusive admin) via `github_update_branch_protection` ou ruleset. ✅ Push direto de teste rejeitado.
- **E272** `[W]` PR `docs(governanca): regra de uma tarefa = uma branch entre agentes` — adicionar ao `CLAUDE.md`/`AGENTS.md`: antes de abrir branch, listar PRs abertas que tocam os mesmos arquivos (`github_list_pull_requests` + `github_list_pr_files`); se houver, não abrir outra. Referenciar G10. ✅ Merged.
- **E273** `[W]` (Se E269 não cobrir) ajustar `db-apply-migration.yml` para apagar `e15-receipt-*` após merge/fechamento do recibo. ✅ —
- **E274** `[W]` G5 — bot de snapshot commitando em PR alheia: ler `.github/workflows/e2e-update-dialog-snapshots.yml` (e `e2e-update-calendar-snapshots.yml`); restringir para **não** rodar em PR de `dependabot/**` nem de branch de outro autor (condição `if: github.event.pull_request.user.login == ...` ou só `workflow_dispatch`). ✅ Testado: PR do dependabot não recebe commit do bot.
- **E275** `[PO]+[M]` Merge de E269/E273/E274 (workflows). ✅ Merged.
- **E276** `[L]` G8 — `supabase/functions/cnpj-lookup/index.ts:31` lê `SIMULATION_BYPASS_KEY`. Ler as linhas 20–60: o bypass pula auth/rate-limit em produção? Quem tem a chave? ✅ Veredito (seguro / brecha).
- **E277** `[W]` Se brecha: PR `fix(security): cnpj-lookup não aceita bypass de simulação em produção` + deploy via workflow. ✅ Merged + deploy.
- **E278** `[W]` Agendar relatório semanal de branches (workflow `schedule` leve, ou issue automática) listando branches com > 7 dias sem PR aberta. ✅ Workflow criado (R1–R8).
- **E279** `[L]` Conferir que `.lovableignore` protege os arquivos novos de governança criados neste plano (CLAUDE.md, arquivos protegidos). ✅ Incluídos.
- **E280** `[L]` Atualizar `docs/ci/SEGREDOS.md` com qualquer segredo introduzido nas fases 1–7. ✅ Gate 1.14 verde.
- **E281** `[L]` Atualizar `.github/required-checks.json` se algum job obrigatório mudou de nome. ✅ Sentinel verde.
- **E282** `[L]` `graphify update .` (AST-only, sem custo de API) após os merges de código. ✅ `graphify-out/GRAPH_REPORT.md` com commit de origem = HEAD.
- **E283** `[L]` Atualizar CLAUDE.md "Última atualização" com referência a este plano (só a linha de data + 1 linha de resumo). ✅ PR pequena mergeada.
- **E284** `[L]` Revisar se algum workflow aponta para branch excluída (`grep -rnE "branches:|ref:" .github/workflows | grep -vE "main|gh-pages"`). ✅ Nenhum.
- **E285** `[L]` Atualizar a issue de E019. ✅ Comentário.

---

## FASE 8 — Validação final e entrega (E286–E300)

- **E286** `[L]` `git fetch origin --prune && git branch -r | grep -v HEAD`. ✅ Somente `origin/main` e `origin/gh-pages` (ou só `main` se E270 = migrar) + branches de PR **aberta** criadas depois por bots legítimos.
- **E287** `[L]` `git ls-remote --tags origin 'archive/2026-10-19/*' | wc -l` = 105. ✅ Rede de segurança intacta.
- **E288** `[L]` Para 5 branches excluídas ao acaso, provar recuperação: `git checkout -b tmp-restore archive/2026-10-19/<b>` funciona (local, sem push). ✅ OK; apagar `tmp-restore`.
- **E289** `[L]` `github_list_pull_requests state=open`. ✅ Nenhuma PR órfã do plano; só PRs novas legítimas.
- **E290** `[L]` Runs do HEAD do `main` (`github_list_workflow_runs head_sha=<HEAD>`). ✅ 0 `failure` em gates bloqueantes; "Gate Final - Deploy Ready" verde.
- **E291** `[L]` `node scripts/validate-supabase-config.mjs` + `npm run check:types-inventory-drift` + `npx tsc --noEmit` + `npx vitest run` no HEAD. ✅ Todos verdes.
- **E292** `[L]` REGRA #2: campos do `Product` presentes. ✅ OK.
- **E293** `[L]` Deploy de produção do HEAD: Vercel/Lovable `READY` e `https://www.promogifts.com.br/` responde 200. ✅ OK.
- **E294** `[L]` Uptime Monitor do último ciclo verde. ✅ OK.
- **E295** `[L]` `db-schema-drift-check` e `edge-functions-drift-check` do último ciclo verdes. ✅ OK.
- **E296** `[L]` `supabase/MIGRATIONS_SYNC_LOG.md` tem recibo de toda migration aplicada nas fases 1/4. ✅ OK.
- **E297** `[W]` Preencher a seção 11 (Diário) e a tabela "Resultado" abaixo neste arquivo; PR `docs(plano): resultado da integração de branches`. ✅ Merged.
- **E298** `[D]` Excluir a branch deste plano (`claude_pink/serene-keller-y4gogg`) se ainda existir após o merge. ✅ Removida.
- **E299** `[L]` Fechar a issue de E019 com o placar final (branches antes/depois, PRs mergeadas, PRs fechadas, o que foi descartado e por quê, pendências [PO]). ✅ Fechada.
- **E300** `[L]` Relatório ao Joaquim (curto, PT-BR, para não-dev): antes/depois, o que entrou em produção, o que ficou aguardando decisão dele, link da issue. ✅ Entregue.

---

## 9. Ordem de execução e paralelismo

```
Fase 0 ──► Fase 1 (main verde) ───────────────► Fase 3 ──► Fase 4 ──► Fase 5 ──► Fase 6 ──► Fase 7 ──► Fase 8
     └──► Fase 2 (limpeza, só git, paralela) ──┘
```

- Fase 2 não toca código → pode rodar junto com a Fase 1.
- Dentro da Fase 3, dependabot (3B) e Devin (3D) são independentes entre si; os merges são sempre **um por vez** (cada merge muda o `main` e invalida o CI dos outros).
- Antes de cada merge: `github_update_pr_branch` (traz o `main` para a PR) → esperar CI → mergear.

## 10. Pontos que exigem o Joaquim (resumo)

| Etapa | Decisão | Recomendação |
|---|---|---|
| E020 | Pausar outros agentes durante a integração | Sim |
| E026 | Rotacionar senha do usuário E2E e atualizar segredos | Sim — destrava 11 verificações |
| E049 / E186 / E193 | Aplicar migrations em produção (SECDEF, novas da #2228, RLS) | Sim, uma a uma via workflow |
| E063 | Permissão do Release Please | Liberar `GITHUB_TOKEN` (custo zero) |
| E070 / E271 | Bloquear push direto em `main` | Sim |
| E134 | Major do `actions/checkout` | Sim, após teste |
| E139/E142/E144/E155/E175/E240/E275 | Merge de mudanças em workflows/CI | Sim |
| E165 | Renomear 38 migrations já aplicadas | **Não** renomear |
| E196 / E213 | Manter trabalho da Fábrica Hermes (mockup) | Sim (3 PRs) |
| E270 | `gh-pages` | Manter |

## 11. Diário de execução (o executor preenche)

| Data/hora | Etapa | Resultado | Evidência (comando/link) |
|---|---|---|---|
| | | | |

## 12. Resultado (preencher em E297)

| Métrica | Antes (2026-10-19) | Depois |
|---|---|---|
| Branches remotas (exceto `main`) | 106 | |
| PRs abertas | 17 | |
| Workflows vermelhos no HEAD do `main` | 17 de 40 | |
| PRs mergeadas pelo plano | — | |
| PRs fechadas sem merge | — | |
| Tags `archive/2026-10-19/*` | 0 | 105 |
