# E148 — Triagem de arquivos sem import direto
**Data:** 2026-10-18  
**Origem:** P200 Onda 14 (A3-39)  
**Contexto:** 121 arquivos não-teste sem import direto em `src/`; 5 + 12 removidos em E147.  
**Restantes a triar:** ~116 arquivos

---

## Metodologia

`grep -r "import.*<basename>" src/` não detecta:
- Import dinâmico / lazy route: `import('@/pages/...')`
- Import via barrel: `export { X } from './X'` em `index.ts`
- Referência por string (feature flags, dynamic routes)
- Entry points (App.tsx, main.tsx)

Por isso cada arquivo exige verificação individual antes de remover.

---

## Categorias identificadas

### ✅ ENTRY POINTS — não remover
| Arquivo | Motivo |
|---|---|
| `src/App.tsx` | Entry raiz do app |
| `src/main.tsx` | Entry Vite |

### ✅ LAZY ROUTES — não remover (importados via dynamic import em `src/routes/lazy-pages.ts`)
| Arquivo | Import dinâmico em lazy-pages.ts |
|---|---|
| `src/pages/products/FiltersPage.tsx` | `import('@/pages/products/FiltersPage')` |
| `src/pages/products/ProductDetail.tsx` | `import('@/pages/products/ProductDetail')` |
| `src/pages/products/NoveltiesPage.tsx` | `import('@/pages/products/NoveltiesPage')` |
| `src/pages/products/ReplenishmentsPage.tsx` | `import('@/pages/products/ReplenishmentsPage')` |
| `src/pages/products/FavoritesPage.tsx` | `import('@/pages/products/FavoritesPage')` |
| `src/pages/products/SellerCartsPage.tsx` | `import('@/pages/products/SellerCartsPage')` |
| `src/pages/products/CartsListPage.tsx` | `import('@/pages/products/CartsListPage')` |
| `src/pages/products/ComparePage.tsx` | `import('@/pages/products/ComparePage')` |
| `src/pages/products/ProductMatchPage.tsx` | `import('@/pages/products/ProductMatchPage')` |

### ✅ USADOS VIA BARREL (index.ts) — não remover
Qualquer arquivo sob `src/components/admin/`, `src/components/a11y/`, etc.
com correspondente `index.ts` no mesmo diretório é re-exportado via barrel.  
**Verificar:** `grep -r "from.*components/admin'" src/` retorna imports do barrel.

### ✅ PROVIDERS / CONTEXTOS — não remover
| Arquivo | Motivo |
|---|---|
| `src/components/LoadingScreen.tsx` | Usado em App.tsx via JSX sem import nomeado |
| `src/components/ThemeInitializer.tsx` | Montado em AppBootstrap |
| `src/components/a11y/AccessibilityProvider.tsx` | Provider de contexto |

### ⚠️ INVESTIGAR ANTES DE REMOVER — aguardando análise
Os arquivos abaixo não aparecem em imports estáticos mas podem ser usados
via barrel, string ou lazy:

| Arquivo | Hipótese | Ação sugerida |
|---|---|---|
| `src/components/admin/AccessSecurityManager.tsx` | Usado em rota admin lazy | Verificar lazy-pages.ts |
| `src/components/admin/DiscountApprovalAuditTrail.tsx` | Usado em admin panel | grep no admin |
| `src/components/admin/GroupPersonalizationManager.tsx` | Usado em admin panel | grep no admin |
| `src/components/admin/MockupPromptManager.tsx` | Usado em rota admin | Verificar routes |
| `src/components/admin/ProductGroupsManager.tsx` | Usado em admin panel | grep no admin |
| `src/components/admin/ProductPersonalizationManager.tsx` | Usado em admin | grep no admin |
| `src/components/admin/ProductsManager.tsx` | Usado em admin | grep no admin |
| `src/components/admin/RlsIntegrationTestsDialog.tsx` | Ferramenta dev | Verificar DevGate |
| `src/components/RoleBadge.tsx` | Usado em layout | grep |
| `src/components/access/DevAccessDeniedPage.tsx` | Rota protegida | Verificar routes |
| `src/components/access/UnauthorizedPage.tsx` | Rota de erro | Verificar routes |

---

## Status por lote

| Lote | Arquivos | Status |
|---|---|---|
| E147 (removidos) | 5 componentes + 12 barrels | ✅ REMOVIDOS |
| Entry points | 2 | ✅ MANTER |
| Lazy routes conhecidas | 9+ | ✅ MANTER |
| Via barrel | ~30 (estimado) | ✅ MANTER (pendente confirmação) |
| Aguardando análise individual | ~70 | ⚠️ PENDENTE |

---

## Próximos passos (E148 fase 2)

1. Executar análise de import transitivo via `graphify query "arquivos sem import direto"`
2. Para os ~70 arquivos em "Aguardando análise":
   - Verificar se aparecem em admin lazy routes: `grep -r "import(" src/routes/`
   - Verificar se aparecem em feature flags ou mapas de componentes
3. Remover em lote apenas os confirmados mortos (zero usos em todo o codebase)

**Gate de conclusão:** relatório atualizado em `docs/arquivo/2026-10/` com veredito por arquivo.  
**Nota:** Remoção em massa sem verificação individual viola a REGRA do P200-E148.
