# Relatório de Incidente — `EnhancedErrorBoundary` em `/inteligencia-comercial`

- **Data do relatório:** 2026-07-26
- **Frente:** Inteligência Comercial (BI)
- **Rota afetada:** `/inteligencia-comercial` (`src/pages/bi/CommercialIntelligencePage.tsx`)
- **Componente que captura:** `src/components/errors/EnhancedErrorBoundary.tsx` (montado via `ProtectedRoute`)
- **Severidade:** 🔴 Crítica (tela inteira substituída pela UI de erro — sem degradação parcial)
- **Status:** Instrumentação concluída ✅ · Causa-raiz **pendente de captura em produção** ⏳

---

## 1. Resumo executivo

Ao abrir `/inteligencia-comercial`, usuários autenticados viram a tela de erro global
(“Algo deu errado”) do `EnhancedErrorBoundary` em vez do painel de BI. A tela era
substituída por completo: nenhum KPI, gráfico ou ranking renderizava, e a única saída
era recarregar ou navegar para outra rota.

Antes desta frente, o boundary **não expunha nem imprimia** a stack real do erro para
usuários não-dev, o que impedia o diagnóstico da causa-raiz a partir de um print de tela.
Isso foi corrigido: agora todo incidente gera um **código de incidente** visível na UI e
uma stack completa (`Error` original + `componentStack`) impressa no console e enviada à
telemetria. O que falta é uma única ocorrência **logada** com esse código para fechar a
causa-raiz — o sandbox não consegue reproduzir por estar deslogado (a rota redireciona
para `/auth`).

---

## 2. Impacto no usuário

| Dimensão | Avaliação |
|---|---|
| Alcance | Todos os usuários com acesso ao módulo de BI, na rota `/inteligencia-comercial` |
| Perda funcional | 100% do módulo: KPIs, curva de vendas, trending, rankings de produto/categoria/fornecedor |
| Perda de dados | Nenhuma — a rota é somente leitura (SELECT/RPC), não há mutação |
| Workaround do usuário | Recarregar a página; navegar para outro módulo (o restante do app segue funcional) |
| Risco secundário | Antes do fix, o spinner de auto-recovery podia travar indefinidamente se o reload falhasse — usuário ficava sem UI e sem saída visível |
| Percepção | Alta: é a tela usada em reunião comercial; falha “tela branca de erro” gera desconfiança nos dados |

---

## 3. Passos de reprodução

### 3.1 Caminho observado (produção)

1. Autenticar na plataforma com um usuário que tenha acesso ao módulo de BI.
2. Navegar para **Inteligência Comercial** (`/inteligencia-comercial`) pelo menu lateral
   ou por deep link direto.
3. Aguardar o primeiro ciclo de fetch dos KPIs (janela default: **30 dias**, sem filtros).
4. **Resultado observado:** a rota é substituída pela UI do `EnhancedErrorBoundary`
   (“Algo deu errado”), com o código do incidente exibido.
5. **Resultado esperado:** painel renderizado; quando não há pedidos/orçamentos na janela,
   deve aparecer o `ZeroResultDiagnosisCallout` + `GoldSyncBadge`, **não** uma tela de erro.

### 3.2 Variações a testar ao reproduzir (para isolar o gatilho)

| # | Variação | Objetivo |
|---|---|---|
| A | Deep link direto vs. navegação interna | Isolar corrida de hidratação de sessão/token |
| B | Janela 7d / 30d / 90d / 365d | Isolar payload grande ou agregação vazia |
| C | Com filtro de categoria / fornecedor / produto aplicado | Isolar caminho de query filtrada (`useCommercialIntelligence` linhas ~542-562) |
| D | Usuário sem role de BI | Isolar erro de RLS/permissão convertido em throw |
| E | Reload duro (Ctrl+Shift+R) após limpar cache | Isolar chunk stale (`lazyWithRetry` / chunk recovery) |
| F | Rede lenta / offline simulado | Isolar `Failed to fetch` na bridge externa |

### 3.3 Reprodução no sandbox — **bloqueada**

```
LOVABLE_BROWSER_AUTH_STATUS=signed_out
```

`/inteligencia-comercial` é protegida por `ProtectedRoute`; sem sessão a navegação
redireciona para `/auth` antes de qualquer render do painel. Portanto **não foi possível
capturar a stack real via Playwright neste ambiente**. Requisito para fechar: uma abertura
da tela em sessão autenticada com o console aberto.

---

## 4. Stack trace

### 4.1 Formato agora emitido (pós-instrumentação)

O boundary imprime dois registros pareados pelo código do incidente:

```
[EnhancedErrorBoundary] incidente <errorId> @ /inteligencia-comercial
  Error: <mensagem original>
      at <frame 1>
      at <frame 2>
      ...
[EnhancedErrorBoundary] component stack <errorId>:
    at CommercialIntelligencePage
    at Suspense
    at EnhancedErrorBoundary
    at ProtectedRoute
    ...
```

Referências no código: `EnhancedErrorBoundary.tsx` linhas 169-175 (`console.error` da stack
real + component stack), 110 (`createErrorId()` em `getDerivedStateFromError`), 200-204
(`reportError` com `errorId`), 382-386 (exibição do código na UI,
`data-testid="error-boundary-incident-id"`).

### 4.2 Como coletar (checklist para quem reproduzir)

1. Abrir DevTools → Console **antes** de navegar para a rota.
2. Reproduzir conforme §3.1.
3. Copiar o **código do incidente** exibido na tela.
4. Clicar em **“Copiar detalhes para o suporte”** (disponível para qualquer usuário) —
   o clipboard já contém mensagem, stack, component stack, rota e metadados.
5. Anexar também a aba **Network**, filtrando por `rest/v1` e `functions/v1`, marcando
   status ≠ 200.

### 4.3 Stack real da ocorrência do usuário

> **Não capturada.** A ocorrência relatada foi anterior à instrumentação, e a screenshot
> enviada não continha console nem código de incidente. Este é o único item que impede o
> fechamento definitivo da frente.

---

## 5. Hipóteses de causa-raiz (ordenadas por probabilidade)

Todas as hipóteses abaixo produzem exatamente o sintoma observado (throw durante render
ou dentro de `queryFn` com `throwOnError`, capturado pelo boundary da rota).

| # | Hipótese | Evidência no código | Como confirmar |
|---|---|---|---|
| H1 | Erro de query propagado como exceção não tratada (RLS/permissão ou RPC ausente no Gold) | `useCommercialIntelligence.ts` faz `throw oiErr` / `throw ordersErr` em 8 pontos (linhas 385, 397, 406, 542, 553, 562, 600, 701) sem fallback local | Stack contendo `useCommercialKPIs`/`useCommercialIntelligence` + Network com 401/403/404 em `rest/v1` ou `rpc/` |
| H2 | Acesso a campo nulo em formatação de data/valor | `GoldSyncBadge.tsx:83` usa `data.lastActivityAt?.toLocaleString('pt-BR')` — cadeia protegida, mas os cards derivados de KPI formatam números vindos de agregação possivelmente `null` | Stack apontando para `GoldSyncBadge`/`IntelligenceKPICards` com `Cannot read properties of null/undefined` |
| H3 | Chunk stale após deploy (lazy route) | Rota é carregada via `lazyWithRetry` (`src/routes/lazy-pages.ts`); o pipeline de chunk recovery cobre, mas um `ChunkLoadError` fora da janela de recovery sobe ao boundary | Mensagem `Failed to fetch dynamically imported module` / `ChunkLoadError` |
| H4 | Divergência de env do Supabase (`pqp…` em vez do canônico `doufsxqlfjyuvxuezpln`) gerando 401 em massa | `client.ts` linhas 21-56: guarda re-aponta e emite warning `missing_env_url` / `expected: CURRENT_PROJECT_ID` | Presença do warning de env no console junto ao incidente |
| H5 | Erro de agregação com janela ampla (payload/timeout na bridge externa) | Queries de ranking agregam por produto/categoria sem paginação defensiva | Só reproduz em 180d/365d; Network com timeout/`Failed to fetch` |

---

## 6. Mitigações já entregues nesta frente

Arquivo: `src/components/errors/EnhancedErrorBoundary.tsx`
(testes: `src/components/errors/__tests__/EnhancedErrorBoundary.capture.test.tsx`)

1. **Stack real sempre impressa** via `console.error`, pareada com `errorId` e rota.
2. **Código de incidente visível na UI** (`error-boundary-incident-id`) e enviado a
   `reportError` — permite casar screenshot ↔ log ↔ telemetria.
3. **“Copiar detalhes para o suporte”** liberado para qualquer usuário (não só dev).
4. **Watchdog de 10s** (`AUTO_RECOVERY_WATCHDOG_MS`) — impede travar no spinner de
   auto-recovery quando o reload falha.
5. **Reset em `popstate`/troca de rota** — sair da tela quebrada limpa o estado de erro.
6. **`isAutoRecovering: false` forçado** em novo erro (`getDerivedStateFromError`) —
   elimina loop de re-render preso em recuperação.
7. **Copy amigável preservada** — nenhuma stack é renderizada em tela para não-dev
   (aderente ao gate de sanitização de mensagens).

Efeito: o incidente deixou de ser um beco sem saída e passou a ser **diagnosticável**.
A causa-raiz do throw, porém, segue não corrigida — apenas observável.

---

## 7. Correções recomendadas (pós-captura)

| Prioridade | Ação | Escopo |
|---|---|---|
| P0 | Substituir os `throw` diretos de erro de query em `useCommercialIntelligence.ts` por retorno degradado + sinalização de estado (o painel deve mostrar “sem dados / sem permissão”, nunca derrubar a rota) | Hook de BI |
| P0 | Envolver cada bloco do painel (KPIs, gráficos, rankings) em boundary local, para que uma falha isolada não apague a tela inteira | `CommercialIntelligencePage.tsx` |
| P1 | Validar payload de agregação com schema (Zod) na fronteira do hook, convertendo `null` inesperado em zero/`—` antes da formatação | Hook + cards |
| P1 | Alerta de telemetria por `errorId` na rota `/inteligencia-comercial` (limiar: ≥3 incidentes/5min) | Observabilidade |
| P2 | Teste E2E autenticado que abre a rota em 7d/30d/90d/365d e falha se `error-boundary-incident-id` aparecer | `e2e/flows` |

---

## 8. Critério de fechamento da frente

- [x] Boundary emite stack real + código de incidente + cópia para suporte
- [x] Boundary não trava em spinner e reseta ao navegar
- [ ] **Uma ocorrência real capturada** (código do incidente + stack + Network)
- [ ] Hipótese confirmada entre H1–H5
- [ ] Correção da causa-raiz + degradação parcial no painel
- [ ] E2E autenticado cobrindo as 4 janelas de tempo sem incidente

---

## 9. Próximo passo bloqueante

Abrir `/inteligencia-comercial` **logado**, com o console aberto, e enviar:
o **código do incidente**, o conteúdo do botão “Copiar detalhes para o suporte” e a lista
de requisições com status ≠ 200. Com isso a hipótese é confirmada em minutos e a correção
de causa-raiz (§7, P0) entra na mesma leva.
