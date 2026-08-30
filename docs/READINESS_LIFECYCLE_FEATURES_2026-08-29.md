# Readiness e Lifecycle por Feature — v0.1 RASCUNHO (2026-08-29)

> **Status: RASCUNHO — aguardando `[VALIDAÇÃO PO]`.**
> **Etapa do plano:** 004 (P1).
> **Classes:** `ativo` · `parcial` (funciona com lacunas conhecidas) · `demo` (harness/QA,
> nunca produção) · `desativado` (flag off ou DeprecatedRoute) · `legado` (mantido só p/ compat)
> · `externo gerenciado` (depende de provedor fora do repo).

## 1. Features de produto

| Módulo | Lifecycle | Superfície | Flag(s) | Chamadores / evidência |
|---|---|---|---|---|
| Catálogo / listagem | ativo | `/produtos`, `/filtros`, `/novidades`, `/reposicao` | `useColorSwatchesV2` (on; só seletor de cores) | v0.1 §3 |
| Produto (PDP) | ativo | `/produto/:id` | — | v0.1 §3 |
| Busca global | ativo | shell + `/busca-preco`, `/match`, `/raio-x` | IA é externo gerenciado via Edge | v0.1 §4 |
| Carrinho | ativo | `/carrinhos*` | `ff_cart_debounce_ms` (só timing) | v0.1 §6 |
| Orçamento | ativo | `/orcamentos*` | — | v0.1 §5 |
| Desconto (aprovações) | ativo | quote builder + `/admin/limites-desconto`, `/admin/aprovacoes-desconto/:id` | — | migrations versionadas desde o import inicial (`13c588251`); reconciliação da tabela no merge `fe9a92739`; hardening de grants/índices em `fb0131782` |
| Estoque | ativo | `/estoque` | `useEmaRupture` (on), `supplierReliability` (on) — só painéis | v0.1 §7 |
| Mockup | ativo | `/mockup-generator`, `/magic-up`, `/mockups/historico` | `magic_up` (on); IA externo gerenciado | v0.1 §8 |
| Magazine | parcial | `/magazine*`, `/revista-publica/:token` | `magazineModule` (on, **não consultada** no código — não é gate) | v0.1 §9 |
| Kit builder | parcial | `/montar-kit`, `/meus-kits` | `custom_kits_v2` (**off**, não consultada) | **lacuna:** `handleSaveKit` vazio; handoff não atômico (v0.1 §10) |
| BI comercial | ativo | `/ferramentas/bi*`, `/inteligencia-comercial`, `/tendencias`, `/ferramentas/cobertura` | `advanced_analytics` (on; roles admin/manager — **não consultada** no código; não é gate) | — |
| CRM (clientes) | parcial | `/clientes*` | `crm_bridge_enabled` (on, **não consultada**) | v0.1 §11; Edge `crm-db-bridge` externo gerenciado |
| Comissões | desativado | `/comissoes`, `/admin/comissoes` → `DeprecatedRoute` | — | módulo descontinuado |
| Performance (admin) | desativado | `/admin/performance*` → `DeprecatedRoute` → BI | — | substituído por BI |
| Simulação | demo | `/simulacao` (DevRoute) | — | orquestrador fail-closed pendente (etapa 020) |
| PromoFlix playground | demo | `/promoflix-playground` | — | a confirmar com PO |
| `/debug/images` | demo | público, sem auth | — | suíte visual E2E |
| Harnesses `/__test/*`, `/__visual/*` | demo | dev-only (`import.meta.env.DEV`) | `e2e_tests` (off) | gate `check-visual-preview-suite.mjs` |

## 2. Flags de plataforma (registro `src/lib/feature-flags.ts`)

| Flag | Estado | Observação |
|---|---|---|
| `mfa` | **off** | MFA/TOTP não ativo — decisão de segurança pendente do PO (matriz fluxo 11) |
| `ai_recommendations` | on | via Edge (externo gerenciado) |
| `presentation_mode` | on | orçamentos |
| `advanced_analytics` | on, não consultada | BI não é gated de fato — corrigir ou remover (decisão na etapa 004) |
| `voice_commands` | on, não consultada | nenhum consumidor em `src/` (só o registro declara) |
| `e2e_tests` | off | correto: nunca ligar em produção |
| `magazineModule` | on, não consultada | gate fictício — corrigir ou remover (decisão na etapa 004) |
| `custom_kits_v2` | off, não consultada | não protege o builder atual (v0.1 §10) |
| `crm_bridge_enabled` | on, não consultada | kill switch fictício — v0.1 §11 |

> **Padrão registrado:** 5 flags declaradas e não consultadas (`magazineModule`, `custom_kits_v2`,
> `crm_bridge_enabled`, `advanced_analytics`, `voice_commands`). Toda flag nova deve ter consumidor
> real no caminho de produção; flag sem consumidor = dívida (candidata a remoção com `[VALIDAÇÃO PO]`).

## 3. Superfícies externas gerenciadas

Edges públicas por token ainda presentes no repo (módulo Magazine): `magazine-public-view`
(leitura) e `magazine-public-react` (reações anônimas) — ambas `verify_jwt=false` em
`supabase/config.toml`; `magazine-reader-state-read`, `magazine-reader-state-write` e
`magazine-import-local` também são públicas/sem login. As edges
`quote-public-react`, `kit-public`, `collections-public-react`, `comparisons-public-react` e
`bi-share-dossier` foram removidas na descontinuação das rotas por token (decisão PO de
07/mai/2026; Onda 9 — ver MAPA §2/I-1); referências remanescentes vivem no SSOT RBAC e em specs
E2E mockadas. Demais superfícies externas: Bitrix24, Promo Champions, Dropbox, Cloudflare Images,
ElevenLabs, CNPJá — destas, apenas Bitrix24, Cloudflare Images, ElevenLabs e CNPJá constam do
`vercel.json` CSP `connect-src`; Dropbox e Promo Champions são consumidas server-side via Edge
(`dropbox-list`; `crm-db-bridge`/`receive-crm-callback`), logo não aparecem no CSP.
Mudanças exigem `[AUTORIZAÇÃO EXTERNA]`.

## 4. Critério de conclusão da etapa 004

Cada linha com lifecycle confirmado pelo PO, flags sem consumidor decididas (consumir ou
remover) e "último uso conhecido" preenchido via telemetria (`query_telemetry`) quando houver.
