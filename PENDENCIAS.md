# PENDÊNCIAS — Ações que requerem o PO (2026-10-22)

Gerado por: Claude Code (sessão `session_012WyySbh2tj8vhRQLBf3mHo`)

---

## 🔴 URGENTE — Gate E40 vermelho em `main` (ledger parity)

**Causa:** 6 migrations novas em `supabase/migrations/` (PR #2352 mergeado às 22:36 UTC)
não foram aplicadas em produção. O check de ledger falha até serem aplicadas.

**O que você precisa fazer:**

### Passo 1 — Aplicar 5 migrations seguras (via workflow obrigatório)

Execute um por vez, na ordem, usando `gh workflow run`:

```sh
# 1. Revoke EXECUTE anon em fn_cron_guard (CRÍTICO — segurança)
gh workflow run db-apply-migration.yml \
  -f version=20261022100001 \
  --repo adm01-debug/Promo_Gifts_V4

# 2. RLS wrapper auth.uid() performance (seguro — só ALTER POLICY)
gh workflow run db-apply-migration.yml \
  -f version=20261022100010 \
  --repo adm01-debug/Promo_Gifts_V4

# 3. Cron reschedule: dispatcher_failure_alert (seguro)
gh workflow run db-apply-migration.yml \
  -f version=20261022100020 \
  --repo adm01-debug/Promo_Gifts_V4

# 4. Cron reschedule: hash_product_images (seguro)
gh workflow run db-apply-migration.yml \
  -f version=20261022100021 \
  --repo adm01-debug/Promo_Gifts_V4

# 5. Cron reschedule: sync_is_stockout_universal (seguro)
gh workflow run db-apply-migration.yml \
  -f version=20261022100022 \
  --repo adm01-debug/Promo_Gifts_V4
```

### ⚠️ NÃO aplicar ainda — requer análise

```
20261022100011_perf_drop_unused_indexes.sql
```

- Contém 13 `DROP INDEX` — irreversível sem recriação
- Antes de aplicar: rodar `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0`
  em produção para confirmar que os índices estão realmente sem uso
- Risco de regressão de performance em queries não cobertas pelos testes

---

## 🟡 PRs que precisam de ação humana

### Fechar (stack errada — não têm relação com este projeto)
PRs #2322, #2323, #2324, #2325, #2326, #2327, #2328, #2329, #2330, #2331, #2333, #2334, #2335, #2336, #2337

São 15 PRs gerados provavelmente por template errado. Sugestão: fechar com
mensagem "Fechado — stack incompatível com promo-gifts-v4".

### Aguardar rebase pelo autor
PRs #2312, #2314, #2315, #2316, #2349 — mergeable: false (conflito git).
Só o autor pode fazer o rebase.

### Decisão estratégica necessária
- **PR #2290** — bump de dependência que pode ser breaking: precisa decisão sobre aceitar ou não
- **PR #2293** — idem
- **PR #2319** — PR vazio/bot: fechar

---

## ✅ Já feito por esta sessão

| Ação | Evidência |
|---|---|
| PR #2338 mergeado (fix lint) | SHA `3e006427` |
| PR #2351 mergeado (session guard ProductPersonalizationRules) | SHA `47bdc002` |
| PR #2354 mergeado (recibo E15 migration) | SHA `3e006427` |
| Branch `claude/session-guard-remaining-callers` criado com fix dos 5 callers restantes + fix Gate 1.3 | commit `d95be311` |
| Relatório de validação exaustiva gerado | `analise-prs/RELATORIO_VALIDACAO_EXAUSTIVA.md` |

---

## Como verificar que o Gate E40 voltou ao verde

Após aplicar as migrations acima, dispare manualmente o workflow de CI:

```sh
gh workflow run deploy-gates.yml --repo adm01-debug/Promo_Gifts_V4 --ref main
```

Aguarde ~10 min e confirme que todos os gates passam.
