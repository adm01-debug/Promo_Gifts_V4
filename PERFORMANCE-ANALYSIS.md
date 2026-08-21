# 🔍 Relatório de Análise de Performance - MainLayout

## Problema Identificado

**Main Layout Mount: 2313.80ms** - O layout principal está demorando **2.3 segundos** para montar.

---

## 1. Componentes que Montam Juntos

### Estrutura Atual:
```
AppProviders (contém CollectionsProvider → useCollections → useExternalCollections)
  └── MainLayout (lazy)
        ├── StarBackground (lazy + Suspense)
        ├── Header (lazy + Suspense)
        │     └── CartHeaderButton
        │           └── useCrmCompanies() ← QUERY NO HEADER!
        ├── SidebarReorganized (lazy + Suspense)
        │     └── useQuery (pendingApprovalCount)
        └── PersistentBreadcrumbs (lazy + Suspense)
```

### Problemas:
1. **Header carrega `useCrmCompanies`** - Busca 200 empresas do CRM em cada render
2. **CollectionsProvider** executa query na inicialização
3. **SidebarReorganized** executa query para `pendingApprovalCount`
4. **4 Suspense boundaries** em cascata causam delays sequenciais

---

## 2. Queries que Podem ser Otimizadas

### 2.1 `useCrmCompanies` no Header (CRÍTICO)
**Arquivo:** `src/components/cart/CartHeaderButton.tsx:149`

```typescript
const { data: crmCompanies = [] } = useCrmCompanies({ is_customer: true });
```

**Problema:** Esta query executa no Header, que é um componente crítico de UI. Ela busca até 200 registros do CRM e é executada:
- Na montagem inicial
- Em qualquer re-render do componente
- Para cada usuário que abre o carrinho

**Impacto:** ~100-500ms por execução

### 2.2 `useExternalCollections` na inicialização
**Arquivo:** `src/contexts/CollectionsContext.tsx`

```typescript
const collectionsHook = useCollections(); // ← executa query ao montar
```

**Problema:** Query executa na inicialização do app, mesmo antes do usuário navegar para páginas de coleções.

**Impacto:** ~50-200ms

### 2.3 `pendingApprovalCount` no Sidebar
**Arquivo:** `src/components/layout/SidebarReorganized.tsx:420`

```typescript
const { data: pendingApprovalCount } = useQuery({ ... });
```

**Impacto:** ~50-100ms

---

## 3. Sugestões de Otimização

### 3.1 Lazy-load do `useCrmCompanies` (Alta Prioridade)

**Problema:** O hook `useCrmCompanies` é chamado no Header, mas só é usado quando o carrinho está aberto.

**Solução:** Carregar os dados apenas quando o popover do carrinho for aberto:

```typescript
// CartHeaderButton.tsx - usar um estado para controlar quando buscar
const [cartOpen, setCartOpen] = useState(false);

// Query só executa quando cartOpen for true
const { data: crmCompanies = [] } = useCrmCompanies({ 
  is_customer: true,
  enabled: cartOpen 
});
```

**Benefício:** Remove ~200-500ms do tempo de mount inicial

### 3.2 Defer CollectionsProvider (Média Prioridade)

**Problema:** CollectionsProvider executa query na inicialização.

**Solução:** Carregar coleções apenas quando necessário:

```typescript
// CollectionsContext.tsx
export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  
  // Usar Intersection Observer ou navegação para ativar
  useEffect(() => {
    const handler = () => setEnabled(true);
    window.addEventListener('collections:open', handler);
    return () => window.removeEventListener('collections:open', handler);
  }, []);
  
  const collectionsHook = useCollections({ enabled }); // ← Query só roda quando enabled
  // ...
}
```

### 3.3 Paralelizar Lazy Loading

**Problema:** Os componentes são carregados sequencialmente.

**Solução:** Usar `React.lazy` com prefetch:

```typescript
// AppRoutes.tsx
// Pré-carregar Header e Sidebar juntos
const preload = () => {
  Promise.all([
    import('./Header'),
    import('./SidebarReorganized'),
  ]);
};

// Chamar preload() após primeiro render
useEffect(() => {
  requestIdleCallback(preload);
}, []);
```

### 3.4 Suspense Boundaries Mais Inteligentes

**Atual:** 4 Suspense boundaries individuais
**Sugerido:** Agrupar componentes menos críticos em um único Suspense

```typescript
// MainLayout.tsx
<Suspense fallback={<LayoutSkeleton />}>
  <StarBackground />
  <SidebarReorganized ... />
  <Header ... />
  <PersistentBreadcrumbs />
</Suspense>
```

**Benefício:** Reduz cascata de loading states

---

## 4. Métricas de Impacto Estimado

| Otimização | Tempo Salvo | Prioridade |
|------------|-------------|------------|
| Lazy-load useCrmCompanies | 200-500ms | ALTA |
| Defer CollectionsProvider | 50-200ms | MÉDIA |
| Paralelizar lazy loading | 100-300ms | MÉDIA |
| Agrupar Suspense boundaries | 50-100ms | BAIXA |

**Total estimado:** 400-1100ms de melhoria

---

## 5. Caminho Crítico de Renderização

```
1. AuthProvider.getSession() - ~50ms
2. AppBootstrap.initialLoad() - ~100ms
3. MainLayout (lazy) hydrate - ~300ms
4. Header (lazy) hydrate - ~500ms
   └── useCrmCompanies.query() - ~200ms (NO CRITICAL PATH!)
5. Sidebar (lazy) hydrate - ~400ms
6. CollectionsProvider query - ~150ms
7. Final render - ~100ms

TOTAL: ~1800ms (target: <500ms)
```

---

## 6. Recomendações Imediatas

1. ✅ Mover `useCrmCompanies` para dentro do popover do carrinho
2. ✅ Adicionar `enabled: false` temporário na query de coleções
3. ✅ Pré-carregar Header/Sidebar com `requestIdleCallback`
4. ✅ Considerar usar `React.startTransition` para updates não-críticos

---

## Status: Pendente de Aprovação do Usuário
