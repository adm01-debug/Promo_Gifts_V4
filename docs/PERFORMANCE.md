# Performance Optimization

## Frontend
- Code splitting with React.lazy()
- Image optimization (WebP)
- Implement virtual scrolling
- Use React Query for caching

## Backend
- Database indexing
- Redis caching layer
- CDN for static assets
- Compression enabled

## Monitoring
- Lighthouse CI score > 95
- Core Web Vitals: rastreamento e dashboard agora cobertos por sistema externo (não há mais dashboard interno em `/admin/performance` nem coleta via `web-vitals` no app).
- Error rate < 0.1%

### Pipeline de métricas reais (RUM) → Sentry

`src/lib/telemetry/navigationMetrics.ts` coleta LCP, INP (aprox.), CLS, TTFB,
TTI e duração de troca de rota no navegador e emite cada evento como
`captureMessage('nav.metric.<nome>')` no Sentry — com tags `metric`, `value`,
`rating` (`good`/`needs-improvement`/`poor`, bucketing já feito no cliente),
`route` e `device`. Amostragem por `VITE_NAV_METRICS_SAMPLE_RATE` (default 10%)
e kill-switch por navegador via `localStorage.nav_metrics_disabled='1'`.

Métricas emitidas (`nav.metric.*`): `lcp`, `inp_approx`, `cls`, `ttfb`,
`tti_approx`, `route_change`, `dom_interactive`, `dom_complete`.

#### Queries prontas (Sentry → Discover)

| Objetivo | Query |
|---|---|
| Todos os eventos de métrica | `message:"nav.metric.*"` (filtre `event.type:default`) |
| Só LCP | `message:"nav.metric.lcp"` |
| LCP ruim por rota | `message:"nav.metric.lcp" rating:poor` → colunas `route`, `count()` |
| INP por dispositivo | `message:"nav.metric.inp_approx"` → group by `device` |
| Distribuição de rating | `has:metric` → group by `metric`, `rating` |
| CLS mobile | `message:"nav.metric.cls" device:mobile` |

#### Widgets sugeridos (Sentry → Dashboards)

1. **Web Vitals — rating por métrica**: `count()` agrupado por `metric` +
   `rating`, filtro `has:metric` — mostra a fração good/needs-improvement/poor
   de cada vital (o valor bruto viaja na tag `value`, visível no detalhe do
   evento; o bucket `rating` já aplica os thresholds oficiais da tabela acima).
2. **Piores rotas (poor)**: tabela `route, count()` com filtro
   `rating:poor has:metric`.
3. **Volume diário de amostras**: `count()` por dia com `has:metric` — valida
   que a amostragem está fluindo.

> Observação: os eventos são `message` (não transactions), então o Discover
> agrega por contagem/tags — percentis de `value` não são computáveis em
> query; por isso o cliente já envia o `rating` calculado. Se percentis forem
> necessários, migrar o emit para `Sentry.metrics.distribution()` (metrics
> beta do SDK) é o caminho documentado upstream.

## Targets (Google Core Web Vitals — official thresholds)
| Metric | Good | Needs Improv. | Poor |
|--------|------|---------------|------|
| LCP    | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP    | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS    | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP    | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB   | ≤ 800ms | ≤ 1800ms | > 1800ms |

