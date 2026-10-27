# PENDENCIAS.md — Ações que requerem intervenção humana

**Última atualização:** 2026-10-27  
**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  

---

## 1. URGENTE — Migrations de PR #2352 não aplicadas em produção

PR #2352 foi mergeada pelo owner `adm01-debug` em 2026-10-22T22:36Z. Apenas a migration `20261022100001` foi aplicada. As seguintes **ainda não estão em produção** (`doufsxqlfjyuvxuezpln`):

| Migration | Descrição | Status |
|-----------|-----------|--------|
| `20261022100010` | RLS wrapper — `fn_get_org_from_session` | ❌ PENDENTE |
| `20261022100020` | Cron job 1 | ❌ PENDENTE |
| `20261022100021` | Cron job 2 | ❌ PENDENTE |
| `20261022100022` | Cron job 3 | ❌ PENDENTE |
| `20261022100011` | DROP INDEX | ⛔ NÃO APLICAR — ver nota abaixo |

**Como aplicar (caminho único autorizado — REGRA #8 / CLAUDE.md):**
1. Acesse o repositório no GitHub
2. Vá em **Actions → db-apply-migration.yml → Run workflow**
3. Execute uma migration por vez, na ordem: `20261022100010`, `20261022100020`, `20261022100021`, `20261022100022`

**⚠️ NÃO aplicar `20261022100011` (DROP INDEX)** sem antes:
1. Executar `SELECT pg_stat_reset()` em `doufsxqlfjyuvxuezpln`
2. Aguardar 24 horas de uso real
3. Confirmar que o índice não aparece em `pg_stat_user_indexes` com `idx_scan > 0`
Isso evita degradação de performance por remoção de índice em uso.

---

## 2. Fechar 16 PRs de template/bot (não mergeáveis)

Estas PRs devem ser **fechadas sem merge** — são templates de CI/workflows incompatíveis com a stack do projeto ou duplicatas:

| PR | Motivo |
|----|--------|
| [#2319](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2319) | Jules bot — PR vazia (0 arquivos) |
| [#2322](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2322) | Webpack CI — runtime incompatível com Vite |
| [#2323](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2323) | Deno CI — runtime incompatível com npm/Vite |
| [#2324](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2324) | Jekyll Docker — stack errada (não é site Jekyll) |
| [#2325](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2325) | npm publish — projeto não é pacote npm publicável |
| [#2326](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2326) | npm publish GitHub Packages — idem |
| [#2327](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2327) | Codacy SAST — serviço não configurado no projeto |
| [#2328](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2328) | Dependency Review — duplicata do Gate 0.6 existente |
| [#2329](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2329) | Python publish PyPI — projeto não é Python |
| [#2330](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2330) | Node.js CI matrix — npm test não existe no projeto |
| [#2331](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2331) | Manual greeting workflow — decorativo, sem valor |
| [#2333](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2333) | First-interaction bot — risco supply chain |
| [#2334](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2334) | GitHub Pages static — projeto usa Vercel |
| [#2335](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2335) | Next.js GitHub Pages — framework errado (Vite não Next.js) |
| [#2336](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2336) | Arquivo em branco (1 byte) — workflow inválido |
| [#2337](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2337) | Deno CI — duplicata byte-a-byte do PR #2323 |

**Como fechar:** Abra cada PR e clique em "Close pull request" (sem merge).

---

## 3. Decisão de negócio (PO) — Bumps de dependência major

Estas PRs requerem decisão do Product Owner antes de mergear:

| PR | Dependência | Impacto |
|----|-------------|---------|
| [#2290](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2290) | `@eslint/js` 9→10 (major) | Pode quebrar regras de lint existentes; requer teste de regressão de lint |
| [#2293](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2293) | `recharts` 2→3 (major) | API de componentes mudou; requer revisão dos gráficos no app |

**Recomendação técnica:** Testar em branch isolada antes de mergear. Se aprovado pelo PO, o CI deve passar e o merge pode ser feito normalmente.

---

## 4. PRs com base desatualizada (requerem ação dos autores)

Estas PRs têm Gate Final com falha por base stale — os autores precisam fazer rebase:

| PR | Última base | Situação |
|----|-------------|----------|
| [#2312](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2312) | `1ac6992c` | Gate Final failure — rebase em main necessário |
| [#2314](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2314) | `1ac6992c` | Gate Final failure — rebase em main necessário |
| [#2315](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2315) | `1ac6992c` | Gate Final failure — conflito semântico com #2314 |
| [#2316](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2316) | `45545ae5` | Gate Final failure — conflito semântico com #2338 |
| [#2349](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2349) | `8bafc7d5` | 0 check runs após rebase recente — aguardar CI |

**Ação:** Notificar os autores para fazer rebase de suas branches em `main`.

---

## 5. PR em draft

| PR | Situação |
|----|----------|
| [#2320](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2320) | Draft — aguardar o autor promover para ready |

---

## Resumo de o que Claude já fez

| Item | Status |
|------|--------|
| 25 PRs originais analisadas | ✅ CONCLUÍDO |
| 4 PRs mergeadas por Claude (#2338, #2351, #2354, #2356) | ✅ CONCLUÍDO |
| 2 PRs mergeadas pelo owner (#2352, #2360) | ✅ DOCUMENTADO |
| PR #2357 fechada pelo owner | ✅ DOCUMENTADO |
| Migrations de #2360 aplicadas em produção | ✅ CONFIRMADO VIA SUPABASE MCP |
| Migration `20261022100001` de #2352 aplicada | ✅ CONFIRMADO VIA SUPABASE MCP |
| Gate Final em todos os merges de Claude: success | ✅ VERIFICADO |
| Gate E40 pré-existente documentado com evidências de arquivo | ✅ CONCLUÍDO |
| Worktrees extras removidos | ✅ NENHUM EXTRA (só o primário) |
