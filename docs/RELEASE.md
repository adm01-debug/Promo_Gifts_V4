# Checklist de Release — Promo Gifts V4

> Última atualização: 2026-10-19 (E200).
> Baseado em `deploy-gates.yml` (Gates 0–6) e CLAUDE.md REGRAS #1–#10.

---

## Pré-release (gates obrigatórios)

Todo release passa pelo "Gate Final - Deploy Ready" em `deploy-gates.yml`.
Este checklist é uma referência humana — o CI é a fonte de verdade.

### Gate 0 — SSOT
- [ ] `node scripts/validate-supabase-config.mjs` passa localmente
- [ ] `CURRENT_PROJECT_ID` em `client.ts` = `doufsxqlfjyuvxuezpln`
- [ ] Nenhuma referência ao ID legado (projeto proibido — [LEGACY_INFORMATIVO]: pqpdolkaeqlyzpdpbizo) em código executável

### Gate 0.5/0.6 — Segurança de dependências
- [ ] `npm audit --audit-level high` sem CVEs high/critical
- [ ] Dependency Review (PR-only) sem deps com CVE ≥ high

### Gate 1 — Lint + TypeScript
- [ ] `npm run lint` sem erros
- [ ] `npx tsc --noEmit` sem erros
- [ ] Campos críticos de `Product` presentes: `price`, `sale_price`, `shortDescription`, `category_id`, `category_name`

### Gate 1.2 — Schema drift
- [ ] `npm run check:types-inventory-drift` sem remoções não-allowlistadas
- [ ] Tabelas críticas presentes: `personalization_techniques`, `products`, `product_variants`, `suppliers`, `magazines`, `magazine_items`, `magazine_templates`

### Gate 1.9 — Dívida técnica
- [ ] Ratchets TODO/FIXME/`as any`/file-size não aumentaram
- [ ] `console.*` baseline não aumentou
- [ ] indexed-access baseline não aumentou

### Gate 1.11 — Workflow contracts
- [ ] `node scripts/check-workflow-contracts.mjs --gate` passa (apenas `[C27-warn]` informacional)
- [ ] `node scripts/check-gates-table.mjs` passa (todos os gates documentados)

### Gate 1.14 — Secrets inventory
- [ ] Todos `secrets.*`/`vars.*` novos documentados em `docs/ci/SEGREDOS.md`

### Gate 2 — Testes unitários
- [ ] `npm run test` passa (vitest)

### Gate 3 — E2E Smoke
- [ ] Playwright smoke suite verde (chromium)

### Gate 5 — SEO
- [ ] `node scripts/seo-sanity-check.mjs` passa

### Gate 6 — Build
- [ ] `npm run build` sem erros
- [ ] SBOM SPDX-JSON gerado (push-only)

---

## Release

### Caminho autorizado para produção

1. **PR aberto** (nunca push direto em `main`)
2. **PR aprovado** pelo PO (`@adm01-debug`) para arquivos em `CODEOWNERS`
3. **Gate Final verde** no CI (todos os gates 0–6 passando)
4. **Merge** via GitHub UI (squash ou merge commit — nunca rebase de PR externo)

### Se incluir migration de schema

1. Seguir `db-apply-migration.yml` (ÚNICO caminho autorizado — REGRA #8 E15)
2. `workflow_dispatch` com `version` explícita
3. Conferir recibo em `supabase/MIGRATIONS_SYNC_LOG.md` após execução
4. NUNCA: `supabase db push`, `migration squash`, `migration repair` sem versão

### Se incluir deploy de edge function

1. Seguir `deploy-edge-functions.yml` (ÚNICO caminho autorizado — REGRA #8)
2. `workflow_dispatch` com `function_name` para deploy pontual
3. Verificar job "Compare GitHub × Canonical" após deploy

---

## Pós-release

- [ ] Verificar Vercel deployment status (Preview → Production)
- [ ] Verificar health check externo (`uptime-monitor.yml` — 30 min)
- [ ] Verificar Gate Final na run de push em `main`
- [ ] Se schema foi alterado: confirmar `ddl-out-of-band-detector.yml` sem drift

### Se algo quebrou após o merge

1. Identificar o commit que quebrou: `git bisect` ou `git log --oneline -10`
2. Verificar se Lovable fez commit posterior revertendo algo
3. **Não fazer hotfix sem gate verde** — o CI detecta regressões

---

## Rollback

### Rollback de código (frontend/scripts)
```bash
# 1. Identificar o commit bom
git log --oneline main | head -20

# 2. Criar PR de revert
git revert <hash-do-commit-ruim>
git push origin claude/<branch-name>
# Abrir PR normalmente — mesmo fluxo de release
```

### Rollback de Vercel
- Dashboard Vercel → Deployments → selecionar deployment anterior → "Promote to Production"

### Rollback de migration de schema
- **NÃO existe rollback automático de schema**
- Escrever migration de desfazimento (`DROP COLUMN`, `ALTER TABLE`) se necessário
- Seguir o mesmo fluxo de `db-apply-migration.yml`
- Documentar em `supabase/MIGRATIONS_SYNC_LOG.md`

### Rollback de edge function
```bash
# 1. Fazer checkout do código da versão anterior
git show <hash>:supabase/functions/<nome>/index.ts > supabase/functions/<nome>/index.ts
git add supabase/functions/<nome>/index.ts
git commit -m "fix(edge): reverte <nome> para versão <hash>"

# 2. Abrir PR → merge → deploy via deploy-edge-functions.yml workflow_dispatch
```

---

## Referências

- Gates detalhados: `CLAUDE.md` seção "CI — ESTRUTURA DE GATES"
- Runbooks de incidente: `docs/ONCALL.md`
- Dívidas conhecidas: `docs/DIVIDA_CRONICA.md`
- Padrão de workflow: `docs/ci/PADRAO_WORKFLOW.md`
- Política DDL: `docs/db/POLITICA_DDL.md`
- Schema reference: `docs/SCHEMA_REFERENCE.md`
