# PENDÊNCIAS — Análise de PRs (2026-10-22)

## BLOQUEIO: PR #2338 não mergeia — author empurra commits continuamente

**O que trava:** O único merge autorizado (PR #2338) está com `mergeable_state: blocked` porque a proteção de branch exige Gate Final = success. O Gate Final nunca completa porque `adm01-debug` empurra novos commits ao branch `claude/laughing-cori-o9w35e` a cada ~4 minutos (153 commits registrados), e cada push dispara `concurrency: cancel-in-progress: true`, cancelando o CI anterior.

**Por que trava aqui:** A sessão não pode comentar na PR para pedir pausa, não pode alterar configurações do repositório, e não pode bypas­sar a proteção de branch. A única escrita autorizada é o merge em si.

**O que você precisa fazer:**
1. Abrir https://github.com/adm01-debug/Promo_Gifts_V4/pull/2338
2. Verificar se o Gate Final está verde (check verde no topo da página)
3. Se verde → a sessão (subscrita aos eventos do PR) mergeia automaticamente
4. Se você quiser acelerar: peça ao autor do PR que pare de empurrar commits por ~20 minutos para o CI completar

**PR aprovada para merge:**
- Base correta: `8e8053b9` (= main atual)
- Label: `large-pr-approved`
- Conteúdo: corrige 5 failures reais de CI (stale.yml, python-package-conda.yml removido, allowlists lint-0011/0029, Gate 1.12, prod-health.yml)
- Zero regressão detectada (análise completa em `analise-prs/dossies/PR-2338.md`)

## PRs que exigem decisão sua (PO)

### PR #2290 — Bump @eslint/js de 9.39.5 para 10.0.1 (Dependabot)
- **Risco:** Major bump. Requer Node ≥ 20.19. Formato `.eslintrc` será removido.
- **Ação:** Verifique se todos os plugins ESLint são compatíveis com v10 antes de mergear.

### PR #2293 — Bump recharts de 2.10.3 para 3.10.1 (Dependabot)
- **Risco:** Major bump. Breaking API changes. Remove `recharts-scale`.
- **Ação:** Audite quais componentes usam recharts antes de mergear.

## PRs que exigem ação dos autores

### PRs aguardando rebase em main
- **PR #2312** — ci(deploy-gates): skip docs-only PRs. Autor deve fazer rebase.
- **PR #2314** — ci(ratchet): atualiza baseline. Conflito com #2315 — consolidar.
- **PR #2315** — ci(e2e): remove credenciais reais (PRIORIDADE SEGURANÇA). Autor deve fazer rebase urgente.
- **PR #2316** — fix(ci): Gate 1.12. Pode ser descartada se #2338 for mergeada (inclui a mesma correção).

## PRs para fechar (requer ação humana — não posso fechar por constraint)

15 PRs são templates genéricos do GitHub Actions sem valor para este repositório React/TypeScript/Vite/Supabase:

**#2322, #2323, #2324, #2325, #2326, #2327, #2328, #2329, #2330, #2331, #2333, #2334, #2335, #2336, #2337**

Todas violam R1–R15 (sem permissions, ubuntu-latest, actions sem SHA). Feche manualmente.

**#2319** — PR vazia (0 arquivos, bot Jules). Feche.
