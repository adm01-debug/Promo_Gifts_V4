# Varredura dirigida — "erro virando vazio" nas telas de fluxo principal

Etapa 092 (onda 2) · achados ACH-027 / ACH-028 / ACH-029.

Escopo varrido (somente código de produto, sem `__tests__`):

- `src/pages/quotes` — `QuotesListPage.tsx`, `useQuotesListPage.ts`, `QuotesDashboardPage.tsx`,
  `quotes-dashboard/useQuotesDashboard.ts`, `QuotesKanbanPage.tsx`, `QuoteViewPage.tsx`,
  `quote-view/useQuoteViewData.ts`
- `src/pages/kit-builder` — `KitBuilderPage.tsx`, `KitLibraryPage.tsx`
- `src/pages/mockups` — `MockupGenerator.tsx`, `MockupHistoryPage.tsx`
- `src/pages/freight` — `FreightSimulatorPage.tsx`

Critério de achado: a tela consome dado remoto e **não** lê nenhum sinal de erro
(`isError` / `error` do `useQuery`), de modo que a falha cai no mesmo estado da lista vazia
legítima — o usuário não distingue "não tem nada" de "não consegui carregar".

Não contado como achado: hook que não fala com a rede, `catch` que já vira `toast.error`, e
`catch` cujo fallback é declaradamente outro caminho de dado (CRM bridge opcional).

**Total de achados: 3.**

## Achados

### 1. `src/pages/quotes/QuotesKanbanPage.tsx:26`

```ts
const { quotes, isLoading } = useQuotes();
```

`useQuotes()` expõe `error` (`src/hooks/quotes/useQuotes.ts:401`), mas a página descarta.
Com a consulta falhando, `isLoading` vira `false`, `quotes` fica `[]` e o quadro kanban é
renderizado com todas as colunas vazias — sem nenhum aviso. Severidade alta: é a tela onde o
vendedor acompanha o funil.

### 2. `src/pages/mockups/MockupHistoryPage.tsx:64`

```ts
const { data, isLoading, refetch } = useQuery({ ... });
```

O `queryFn` lança em erro do PostgREST (linha 86: `if (error) throw error;`), mas nem `isError` nem
`error` são lidos. Na renderização, `!data?.mockups.length` (linha 220) é verdadeiro tanto
para lista vazia quanto para falha, e a tabela mostra "Nenhum mockup gerado ainda". Severidade
média: o histórico parece ter sido perdido quando apenas não carregou.

### 3. `src/hooks/mockup/useMockupGenerator.ts:352-363`

```ts
const fetchHistory = useCallback(async () => {
  setIsLoadingHistory(true);
  try {
    const data = await fetchRecentMockupHistory(user?.id);
    setMockupHistory(data);
  } catch (error) {
    logger.error('Error fetching history:', error);
  } finally {
    setIsLoadingHistory(false);
  }
}, [user?.id]);
```

O erro só chega ao logger. A aba "Histórico" dentro do `MockupGenerator`
(`src/pages/mockups/MockupGenerator.tsx:584`) recebe `mg.mockupHistory` vazio e
`mg.isLoadingHistory = false`, exibindo o estado vazio. Mesma consequência do achado 2, por outro
caminho de código (o hook). Severidade média.

## Verificados e considerados cobertos

| Arquivo | Por que está coberto |
| --- | --- |
| `quotes/QuotesListPage.tsx:46,216,308` | lê `error` do hook, mostra banner e passa `loadError` à lista |
| `quotes/useQuotesListPage.ts:423` | repassa `error` do `useQuotes` |
| `quotes/QuotesDashboardPage.tsx:159-171` | bloco dedicado `if (s.error)` com `text-destructive` |
| `quotes/quotes-dashboard/useQuotesDashboard.ts:304` | repassa `error` |
| `quotes/QuoteViewPage.tsx:157` | passa `error={quoteLoadError}` |
| `quotes/quote-view/useQuoteViewData.ts:81-89` | `catch` com `toast.error` + timeout dedicado |
| `kit-builder/KitBuilderPage.tsx:345-369` | repassa `boxError` / `itemError` como `errorMessage` |
| `kit-builder/KitLibraryPage.tsx:191,489,573` | `mineError` e `templatesError` sanitizados e renderizados |
| `mockups/MockupGenerator.tsx:245,322` | `generationError` e `techniquesError` renderizados com retry |
| `freight/FreightSimulatorPage.tsx:375` | `error={error?.message ?? null}` no painel do simulador |
| `quotes/QuotesKanbanPage.tsx:54-56` | `catch` do CRM bridge é fallback declarado (`quotesClients`), não erro engolido |

## Próximo passo

Cada achado vira uma etapa própria, seguindo o modelo das etapas 073 e 077: um `isError` lido,
um estado de erro distinto do vazio, um teste que falha sem a correção. Não corrigir em lote.
