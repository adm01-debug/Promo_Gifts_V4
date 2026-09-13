# Plano de Melhorias e Correções — 50 Etapas
**Repo:** `adm01-debug/Promo_Gifts_V4` · **Data:** 2026-09-13 · **Base:** `origin/main @ 892921430`
**Autor:** análise técnica exaustiva (evidência coletada em execução, não inferida)

---

## 0. Sumário executivo

Levantamento sobre o estado real do repositório em 2026-09-13. Todos os números abaixo foram
**medidos**, não estimados.

| Dimensão | Medição | Situação |
|---|---|---|
| Sincronia com GitHub | trees idênticas, 25/25 refs batendo, `fsck` limpo | 🟢 |
| `main` local | 19 commits atrás de `origin/main` | 🟠 |
| Branch em uso | `codex/kit-maker-catalog-fix-20260911` — mergeado e deletado no remoto | 🔴 |
| CI/CD Pipeline | **3/3 runs falhando** (gate lint 0029) | 🔴 |
| stock-module-quality | **2/2 runs falhando** (cobertura 57,17% < 60%) | 🔴 |
| Supabase Linter Gate | **verde, mas no-op total** (404 → `exit 0`) | 🔴 |
| Baseline do linter | `.json` contém **base64**, `JSON.parse` falha, `catch` retorna `Set()` vazio | 🔴 |
| Issues abertas | 302, das quais **290 são ruído de bot** (`autoheal`) | 🔴 |
| Migrations | 2.983 arquivos; 1.674 só em jun/2026; 67 fora do padrão de nome | 🟠 |
| Workflows CI | 111 arquivos, 14.584 linhas, 82 disparam em PR | 🟠 |
| Dependências | 22 majors atrás; 2 CVEs `high` | 🟠 |
| `src/` | 2.568 arquivos TS/TSX, 564.053 linhas; `types.ts` = 64.637 linhas | 🟠 |
| Baselines de qualidade | 13 arquivos de ratchet; TS baseline diz 145 erros, real é **0** | 🟠 |

### O achado mais grave

Três gates de segurança reportam verde sem executar verificação alguma:

1. `scripts/check-supabase-linter.mjs:66-72` — `loadBaseline()` faz `JSON.parse` de um arquivo
   que está **codificado em base64**. Lança, cai no `catch {}` e retorna um `Set` vazio.
   Os 50 findings aceitos da whitelist são invisíveis para o gate.
2. O mesmo script sai com `process.exit(0)` quando a Management API responde 404 — que é
   **exatamente o que acontece hoje** (`⚠️ /database/lint endpoint retornou 404 — Pulando lint.`
   no run `34742178476`, 2026-09-13T06:12). O gate roda, imprime aviso e passa.
3. Resultado: "Supabase Linter Gate" tem **5/5 sucessos** nos últimos runs sem ter validado nada.

Um gate verde que não verifica é pior que um gate ausente: cria confiança falsa e justifica
merge. Isto encabeça a Fase 1.

### Regras do projeto respeitadas neste plano

- **REGRA #1:** nenhuma etapa altera `CURRENT_PROJECT_ID`. O SSOT `doufsxqlfjyuvxuezpln` foi
  verificado íntegro em `client.ts`, `config.toml`, `.temp/project-ref` e `.env.local`.
- **REGRA #8:** nenhuma etapa executa DDL, migration ou deploy sem aprovação explícita do PO.
  Etapas que tocam schema estão marcadas **`[REQUER-PO]`** e param antes da execução.
- **REGRA #5:** nenhuma etapa persegue snapshots. Onde há quebra em massa, a etapa manda
  investigar o componente.

### Convenções

| Campo | Significado |
|---|---|
| **Esforço** | `P` ≤ 2 h · `M` ≤ 1 dia · `G` 2–5 dias · `GG` > 1 semana |
| **Risco** | chance de a própria correção quebrar algo |
| **Dep.** | etapas que precisam estar concluídas antes |
| **`[REQUER-PO]`** | exige aprovação humana explícita (REGRA #8) |

---

## FASE 0 — Desbloqueio imediato
> Objetivo: CI verde e árvore de trabalho limpa. Nada mais avança enquanto o pipeline está vermelho.

### E01 · Documentar o finding 0029 órfão e destravar o CI/CD Pipeline
**Problema (medido):** `CI/CD Pipeline` falha em 3/3 runs. Step: `🛡️ Supabase lint 0029 drift gate`.
Log do run `34724812962`: `❌ 1 finding(s) 0029 NÃO documentados na allowlist`.
**Ação:**
1. `node scripts/check-lint-0029-drift.mjs --require-live` local para identificar **qual** função.
2. Avaliar a função: ela precisa mesmo de `SECURITY DEFINER` executável por `authenticated`?
3. Se sim → entrada em `.security/lint-0029-allowlist.json` com `reason` **específico**
   (o que a função faz, por que o `DEFINER` é necessário, qual RLS a protege).
4. Se não → **`[REQUER-PO]`** revogar o `GRANT EXECUTE` via migration forward-only.
**Aceite:** `CI/CD Pipeline` verde; a nova entrada não usa o texto genérico "Baseline canônica".
**Esforço:** P · **Risco:** baixo · **Dep.:** —

### E02 · Restaurar cobertura do módulo de estoque acima do threshold
**Problema (medido):** `stock-module-quality` falha em 2/2 runs. Log do run `34724813025`:
`lines 57,17% < 60%` · `functions 55,64% < 60%` · `statements 56,33% < 60%`.
**Ação:** rodar cobertura local do escopo do módulo, ordenar arquivos por linhas descobertas,
escrever testes para os 5 maiores buracos. **Não** baixar o threshold — o threshold é o contrato.
**Aceite:** os três thresholds ≥ 60% com o mesmo valor de gate atual.
**Esforço:** M · **Risco:** baixo · **Dep.:** E15

### E03 · Fast-forward do `main` e poda de branches mortos
**Problema (medido):** `main` local 19 commits atrás, 0 à frente. Branch em uso
(`codex/kit-maker-catalog-fix-20260911`) foi mergeada no PR #1857 e deletada no remoto —
está 4 commits atrás e é ancestral de `origin/main`. Outras 5 branches locais com upstream `[gone]`.
**Ação:**
```sh
git checkout main && git merge --ff-only origin/main
git branch -d codex/kit-maker-catalog-fix-20260911 \
              codex/kit-maker-integration-20260910 \
              codex/kit-maker-atomic-persistence-20260911 \
              codex/kit-maker-reference-catalog-20260912 \
              codex/dependency-security-20260909 \
              codex/reconcile-canonical-ledger-20260911
```
Usar `-d` (nunca `-D`): o git recusa se houver commit não mergeado — é a rede de segurança.
**Aceite:** `git branch -vv | grep gone` vazio; `main` == `origin/main`.
**Esforço:** P · **Risco:** nulo · **Dep.:** —

### E04 · Triagem dos 2 stashes órfãos
**Problema (medido):** `stash@{0}` = "lint-staged automatic backup" (resíduo de commit abortado
por hook — pode conter trabalho real). `stash@{1}` de 2026-09-10.
**Ação:** `git stash show -p 'stash@{N}'` em cada um; aplicar o que for relevante em branch
própria; `git stash drop` no resto. Registrar a decisão no PR.
**Aceite:** `git stash list` vazio, com o destino de cada stash documentado.
**Esforço:** P · **Risco:** baixo · **Dep.:** —

### E05 · Ressincronizar o grafo graphify
**Problema (medido):** `GRAPH_REPORT.md` diz `Built from commit: 4126d7a5`; `HEAD` é `60f5df628`.
O grafo está defasado, o que degrada toda consulta `graphify query`.
**Ação:** `graphify update . --force`; confirmar que o auto-sync N8N (janela de 15 min) está vivo;
se não estiver, abrir issue própria para o pipeline de sync.
**Aceite:** commit do relatório == `HEAD`.
**Esforço:** P · **Risco:** nulo · **Dep.:** E03

### E06 · Fechar o ciclo do PR #1860
**Problema (medido):** PR #1860 (`codex/kit-maker-completion-20260912`) está `MERGEABLE` mas
`UNSTABLE` — bloqueado exatamente por E01 e E02. Branch local == remoto (0/0).
**Ação:** após E01+E02, re-disparar os checks, revisar o diff de 5 commits e mergear ou fechar.
Não deixar PR aberto acumulando drift contra `main`.
**Aceite:** PR #1860 mergeado ou fechado com justificativa.
**Esforço:** P · **Risco:** baixo · **Dep.:** E01, E02

---

## FASE 1 — Integridade dos gates
> Objetivo: nenhum gate pode passar sem ter executado. Verde deve significar verificado.

### E07 · Corrigir a baseline base64 do supabase-linter
**Problema (medido):** `.security/supabase-linter-baseline.json` (8.520 bytes) contém base64,
não JSON. Decodifica para um JSON válido com **50 findings aceitos**.
`scripts/check-supabase-linter.mjs:68` faz `JSON.parse(readFileSync(...))` → lança sempre.
**Ação:** decodificar e regravar como JSON legível (`base64 -d`), preservando `_doc` e
`generated_at`. Commitar o conteúdo decodificado. Investigar no `git log -p` **quando** o arquivo
virou base64 — se foi commit do Lovable, é caso de REGRA #7.
**Aceite:** `python3 -c "import json;json.load(open('.security/supabase-linter-baseline.json'))"`
sai 0; `accepted` com 50 entradas.
**Esforço:** P · **Risco:** baixo · **Dep.:** —

### E08 · Eliminar o `catch {}` silencioso de `loadBaseline()`
**Problema (medido):** `scripts/check-supabase-linter.mjs:70` — `catch { return new Set(); }`.
Qualquer erro de leitura/parse degrada silenciosamente para baseline vazio. É a definição de fail-open.
**Ação:** distinguir os casos. `ENOENT` (primeira execução) → baseline vazio **com aviso explícito**.
Qualquer outro erro, inclusive parse → `console.error` + `process.exit(2)`.
**Aceite:** teste unitário que aponta o script para um arquivo corrompido e espera exit ≠ 0.
**Esforço:** P · **Risco:** baixo · **Dep.:** E07

### E09 · Tornar o Supabase Linter Gate fail-closed no 404
**Problema (medido):** run `34742178476` (2026-09-13T06:12):
`⚠️ /database/lint endpoint retornou 404 — endpoint indisponível. Pulando lint.` → `exit 0`.
O workflow acumula 5/5 sucessos sem executar verificação. Contraria REGRA #5 (gate de qualidade
nunca deve ser efetivamente `continue-on-error`).
**Ação:**
1. Determinar por que a Management API devolve 404 — plano do projeto, escopo do token
   `SUPABASE_ACCESS_TOKEN`, ou endpoint depreciado. Testar com `curl` autenticado.
2. Se o endpoint existe: corrigir credencial/URL e manter fail-closed.
3. Se não existe mais: **substituir** a fonte por consulta `pg_catalog` (REGRA #8, corolário —
   auditoria de schema só via `pg_catalog`, nunca PostgREST), reaproveitando as queries de
   `docs/SCHEMA_REFERENCE.md` §8.
4. Enquanto indisponível, o gate deve **falhar**, não passar.
**Aceite:** o gate ou valida de verdade, ou falha alto. Nunca verde-sem-execução.
**Esforço:** M · **Risco:** médio (vai revelar findings hoje mascarados) · **Dep.:** E07, E08

### E10 · Auditar os 67 `reason` genéricos da allowlist 0029
**Problema (medido):** `.security/lint-0029-allowlist.json` tem 93 funções; **67** repetem
literalmente *"Baseline canônica 2026-08-29: grant EXECUTE preexistente confirmado via pg_catalog;
requer revisão funcional individual"*. O próprio texto admite que a revisão não foi feita.
Apenas 26 têm justificativa real.
**Ação:** revisar em lotes de ~10. Para cada função: o que faz, por que `SECURITY DEFINER`,
que RLS a cobre, quem pode chamar. Classificar em `manter` / `restringir` / `revogar`.
As duas últimas viram migrations forward-only — **`[REQUER-PO]`**.
**Aceite:** zero entradas com o texto genérico; `_last_reviewed` atualizado.
**Esforço:** GG · **Risco:** médio · **Dep.:** E09

### E11 · Ratchet do baseline de TypeScript: 145 → 0
**Problema (medido):** `.tsc-baseline.json` declara `totalErrors: 145`, mas a execução real diz
`TS baseline gate — atual: 0 erros · baseline: 145` e `✨ Drift positivo: 145 erro(s) eliminado(s)`.
A dívida já foi paga; o baseline só não foi apertado. Hoje ele **permite** 145 regressões silenciosas.
**Ação:** `node scripts/tsc-baseline-generate.mjs` e commitar com `totalErrors: 0`. Adicionar ao
gate um aviso que falha quando o drift positivo persiste por mais de N runs (baseline frouxo é bug).
**Aceite:** `.tsc-baseline.json` com 0; qualquer novo erro TS quebra o CI.
**Esforço:** P · **Risco:** baixo · **Dep.:** E24, E25

### E12 · Auditoria transversal de fail-open nos scripts de gate
**Problema:** E07–E09 mostram o padrão. `scripts/` tem dezenas de checkers; o mesmo
`try { ... } catch { /* segue em frente */ }` provavelmente se repete.
**Ação:** `grep -rn "catch\s*{\s*}\|catch\s*{[^}]*return\s\(new Set()\|\[\]\|{}\)" scripts/`.
Para cada ocorrência decidir: erro esperado (documentar) ou fail-open (corrigir).
Adicionar regra ESLint proibindo `catch` vazio em `scripts/`.
**Aceite:** inventário completo; zero fail-open não justificado; regra de lint ativa.
**Esforço:** G · **Risco:** médio · **Dep.:** E08

### E13 · Consolidar os 13 arquivos de baseline
**Problema (medido):** 13 baselines espalhados na raiz e em `.security/`, `.a11y/` —
`.tsc-baseline.json`, `.eslint-baseline.json`, `.any-type-baseline.json`, `.outline-none-baseline.json`,
`.toast-leaks-baseline.json`, `.invoke-direct-baseline.json`, `.migration-refs-baseline.json`,
`.audit-credentials-baseline.json`, `.security-definer-acl-baseline.json`, `.eslint-baseline-scope.json`,
`.tsc-ratchet-baseline`, `bundle-size-baseline.json`, `.a11y/clickable-baseline.json`.
Formatos inconsistentes; datas de `generatedAt` entre 2026-06-05 e 2026-09-10; um deles é base64.
**Ação:** mover tudo para `quality-baselines/` com schema JSON comum
(`generatedAt`, `owner`, `expiresAt`, `entries[]`). Manter symlinks ou atualizar os scripts.
**Aceite:** diretório único; todo baseline valida contra o schema.
**Esforço:** G · **Risco:** médio (toca 13 scripts de CI) · **Dep.:** E07

### E14 · Meta-teste de integridade dos baselines
**Problema:** o base64 do E07 sobreviveu desde 2026-08-26 porque **nada testa os baselines**.
**Ação:** teste em `tests/` que, para cada arquivo em `quality-baselines/`:
(a) parseia; (b) valida contra o schema; (c) falha se `generatedAt` > 90 dias sem revisão.
**Aceite:** teste no fast lane do CI; falha proposital validada em PR de teste.
**Esforço:** M · **Risco:** baixo · **Dep.:** E13

---

## FASE 2 — Testes e cobertura
> Objetivo: a suíte precisa rodar localmente e medir o que diz medir.

### E15 · Restabelecer execução local da suíte
**Problema (medido):** `npx vitest run --reporter=basic` falha —
`Failed to load url basic`. O reporter `basic` foi removido no Vitest 3+; o projeto está no 4.1.11.
Há referência obsoleta em script/doc, e a suíte completa (713 arquivos) não termina em tempo hábil.
**Ação:** varrer `package.json` (241 scripts) e workflows por `--reporter=basic`; trocar por
`default`/`dot`. Medir o tempo real de `vitest run` e registrar.
**Aceite:** `npm test` roda do zero sem erro de configuração; tempo documentado.
**Esforço:** P · **Risco:** baixo · **Dep.:** —

### E16 · Medir e publicar a cobertura global real
**Problema:** só existe threshold do módulo de estoque (60%). Não há número global conhecido.
**Ação:** `vitest run --coverage` completo; publicar o relatório como artefato de CI;
gravar o número inicial como baseline informativo (**sem** gate ainda).
**Aceite:** cobertura global conhecida e versionada.
**Esforço:** M · **Risco:** baixo · **Dep.:** E15

### E17 · Thresholds por módulo, não global
**Problema:** um número global esconde módulos críticos mal cobertos — foi o que aconteceu
com estoque (E02). Kit Maker, quotes, magazine e carrinho carregam regra de negócio com dinheiro.
**Ação:** definir threshold por diretório em `vitest.config.ts`
(`thresholds.perFile` / globs por módulo). Começar cada módulo no valor atual **+2 pontos**,
subindo a cada sprint. Módulos financeiros (`quotes`, `kit-builder`, `stock`) miram 80%.
**Aceite:** thresholds por módulo ativos; nenhum começa abaixo do valor medido hoje.
**Esforço:** M · **Risco:** médio · **Dep.:** E16

### E18 · Cobrir as 112 edge functions
**Problema (medido):** `supabase/functions/` tem 112 diretórios. Nenhuma evidência de suíte
dedicada. São código executando em produção com acesso privilegiado.
**Ação:** inventariar quais têm teste; priorizar por criticidade (auth, pagamento, ingestão);
escrever testes de contrato (entrada/saída/erro) com Deno test ou harness de integração.
**Aceite:** inventário completo; top 20 funções críticas com teste de contrato.
**Esforço:** GG · **Risco:** baixo · **Dep.:** E15

### E19 · Caçar flakiness nos 713 arquivos de teste
**Problema:** REGRA #5 existe porque houve cadeia de correções de snapshot. Flaky test é o
gatilho desse anti-padrão.
**Ação:** rodar a suíte 3× com seeds diferentes; registrar os que variam; para cada flaky
decidir entre corrigir a fonte de não-determinismo (tempo, ordem, rede) ou quarentenar com issue.
**Aceite:** lista de flakies publicada; nenhum flaky sem issue vinculada.
**Esforço:** G · **Risco:** baixo · **Dep.:** E15

### E20 · Separar fast lane de slow lane
**Problema:** 713 arquivos de teste + 82 workflows em PR. Feedback lento empurra o time a
mergear sem esperar — foi assim que o CI vermelho do E01 sobreviveu a 3 runs.
**Ação:** marcar testes lentos (`@slow`, e2e, fuzz, stress); fast lane (unit + contratos) roda
em todo PR com meta de < 5 min; slow lane em `merge_group`/nightly.
**Aceite:** fast lane < 5 min medido; required checks apontam para o fast lane.
**Esforço:** G · **Risco:** médio · **Dep.:** E19, E44

### E21 · Testes de contrato das RPCs do Kit Maker
**Problema:** os PRs #1854–#1860 são todos correções sucessivas do mesmo módulo
(integração → persistência atômica → catálogo → reconciliação de catálogo → conclusão).
Cinco PRs corretivos seguidos é sinal de contrato não fixado, não de má sorte.
**Ação:** teste de contrato que assere assinatura, retorno e comportamento transacional
(idempotência de retry, linhagem de variante/arte/tag) de cada RPC do Kit Maker contra
`pg_catalog` — não contra PostgREST (REGRA #8, corolário).
**Aceite:** mudança de assinatura de RPC quebra o teste antes de chegar em produção.
**Esforço:** G · **Risco:** baixo · **Dep.:** E15

---

## FASE 3 — Toolchain e dependências
> Objetivo: sair da versão-congelada. O TS 5.4.5 já impede validar a config raiz.

### E22 · Resolver os 2 CVEs `high`
**Problema (medido):** `npm audit` → 2 high: `image-size` e `pptxgenjs`. Zero critical.
**Ação:** `npm audit fix`; se exigir major, avaliar impacto (`pptxgenjs` é usado na exportação
de apresentações; `image-size` provavelmente é transitiva). Se não houver fix, registrar risco
aceito em `.audit-credentials-baseline.json` com prazo de revisão.
**Aceite:** `npm audit --audit-level=high` limpo, ou exceção com data de expiração.
**Esforço:** M · **Risco:** médio · **Dep.:** —

### E23 · Eliminar o lockfile duplo
**Problema (medido):** coexistem `bun.lock` e `package-lock.json`. Dois resolvers, duas árvores
possíveis. Há inclusive um commit histórico `fix(build): sincroniza lockfile do Bun` —
sintoma clássico de divergência.
**Ação:** decidir o gerenciador canônico (o `engines` declara `npm >=10.0.0`, o que aponta para npm).
Remover o outro lockfile, alinhar CI e Vercel, adicionar gate que falha se o segundo reaparecer.
**Aceite:** um único lockfile; gate anti-reintrodução ativo.
**Esforço:** M · **Risco:** alto (muda resolução de dependência) · **Dep.:** E22

### E24 · Consertar o `tsconfig.json` raiz
**Problema (medido):** `npx tsc --noEmit -p tsconfig.json` falha com
`TS1003/TS1005/TS1128` em `node_modules/@vitejs/plugin-react/dist/index.d.ts:62`.
Causa: o arquivo usa `export { ... as "module.exports" }` (string literal em export), sintaxe
suportada só a partir do TS 5.5 — e o projeto está no **5.4.5**. `skipLibCheck` não ajuda porque
é erro de **sintaxe**, não de tipo. O `tsconfig.json` raiz tem `include: ["vite.config.ts"]` apenas.
**Ação:** corrigir junto com E25 (a atualização de TS resolve a causa raiz). Verificar também que
`tsconfig.app.json` é parseável — a tentativa de leitura falhou por trailing comma/comentário.
**Aceite:** `tsc --noEmit` limpo em **todos** os tsconfigs do projeto.
**Esforço:** M · **Risco:** médio · **Dep.:** E25

### E25 · TypeScript 5.4.5 → 5.9.x
**Problema (medido):** declarado `5.4.5`; `npm outdated` aponta `7.0.2` como latest.
`@vitejs/plugin-react ^6.0.5` e `vite ^8.0.16` já emitem tipos que o 5.4 não parseia.
O projeto está num degrau incompatível com suas próprias dependências.
**Ação:** subir para 5.9 primeiro (não direto ao 7 — o salto 5→7 tem breaking changes de
resolução de módulo e de `lib`). Rodar `tsc` completo, corrigir o que aparecer com E11 desarmado
temporariamente, reapertar o baseline em seguida.
**Aceite:** TS 5.9; E24 verde; baseline TS reapertado em 0.
**Esforço:** G · **Risco:** alto · **Dep.:** E23

### E26 · Vitest 4 → 5 e `@vitest/coverage-v8` 4 → 5
**Problema (medido):** ambos um major atrás; o E15 já mostrou quebra de reporter por defasagem.
**Ação:** ler o guia de migração, atualizar os dois juntos (têm que casar de versão), rodar a
suíte completa e comparar contagem de testes antes/depois — queda de contagem é regressão silenciosa.
**Aceite:** mesma contagem de testes; cobertura estável ou melhor.
**Esforço:** G · **Risco:** alto · **Dep.:** E15, E19

### E27 · Tailwind 3.4.19 → 4.x
**Problema (medido):** major atrás. O Tailwind 4 muda o motor de config (CSS-first), o que é
migração real, não bump.
**Ação:** onda isolada, sem nada mais no PR. Rodar a suíte de testes visuais
(`Visual Baseline Tests` está 3/3 verde hoje — é a rede de proteção). Atualizar
`tailwind-merge` 2 → 3 no mesmo PR (são acoplados).
**Aceite:** baselines visuais sem diff inesperado; bundle CSS medido antes/depois.
**Esforço:** GG · **Risco:** alto · **Dep.:** E25

### E28 · Zod 3.25.76 → 4.x
**Problema (medido):** major atrás. Zod é validação de entrada — schema errado vira bug de dados.
**Ação:** migrar; auditar cada `.parse()`/`.safeParse()` em fronteira (edge functions, forms,
respostas de RPC). Atualizar `@hookform/resolvers` 3 → 5 junto (dependem um do outro).
**Aceite:** todos os schemas com teste de caso válido **e** inválido.
**Esforço:** G · **Risco:** alto · **Dep.:** E25

### E29 · Demais majors, em ondas temáticas
**Problema (medido):** 22 majors atrás no total. Além dos já cobertos:
`@sentry/react` 8→10, `eslint` 9→10 + `@eslint/js` + `eslint-plugin-react-hooks` 5→7 + `globals` 15→17,
`framer-motion` 11→13, `recharts` 2→3, `react-day-picker` 8→10, `date-fns` 3→4, `sonner` 1→2,
`zustand` 4→5, `jsdom` 29→30, `jest-axe` 10→11, `@testing-library/jest-dom` 6→7, `@types/node` 25→26.
Mais 39 atrasos de minor/patch.
**Ação:** 5 ondas, um PR cada, jamais misturadas:
(a) observabilidade — Sentry;
(b) lint — eslint + plugins + globals;
(c) UI — framer-motion, recharts, react-day-picker, sonner;
(d) estado/datas — zustand, date-fns;
(e) test tooling — jsdom, jest-axe, jest-dom, @types/node.
Minors/patches em onda única automatizada.
**Aceite:** `npm outdated` sem majors pendentes sem justificativa escrita.
**Esforço:** GG · **Risco:** médio · **Dep.:** E25, E26

---

## FASE 4 — Schema e migrations
> **Toda etapa desta fase que gere DDL é `[REQUER-PO]`.** REGRA #8 é explícita: ordem de
> alteração de schema em `doufsxqlfjyuvxuezpln` vem de pessoa, nunca de bot ou de documento.
> Este plano **descreve**; não autoriza.

### E30 · Inventário das 2.983 migrations
**Problema (medido):** 2.983 arquivos `.sql`. Distribuição:
jun/2026 = 1.674 · mai/2026 = 421 · jul/2026 = 255 · abr/2026 = 246 · mar/2026 = 165 · set/2026 = 53.
1.674 migrations em um único mês não é evolução de schema, é loop de correção.
**Ação:** classificar por tipo (DDL real, RLS, grant, seed, rollback, no-op) e por autoria
(humano vs. bot). Identificar pares aplica/reverte que se cancelam. Relatório em `docs/`.
**Aceite:** inventário publicado com a contagem de migrations efetivamente estruturais.
**Esforço:** G · **Risco:** nulo (somente leitura) · **Dep.:** —

### E31 · Normalizar os 67 nomes fora do padrão
**Problema (medido):** 67 migrations não seguem `^[0-9]{14}_`. Exemplos:
`001_notification_system.sql`, `20260602_001_add_fk_indexes_critical.sql`,
`20260621_fix_console_bugs_404_403.sql`. Há também 16 arquivos cujo nome começa com `produc`.
Ordenação lexicográfica ≠ ordenação cronológica → risco de aplicação fora de ordem.
**Ação:** **não renomear migrations já aplicadas** (quebra o histórico do CLI). Em vez disso:
documentar o mapeamento, e travar o padrão só para arquivos novos via
`scripts/check-migration-filename-contract.test.mjs` (já existe — verificar se cobre os 67 como
exceção explícita em vez de silenciosamente).
**Aceite:** gate rejeita nome novo fora do padrão; os 67 legados em allowlist datada.
**Esforço:** M · **Risco:** baixo · **Dep.:** E30

### E32 · `[REQUER-PO]` Baseline/squash das migrations históricas
**Problema:** 2.983 arquivos tornam qualquer `supabase db reset` impraticável e o onboarding lento.
**Ação (proposta, não execução):** apresentar ao PO a opção de gerar um baseline consolidado
(snapshot do schema atual como migration inicial) e arquivar as anteriores em `supabase/migrations/_archive/`.
Requer janela, backup verificado e plano de rollback. **Nada disso roda sem aprovação escrita.**
**Aceite:** decisão do PO registrada — executar ou arquivar a proposta.
**Esforço:** GG · **Risco:** alto · **Dep.:** E30, E31

### E33 · Reduzir o `types.ts` de 64.637 linhas
**Problema (medido):** `src/integrations/supabase/types.ts` tem 64.637 linhas — 11,5% de todo o
`src/`. Isso pesa em cada `tsc`, em cada IDE, em cada CI. REGRA #4 já registra dois incidentes de
regeneração destrutiva (`158c142` dropou `personalization_techniques`; `7716ae9` dropou `magazine_*`).
**Ação:** avaliar geração por schema/domínio em vez de arquivo único; ou restringir a geração às
tabelas realmente consumidas pelo front. **Antes e depois**, executar o protocolo da REGRA #4:
contar `export type`, e conferir a presença de `personalization_techniques`, `products`,
`product_variants`, `suppliers`, `supplier_products_raw`, `magazines`, `magazine_items`,
`magazine_templates`.
**Aceite:** tempo de `tsc` medido antes/depois; nenhuma tabela perdida; contagem de exports ≥ atual.
**Esforço:** G · **Risco:** alto · **Dep.:** E25

### E34 · Reconciliar `.migration-refs-baseline.json`
**Problema (medido):** 34 referências a paths de migration que não existem mais, congeladas
desde 2026-07-01. São ponteiros quebrados em docs e scripts.
**Ação:** para cada entrada: o arquivo foi renomeado (corrigir a referência) ou removido
(remover a referência). Esvaziar o baseline.
**Aceite:** baseline com 0 entradas; gate continua bloqueando novas quebras.
**Esforço:** M · **Risco:** baixo · **Dep.:** E30

### E35 · Runbook de auditoria via `pg_catalog`
**Problema:** REGRA #8 determina auditoria só por `pg_catalog`, com queries em
`docs/SCHEMA_REFERENCE.md` §8 — mas E09 mostrou um gate dependendo de API externa que responde 404.
**Ação:** transformar as queries canônicas do §8 em script versionado e executável
(`scripts/audit-schema-pgcatalog.mjs`), com saída comparável entre execuções (diff de schema).
**Aceite:** auditoria reproduzível por comando único; saída commitável para comparação temporal.
**Esforço:** G · **Risco:** baixo · **Dep.:** E09

---

## FASE 5 — Ruído operacional
> Objetivo: o tracker precisa voltar a ser sinal. Hoje é 96% ruído de bot.

### E36 · Triagem em massa das 290 issues `autoheal`
**Problema (medido):** 302 issues abertas; **290** com label `autoheal` + `Lovable` + `bug`.
Títulos normalizados mostram repetição pura: `🚨 Autoheal: fix ESLint quebrou TSC — N` aparece
11×, variações do mesmo texto dezenas de vezes. Criadas entre 2026-06-18 e 2026-09-07, com picos
de 36 em um único dia (2026-06-24). Sobram **12 issues reais** — 4 `tech-debt`, 2 `security`,
1 `deploy-failure`, 1 `ci-red`, 1 `gitleaks`, entre outras.
**Ação:** confirmar por amostragem (~20) que descrevem falhas já resolvidas; fechar em lote via
`gh issue close` com comentário padrão apontando para esta etapa; preservar as que ainda reproduzem.
**Aceite:** issues abertas < 30; nenhuma fechada sem verificação por amostragem.
**Esforço:** M · **Risco:** baixo · **Dep.:** —

### E37 · Desarmar/reconfigurar `lovable-autoheal.yml`
**Problema (medido):** `.github/workflows/lovable-autoheal.yml` é a fonte das 290 issues.
Um bot que abre 36 issues em um dia sobre o mesmo sintoma não está ajudando — está enterrando sinal.
**Ação:** trocar "abrir issue por ocorrência" por **uma issue viva por assinatura de erro**,
atualizada com contador e último run. Deduplicar por hash do erro. Se a taxa não cair, desligar
e substituir por alerta em canal.
**Aceite:** ≤ 5 issues novas de autoheal por semana; zero duplicatas com a mesma assinatura.
**Esforço:** M · **Risco:** baixo · **Dep.:** E36

### E38 · Priorizar as 12 issues reais
**Problema (medido):** as issues legítimas estão soterradas; só 3 têm label de prioridade
(`priority:p1`, `priority:p2`, `priority-high`).
**Ação:** após E36, aplicar `priority:p0..p3` a todas as sobreviventes; as 2 de `security` e a de
`gitleaks` entram como P0 e são investigadas antes de qualquer feature.
**Aceite:** 100% das issues abertas com prioridade; P0 com responsável e prazo.
**Esforço:** P · **Risco:** baixo · **Dep.:** E36

### E39 · Rate-limit para criação automática de issues
**Problema:** nada impede o próximo bot de repetir o padrão.
**Ação:** action reutilizável que impõe teto (ex.: 5/dia por workflow) e deduplica por assinatura
antes de abrir. Todo workflow que cria issue passa a usá-la.
**Aceite:** teto ativo; tentativa de estouro vira log, não issue.
**Esforço:** M · **Risco:** baixo · **Dep.:** E37

### E40 · Painel de saúde do repositório
**Problema:** o CI vermelho de E01/E02 passou 3 runs sem correção porque ninguém tinha visão agregada.
**Ação:** job diário que publica: status dos required checks, cobertura por módulo, issues por
prioridade, majors pendentes, idade dos baselines, frescor do grafo graphify.
**Aceite:** painel publicado e atualizado diariamente.
**Esforço:** G · **Risco:** baixo · **Dep.:** E16, E36

---

## FASE 6 — CI: custo e sprawl
> Objetivo: 111 workflows e 82 disparos por PR não é rigor, é imposto.

### E41 · Inventário dos 111 workflows
**Problema (medido):** 111 arquivos, 14.584 linhas de YAML, **82 disparam em `pull_request`**.
Os maiores: `freight-quality-gates.yml` (529), `ci-quotes-wizard.yml` (526), `e2e.yml` (452),
`cart-invariants-smoke.yml` (379), `magazine-typed-queries.yml` (369).
**Ação:** planilhar cada workflow: gatilho, tempo médio, taxa de falha, se é required, o que
verifica de único. Marcar sobreposições.
**Aceite:** inventário publicado; cada workflow com dono e justificativa.
**Esforço:** G · **Risco:** nulo · **Dep.:** —

### E42 · Consolidar workflows redundantes
**Problema:** múltiplos workflows repetem checkout + install + build antes do check específico.
O log do E01 mostra o `quality-gate` rodando build completo só para chegar no gate 0029.
**Ação:** extrair a preparação para workflow reutilizável (`workflow_call`) com cache de
`node_modules` e de artefato de build. Jobs específicos consomem o artefato.
**Aceite:** redução medida de minutos de runner; nenhum check perdido.
**Esforço:** GG · **Risco:** médio · **Dep.:** E41

### E43 · Path filters nos workflows de PR
**Problema:** um PR que muda só documentação dispara boa parte dos 82 workflows.
**Ação:** `paths` / `paths-ignore` por workflow (magazine só em `src/**/magazine/**` e suas
migrations; freight só no módulo de frete; etc.). Cuidado com required checks — um check required
que é pulado bloqueia o merge; usar `paths` + job de status neutro.
**Aceite:** PR só-docs dispara ≤ 5 workflows e mergeia normalmente.
**Esforço:** G · **Risco:** alto (pode travar merge) · **Dep.:** E41, E44

### E44 · Definir o conjunto mínimo de required checks
**Problema:** REGRA #5 exige que gates 0–6 nunca sejam `continue-on-error`, mas não há lista
explícita do que é obrigatório. Existem `sentinel-check.sh` e `deploy-gates.yml` como proteção —
falta o contrato escrito.
**Ação:** documentar em `docs/` os checks required (Gate 0 SSOT, typecheck, fast lane de testes,
lint 0029, security scan) e alinhar o Branch Protection do GitHub. Todo o resto é informativo.
**Aceite:** branch protection == documento; divergência detectada por `sentinel-check.sh`.
**Esforço:** M · **Risco:** médio · **Dep.:** E41

### E45 · Reduzir os 241 scripts npm
**Problema (medido):** `package.json` declara **241** scripts. Ninguém memoriza 241 comandos;
scripts mortos escondem os vivos. Já existe `check-package-duplicate-scripts.mjs` — sinal de que
a duplicação é problema conhecido.
**Ação:** mapear quais são referenciados por workflow/doc/humano. Agrupar por prefixo coerente
(`test:`, `check:`, `db:`, `build:`). Remover os órfãos.
**Aceite:** ≤ 80 scripts; cada um referenciado em algum lugar; README com os 10 principais.
**Esforço:** G · **Risco:** médio · **Dep.:** E41

---

## FASE 7 — Arquitetura e manutenibilidade

### E46 · Quebrar os arquivos gigantes
**Problema (medido):** ignorando `types.ts` (E33), os maiores de produção são
`QuoteBuilderSummaryColumn.tsx` (1.710), `PromoFlixPlayer.tsx` (1.512),
`useQuoteBuilderState.ts` (1.345), `useSellerCarts.ts` (1.306), `VisualSearchPage.tsx` (1.273),
`SellerCartsPage.tsx` (1.193), `ProductCard.tsx` (1.128), `theme-presets.ts` (1.106),
`SupplierFormDialog.tsx` (1.097), `useCatalogState.ts` (1.072).
Arquivos assim concentram conflito de merge — e o Lovable commita direto em `main` (REGRA #7).
**Ação:** refatorar os 5 maiores de produção extraindo hooks e subcomponentes, **um PR por arquivo**,
com teste antes da extração para garantir comportamento. Não tocar em `theme-presets.ts` se for
tabela de dados (tamanho ali é legítimo).
**Aceite:** nenhum componente de produção > 600 linhas; comportamento coberto por teste prévio.
**Esforço:** GG · **Risco:** médio · **Dep.:** E17

### E47 · Resolver o `INEFFECTIVE_DYNAMIC_IMPORT`
**Problema (medido):** aviso no build do run `34724812962`:
`src/services/telemetryService.ts is dynamically imported by src/hooks/ui/useErrorHandler.ts but
also statically imported by EnhancedErrorBoundary.tsx, ProductCard.tsx,
lib/intelligence/degradationSink.ts, utils/performance.ts` → o dynamic import não separa chunk.
Telemetria entra no bundle inicial sem necessidade.
**Ação:** escolher um modo. Ou tudo estático (e remover o dynamic import enganoso), ou tudo
dinâmico atrás de uma fachada única. Dado que telemetria não é crítica para o primeiro render,
a fachada dinâmica é a escolha certa.
**Aceite:** aviso some do build; chunk inicial medido menor.
**Esforço:** M · **Risco:** baixo · **Dep.:** —

### E48 · Orçamento de bundle por rota
**Problema (medido):** `bundle-size-baseline.json` tem `limits: 4` e `criticalChunks: 8` —
cobertura estreita para uma app com dezenas de rotas.
**Ação:** estender o gate para orçamento por rota/chunk crítico; falhar em crescimento > 5%
sem justificativa no PR.
**Aceite:** orçamento por rota ativo; regressão de tamanho bloqueia merge.
**Esforço:** M · **Risco:** baixo · **Dep.:** E47

### E49 · Zerar as baselines de acessibilidade
**Problema (medido):** `.a11y/clickable-baseline.json` lista 18 arquivos com `role="button"`
inline (deveriam usar `<Clickable>`); `.outline-none-baseline.json` tem 20 entradas de
`outline-none` (remove indicador de foco — barreira real de teclado).
Congeladas desde 2026-07-14/15.
**Ação:** refatorar em lotes de 5 arquivos. `outline-none` primeiro — é o que efetivamente
impede navegação por teclado. `jest-axe` já está no projeto para validar.
**Aceite:** ambas as baselines em 0; gates seguem ativos contra regressão.
**Esforço:** G · **Risco:** baixo · **Dep.:** —

### E50 · Fortalecer e documentar a guarda do SSOT
**Problema:** REGRA #1 registra incidente 401 em produção (2026-06-11, 6+ reversões em 10 min)
causado pelo bot revertendo `client.ts`. A guarda existe (`validate-supabase-config.mjs`,
Gate 0, `.lovableignore`, CODEOWNERS) e hoje está íntegra — verificado nesta análise em
`client.ts`, `config.toml`, `.temp/project-ref` e `.env.local`, todos em `doufsxqlfjyuvxuezpln`.
**Ação:** adicionar teste que executa `validate-supabase-config.mjs` e falha se a função
`validateEnv` ou a constante `CURRENT_PROJECT_ID` sumirem — proteção contra remoção acidental
durante merge (o cenário que a REGRA #1 descreve como o pior caso: "se Claude remover a guarda
durante merge, o Gate 0 também falha"). Documentar a cadeia completa de proteção em um só lugar.
**Aceite:** teste ativo no fast lane; documento único descrevendo as 4 camadas de proteção do SSOT.
**Esforço:** M · **Risco:** baixo · **Dep.:** E44

---

## Ordem de execução recomendada

```
Sprint 1 (desbloqueio)      E01 E02 E03 E04 E05 E06 E07 E08 E15
Sprint 2 (gates honestos)   E09 E12 E13 E14 E36 E37 E38 E39
Sprint 3 (toolchain)        E22 E23 E24 E25 E11 E16 E17
Sprint 4 (deps + CI)        E26 E29 E41 E42 E44 E45 E47 E48
Sprint 5 (schema + dívida)  E30 E31 E34 E35 E10 E19 E20 E21
Sprint 6 (estrutural)       E27 E28 E33 E18 E43 E46 E49 E50 E40
Backlog [REQUER-PO]         E32
```

**Caminho crítico:** `E07 → E08 → E09 → E10` (integridade dos gates de segurança) e
`E23 → E25 → E24/E11/E26/E27/E28` (toolchain). Nada da Fase 3 avança antes do E23 — dois
lockfiles tornam qualquer bump de dependência não-reproduzível.

## Métricas de saída

| Métrica | Hoje | Meta |
|---|---|---|
| Workflows falhando | 2 (CI/CD Pipeline, stock-module-quality) | 0 |
| Gates verdes sem executar | ≥ 1 confirmado (Supabase Linter) | 0 |
| Issues abertas | 302 (290 ruído) | < 30, 100% priorizadas |
| Cobertura do módulo de estoque | 57,17% | ≥ 60%, meta 80% |
| `reason` genérico na allowlist 0029 | 67 de 93 | 0 |
| Baseline TS | 145 erros tolerados | 0 |
| Majors atrasados | 22 | 0 sem justificativa |
| CVEs `high` | 2 | 0 |
| Lockfiles | 2 | 1 |
| Workflows por PR | 82 | ≤ 20 (com path filters) |
| Scripts npm | 241 | ≤ 80 |
| Baselines de a11y | 38 entradas | 0 |

## Limites deste plano

- **Não autoriza execução.** Etapas `[REQUER-PO]` (E01 parcial, E10, E32, e qualquer DDL
  derivado de E31/E33/E34) exigem aprovação humana explícita antes de tocar
  `doufsxqlfjyuvxuezpln`. REGRA #8.
- **Cobertura global não medida.** A suíte completa não terminou nesta análise (E15 corrige a
  execução, E16 produz o número). Os percentuais citados são os do módulo de estoque, vindos do
  log de CI.
- **E18 assume ausência de testes nas edge functions** a partir da ausência de suíte dedicada
  visível; o inventário da própria etapa confirma ou desmente.
