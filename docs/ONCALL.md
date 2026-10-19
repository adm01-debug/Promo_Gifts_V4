# Guia de Oncall — Promo Gifts V4

> Última atualização: 2026-10-19 (E200). Revisar após cada incidente.

---

## Contatos de emergência

| Papel | Contato | Acesso necessário |
|-------|---------|-------------------|
| Product Owner (PO) | `@adm01-debug` (GitHub) | Aprovação de schema, DDL emergencial |
| Supabase Dashboard | https://supabase.com/dashboard/project/doufsxqlfjyuvxuezpln | PO ou admin |
| Vercel Dashboard | Vercel — projeto `promo-gifts-v4` | Admin |
| GitHub Actions | `adm01-debug/Promo_Gifts_V4/actions` | Admin |

**IMPORTANTE:** Projeto canônico de produção = `doufsxqlfjyuvxuezpln`. Qualquer referência a `pqpdolkaeqlyzpdpbizo` [LEGACY_INFORMATIVO] em código executável é um bug — substituir imediatamente.

---

## Runbooks por tipo de incidente

### 🔴 Supabase 401 — SSOT revertido (DC-01)

**Sintoma:** Requisições ao Supabase retornam HTTP 401; usuários não conseguem autenticar.

**Causa provável:** Lovable reverteu `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts`.

**Diagnóstico (< 2 min):**
```bash
grep CURRENT_PROJECT_ID src/integrations/supabase/client.ts
# Deve ser: doufsxqlfjyuvxuezpln
# Se for: pqpdolkaeqlyzpdpbizo [LEGACY_INFORMATIVO] → incidente DC-01 confirmado
```

**Remediação:**
1. Abrir PR de emergência substituindo o ID
2. Merge direto em `main` com aprovação do PO
3. Aguardar Gate 0 (`validate-supabase-config.mjs`) passar no CI
4. Verificar se Vercel rebuild foi triggerado automaticamente

**Prevenção:** `.lovableignore` lista `src/integrations/supabase/client.ts`. Se o incidente recorreu, verificar se o arquivo ainda está no `.lovableignore`.

---

### 🔴 types.ts destruído (DC-02)

**Sintoma:** 50+ erros TypeScript em `magazineService.ts`, `MockupPromptManager.tsx` ou similar; tabelas `magazine_*` ausentes.

**Causa provável:** Commit do Lovable sobrescreveu `src/integrations/supabase/types.ts`.

**Diagnóstico:**
```bash
git log --oneline -5 -- src/integrations/supabase/types.ts
# Procurar commit recente do gpt-engineer-app[bot]
grep "magazine_items" src/integrations/supabase/types.ts | head -3
# Se vazio → tabelas magazine_* foram removidas
```

**Remediação:**
```bash
# Restaurar do commit anterior
git log --oneline -10 -- src/integrations/supabase/types.ts
git show <commit-hash>:src/integrations/supabase/types.ts > src/integrations/supabase/types.ts
git add src/integrations/supabase/types.ts
git commit -m "fix(types): restaura types.ts após sobrescrita pelo Lovable"
git push
```

**Verificar após restauração:**
```bash
npm run check:types-inventory-drift
```

---

### 🟡 DDL fora de migration — ledger dessincronizado (DC-03)

**Sintoma:** `ddl-out-of-band-detector.yml` falha ou reporta drift; schema ao vivo diverge do ledger.

**Diagnóstico:**
```bash
# Verificar últimas migrations no ledger
# (via pg_catalog, nunca via PostgREST)
# Query em docs/SCHEMA_REFERENCE.md §8
```

**Remediação (corolário repair-only E99):**
1. Criar migration espelho com timestamp da aplicação real em `supabase/migrations/`
2. Abrir PR com o arquivo + recibo em `supabase/MIGRATIONS_SYNC_LOG.md`
3. Após merge: dispatch `schema-snapshot-export.yml` com `force_rotate: true` se baseline ficou desatualizado

**NUNCA fazer:**
- `supabase migration squash --linked`
- `supabase migration repair --status applied` sem versão explícita
- `supabase migration repair --status reverted` em lote

---

### 🟡 Edge function divergente (DC-04)

**Sintoma:** Job "Compare GitHub × Canonical" falha no CI; função em produção difere do código em `supabase/functions/`.

**Diagnóstico:**
```bash
# Verificar função via MCP (somente leitura)
# get_edge_function("nome-da-funcao")
# Comparar com git show HEAD:supabase/functions/<nome>/index.ts
```

**Remediação:**
1. Commitar o código que reflete o estado atual da função em produção (se mais recente)
2. Ou abrir PR revertendo para a versão do git
3. Dispatch `deploy-edge-functions.yml` com `function_name` para reconciliar

**NUNCA usar `deploy_edge_function` (MCP) como deploy — só para leitura via `get_edge_function`.**

---

### 🟡 Gate Final vermelho — build bloqueado

**Diagnóstico:**
```bash
# Ver qual gate falhou no CI: Actions → deploy-gates.yml → expandir job com falha
# Cada gate tem nome "Gate X.Y — descrição" que aponta para o check com problema
```

**Por gate:**
- **Gate 0**: SSOT revertido → ver runbook DC-01 acima
- **Gate 1**: Lint/TS → `npm run lint` e `npx tsc --noEmit` localmente
- **Gate 1.2**: types.ts drift → `npm run check:types-inventory-drift`
- **Gate 1.9**: Ratchets de dívida → `npm run check:debt-ratchets`
- **Gate 1.11**: Workflow contracts → `node scripts/check-workflow-contracts.mjs`
- **Gate 2**: Testes unitários → `npm run test` para isolar
- **Gate 3**: E2E smoke → ver logs do Playwright no artefato do job

---

## Verificações de saúde rápida

Execute nesta ordem ao iniciar o plantão ou após incidente:

```bash
# 1. Verificar SSOT
node scripts/validate-supabase-config.mjs

# 2. Verificar types.ts
npm run check:types-inventory -- src/integrations/supabase/types.ts

# 3. Verificar workflow contracts
node scripts/check-workflow-contracts.mjs --gate

# 4. Verificar gates de documentação
node scripts/check-gates-table.mjs

# 5. Verificar commit local não pushado
git log origin/main..HEAD --oneline
```

---

## Comandos de diagnóstico

```bash
# Status geral do CI no último commit
# → GitHub Actions → deploy-gates.yml

# Último incidente de SSOT
# [LEGACY_INFORMATIVO] busca histórico do ID legado pqpdolkaeqlyzpdpbizo — não usar em código
git log --all -S "pqpdolkaeqlyzpdpbizo" --oneline | head -5  # [LEGACY_INFORMATIVO] busca histórico do ID legado

# Último commit de types.ts
git log --oneline -5 -- src/integrations/supabase/types.ts

# Verificar se há commits locais não pushados
git log origin/$(git branch --show-current)..HEAD --oneline

# Branches de agentes ativos
git branch -r | grep -E "(claude|codex|devin)/" | head -10

# Drift de schema (read-only, pg_catalog)
# Ver docs/SCHEMA_REFERENCE.md §8 para queries canônicas

# Tamanho do bundle atual
# → Artefato bundle-analysis no último run de deploy-gates.yml
```

---

## Escalada

1. **Incidente ativo (401, dados incorretos, deploy bloqueado):** Contatar PO imediatamente via canal de emergência
2. **Gate vermelho por >2h:** Verificar se há PR do Lovable recente que causou regressão
3. **DDL ou edge fn fora de fluxo:** Não aplicar; criar ticket e aguardar PO
4. **Dúvida sobre schema:** Consultar `docs/SCHEMA_REFERENCE.md` — nunca assumir pelo PostgREST/OpenAPI
