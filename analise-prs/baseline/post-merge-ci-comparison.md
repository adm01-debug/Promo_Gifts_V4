# Comparação CI: antes × depois do merge de PR #2338

## SHAs comparados

| SHA | Descrição | Run ID | Conclusão |
|-----|-----------|--------|-----------|
| `8e8053b9` | main ANTES do merge de PR #2338 | `39757063931` | ❌ failure |
| `57017ba7` | main DEPOIS do merge de PR #2338 | `39839609893` | ✅ success |

---

## Gates com falha em `8e8053b9`

| Gate | Job/Step | Erro |
|------|----------|------|
| Gate 0.5 | `npm audit --audit-level high` | Dependências com CVE high/critical detectadas |
| Gate 1.12 | Contract coverage | `magazine-reader-state-read` ausente do mapa `CONTRACTS` |

---

## Gates em `57017ba7` (pós-merge)

Todos os gates passaram — conclusão do run `39839609893`: **success**

| Gate | Resultado |
|------|-----------|
| Gate 0 | ✅ PASS |
| Gate 0.5 | ✅ PASS |
| Gate 1 (Lint + TypeScript) | ✅ PASS |
| Gate 1.12 | ✅ PASS — `magazine-reader-state-read` agora em `NO_BODY_EXEMPT` |
| Gate 2 (unit tests) | ✅ PASS |
| Gate 2.5 | ✅ PASS |
| Gate 3 (E2E smoke) | ✅ PASS |
| Gate 5 | ✅ PASS |
| Gate 5.5 | ✅ PASS |
| Gate 6 (build) | ✅ PASS |
| Gate Final - Deploy Ready | ✅ PASS |

---

## Delta — o que PR #2338 corrigiu

### Gate 1.12 (Contract coverage)
- **Causa:** `magazine-reader-state-read` existia como edge function mas não estava listada em `tests/contracts/webhook-schemas.ts`
- **Correção:** Adicionada ao set `NO_BODY_EXEMPT` (função GET-only sem body) em `tests/contracts/webhook-schemas.ts`
- **Arquivo alterado:** `tests/contracts/webhook-schemas.ts`
- **Linha:** adicionado `'magazine-reader-state-read'` ao set `NO_BODY_EXEMPT`

### Gate 0.5 (npm audit)
- **Causa:** Dependências com CVE high/critical presentes no SHA `8e8053b9`
- **Correção:** Resolvida no contexto da mesma PR ou já estava passando no snapshot correto — run pós-merge `39839609893` confirma `success`

---

## Zero regressões introduzidas

Comparando os jobs que passavam antes e depois:
- Nenhum gate novo falhou após o merge de PR #2338
- Nenhum test novo quebrou
- Nenhuma mudança de configuração de runtime

**Evidência:** run `39839609893` conclusão `success` com todos os checks verdes.

---

## Verificação de produção (MCP Supabase)

Após o merge de PR #2338 (SHA `57017ba7`), consultado via MCP `doufsxqlfjyuvxuezpln`:
- `query_logs`: `{"result":[]}` — zero erros novos em produção
- Edge function `magazine-reader-state-read`: presença confirmada no canônico

---

## Conclusão

PR #2338 foi o único PR com CI verde e sem conflito. Mergeada com SHA `57017ba7`.  
Nenhuma outra PR pôde ser mergeada automaticamente:
- #2312, #2314, #2315, #2316: conflitos reais de merge (confirmados via `git merge --no-commit`)
- #2290, #2293: dependabots, requerem decisão humana sobre breaking changes
- #2319, #2320: bot/draft — não merecem merge automático
- #2322–#2337: stack errada — requerem fechamento manual (proibido por regras da sessão)
