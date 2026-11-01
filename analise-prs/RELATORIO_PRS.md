# Relatório de Análise de PRs

**Gerado em:** 2026-11-01
**SHA main:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`
**Total PRs abertas:** 4 | **Total analisadas:** 4

---

## ⚠️ DECISÕES HUMANAS NECESSÁRIAS

### PR #2927 — fix(listas): normaliza filtros padrão após navegação POP

**Bloqueio:** Diff real vs main inclui mudanças em `.github/workflows/` (8 arquivos) e 30 migrations SQL.

**Por que importa:** As mudanças de workflow podem alterar gates de CI. As migrations incluem múltiplas operações de CRON, REVOKE, e DDL que precisam de validação do PO antes de irem a produção.

**Ação recomendada:** O PO deve revisar os diffs de `.github/workflows/` e as migrations antes de decidir mergear. Se decidir mergear, PRs #2927 e #2941 conflitarão — escolher UMA.

**Nota sobreposição:** PR#2927 e PR#2941 contêm a mesma feature base (useListUrlState POP fix). PR#2941 é ligeiramente mais completa (inclui remoção de `mcp_kv_get` da allowlist). Se uma for mergeada, a outra fica stale.

---

### PR #2941 — fix(security): atualiza allowlist lint-0029

**Bloqueio:** Diff real vs main inclui mudanças em `.github/workflows/` (4 arquivos) e 28 migrations SQL.

**Por que importa:** Mesmo raciocínio de PR#2927. Adicionalmente, o título não reflete o escopo real — há mudanças de código em `useListUrlState.ts`, scripts, e testes unitários.

**Verificação pendente:** As funções `is_supervisor_or_above` e `log_rls_denial` foram removidas da allowlist, mas o diff não inclui migration de REVOKE correspondente. Antes do merge, confirmar no banco se essas funções ainda existem com SECURITY DEFINER.

**Ação recomendada:** Verificar no banco (`SELECT proname FROM pg_proc WHERE proname IN ('is_supervisor_or_above', 'log_rls_denial') AND prosecdef = true`). Depois revisar diffs de workflow e migrations.

---

## 🚫 NÃO MERGEADAS (DRAFT)

### PR #2940 — feat(nav): adiciona entrada Audit Suite na sidebar admin

- **Motivo:** Marcada como DRAFT pelo autor.
- **Problemas adicionais:** Typo introduzido ("Se ogropo" → "Se o grupo"), classe CSS com `!` inesperado (`transition-all duration-500!`).
- **Quando mergear:** Após o autor marcar como ready e corrigir typo + classe CSS.

---

### PR #2942 — docs(ci): RELATORIO_CI.md v4

- **Motivo:** Marcada como DRAFT pelo autor.
- **Problemas adicionais:** Baseline documentado está desatualizado (2026-10-28 vs main atual 2026-11-01). §8 intitulado "Todos os Workflows" mas cobre apenas 12 de 119 workflows.
- **Quando mergear:** Após atualizar o baseline para o SHA do main atual.

---

## 📊 Contagem por veredito

| Veredito | Quantidade | PRs |
|---|---|---|
| MERGEAR | 0 | — |
| DECISÃO HUMANA | 2 | #2927, #2941 |
| NÃO MERGEAR (DRAFT) | 2 | #2940, #2942 |
| MERGEAR APÓS AJUSTES | 0 | — |
| FECHAR | 0 | — |
| **TOTAL** | **4** | **4** |

---

## 📁 Clusters

### Cluster A — URL State Normalization (sobreposição)
- PR #2927 e PR #2941 contêm a mesma feature base (useListUrlState POP fix).
- Origem comum: branch `fix/e2e-url-state-defaults-20261030` (PR#2941) é mais antiga; PR#2927 derivou dela.
- PR#2941 é preferível se o PO decidir mergear uma (inclui remoção correta de `mcp_kv_get`).
- **Conflito garantido** se as duas forem mergeadas sem rebase entre si.

### Cluster B — Documentação isolada
- PR #2942 (docs only, draft). Sem impacto no código.

### Cluster C — Nav admin isolada
- PR #2940 (1 arquivo, draft). Sem conflito com outros clusters.

---

## 🔍 Baseline main

**SHA:** `58b4eeaf24f9c70d99e28c192e464ffa10c37274`
- `tsc --noEmit`: ✅ exit 0 (evidência: sem output de erros)
- `npm install`: ✅ concluído
- `vitest run`: ⏳ aguardando resultado em background

---

## NÃO VERIFICADO

- CI status das PRs #2927 e #2941 via API (check runs não foram lidos para economizar tokens; o estado "mergeable_state" retornou null na API de listagem).
- Resultado completo do `vitest run` no main (processo em background).
- Verificação ao vivo no banco Supabase de `is_supervisor_or_above` e `log_rls_denial` (SELECT pg_proc — projeto doufsxqlfjyuvxuezpln não mapeado nos MCPs Supabase disponíveis nesta sessão).

---

## Arquivos entregues

| Arquivo | Conteúdo |
|---|---|
| `analise-prs/prs.json` | Inventário JSON de todas as PRs |
| `analise-prs/prs.csv` | Inventário CSV |
| `analise-prs/RELATORIO_PRS.md` | Este relatório |
| `analise-prs/regras-de-negocio.md` | Regras de negócio extraídas |
| `analise-prs/progresso.json` | Estado da análise |
| `analise-prs/baseline/README.md` | Baseline do main |
| `analise-prs/dossies/PR-2927.md` | Dossie detalhado |
| `analise-prs/dossies/PR-2940.md` | Dossie detalhado |
| `analise-prs/dossies/PR-2941.md` | Dossie detalhado |
| `analise-prs/dossies/PR-2942.md` | Dossie detalhado |
