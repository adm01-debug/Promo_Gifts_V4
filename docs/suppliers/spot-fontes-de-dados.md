# SPOT / Stricker — 3 Canais de Dados

**Fornecedor:** SPOT / Stricker · `supplier_id = bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0`
**Processador:** `fn_process_raw_v2`
**Atualizado:** 2026-06-06

---

## Visão geral

A SPOT é o fornecedor mais complexo da plataforma. Seus dados chegam por **3 canais distintos**,
cada um com autenticação, propósito e formato próprios. Apenas **um** deles (o Webservice API)
alimenta o pipeline de catálogo — os outros dois são complementares ou operacionais.

```
┌─────────────────────────────────────────────────────────────────────┐
│  CANAL A              CANAL B                CANAL C                 │
│  Webservice API       Portal público         Portal autenticado     │
│  ws.spotgifts.com.br  www.spotgifts.com.br   www.spotgifts.com.br   │
│  (AccessKey → token)  (sem auth)             (login/senha)          │
│  🟢 catálogo          🟡 complementar         🔴 operacional          │
└──────┬────────────────────┬─────────────────────┬───────────────────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    supplier_products_raw                            │
│   raw_data (JSONB)   stock_data           + supplier_customization_ │
│   ← OptionalsComplete ← Stocks              raw ← CustomizationTables│
│   (Canal A apenas — Canais B e C NÃO escrevem no Bronze)            │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ▼
  fn_process_raw_v2
       │
       ▼
  produtos_padronizacao / produtos_padronizacao_variantes  (SILVER)
       │
       ▼
  products / product_variants
       (camada GOLD)
```

> **Regra cardinal:** a ingestão só escreve no Bronze, e só via RPC. A transformação
> Bronze→Silver→Gold é responsabilidade exclusiva do Postgres (`fn_pipeline_promote_tick`).

---

## Canal A — Webservice API `ws.spotgifts.com.br`

**Host:** `https://ws.spotgifts.com.br/api/v1SSL` · **source_channel:** `api_xml`
**Auth:** `POST /AuthenticateClient` com `AccessKey` → token de sessão
**Segredo:** `SPOT_ACCESS_KEY` (Vault Supabase + getter `fn_get_spot_access_key()`)
**Status:** ✅ **Único canal que alimenta o Bronze** · Bronze populado (~3.612 SKUs)

### Feeds disponíveis

| Feed | Chave | O que entrega | Volume | Limite/dia | Cadência |
|---|---|---|---|:---:|---|
| `OptionalsComplete` | `Sku` | Feed-mãe: ~230 campos por SKU | ~27 MB | **22** | 1×/dia 03:00 |
| `Stocks` | `Sku` | Estoque atual + 6 janelas de reposição | leve | **96** | */30 min |
| `CustomizationTables` | `TableCodeOption` | Preços de personalização (15 faixas + SLA) | ~289 linhas | 22 | 1×/semana |
| `Colors` | `ColorCode` | Tabela de 52 cores (código → desc → hex) | 52 linhas | 22 | 1×/semana |
| `ProductTypes` | `TypeCode` | Taxonomia (31 tipos + subtipos) | 31 linhas | 22 | 1×/semana |
| `CanceledProducts` | ref | Produtos descontinuados → `is_active=false` | variável | 22 | fim de cada full-pull |

### O que o `OptionalsComplete` entrega (feed-mãe)

```
OptionalsComplete — 1 linha por SKU ({ProdReference}-{ColorCode})
  │
  ├── IDENTIDADE     → Sku, WebSku, ProdReference, Multiplier, UpdateDate
  ├── NOME/DESCRIÇÃO → Name, ShortDescription, Description, SEO*
  ├── COR            → ColorCode, ColorDesc1, ColorHex1
  ├── PREÇO          → MinQt1..5 / Price1..5 (5 faixas de quantidade)
  ├── FÍSICO         → CombinedSizes, Weight, BoxWeightKG, BoxVolume
  ├── CATEGORIAS     → Type/TypeCode, SubType/SubTypeCode, Catalogs
  ├── EMBALAGEM      → Packing, Repacking, BoxInnerQty, BoxQuantity
  ├── PERSONALIZAÇÃO → CustomizationTypes, Area1..8, Component1..8,
  │                    Location1..8, TableCodesOptions1..8 (8 posições)
  ├── IMAGENS        → MainImage, AllImageList, BoxImage, Area{n}Image,
  │                    Component{n}Image, Location{n}Image
  ├── VÍDEO          → VideoLink (YouTube), VideoLinkVimeo, Video360
  └── TAGS/FLAGS     → KeyWords, Properties, Certificates, IsTextil,
                       IsStockOut, NewProduct, PvcFree, NoReplenishment
```

### Onde cada feed aterra no Bronze

| Feed | Tabela destino | Campo / trilha |
|---|---|---|
| `OptionalsComplete` | `supplier_products_raw` | `raw_data` (jsonb, as-is) |
| `Stocks` | `supplier_products_raw` | `stock_data` (trilha separada) |
| `CustomizationTables` | `supplier_customization_raw` | 1 linha por `table_code_option` |
| `Colors` | `supplier_colors` | de-para |
| `ProductTypes` | `supplier_category_mappings` | de-para |
| `CanceledProducts` | `supplier_products_raw` | `is_active = false` |

### Limitações e gotchas do ETL

| # | Regra | Detalhe |
|---|---|---|
| 1 | `WeightGr` ≠ peso unitário | É gramatura têxtil (g/m²). Peso real = `Weight` |
| 2 | `HasCapacitys` sempre `false` | Não usar como flag. Usar `Capacity` (texto) não-vazio |
| 3 | Cores com código duplicado | `03` e `103` = "Preto". Normalizar no de-para `supplier_colors` |
| 4 | `BoxSizeM` usa metros como string | `0.39` = 39 cm. Preferir campos `Box*MM` numéricos |
| 5 | `YourPrice` esparso (9% dos SKUs) | Fallback via `Price{n}` + condição comercial |
| 6 | Cota crítica no `OptionalsComplete` | Apenas **22 chamadas/dia**. Falha sem retry planejado perde a janela |
| 7 | Mojibake em textos de área | `Ã˜` → `Ø`. Sanitizar UTF-8 na padronização (Silver) |
| 8 | Só 5 faixas de preço ativas no BR | `MinQt6..10` / `Price6..10` são sempre vazias |

---

## Canal B — Portal Web Público `www.spotgifts.com.br`

**Host:** `https://www.spotgifts.com.br` · **source_channel:** — (não ingerido)
**Auth:** nenhuma — endpoints abertos ao público
**Status:** ⚠️ **Complementar · não usado no pipeline principal**

| Endpoint | O que entrega | Uso no pipeline |
|---|---|---|
| `GET /pt/catalogo/ajax/pesquisar.php` | Busca rápida (até 5 resultados) | ❌ Não usado |
| `POST /pt/catalogo/catalogo.ajax.php` (`getStockWarehouses`) | Estoque por armazém físico | ⚠️ Opcional/complementar |
| `GET /pt/produto/ajax/carregaPersonalizacoes.php` | HTML de personalização do produto | ❌ Não usado |
| `GET /pt/produto/ajax/carregaRelacionados.php` | Produtos relacionados | ❌ Não usado |

> **Nota:** `getStockWarehouses` é o único endpoint deste canal com alguma utilidade para dados —
> e ainda assim é redundante com o feed `Stocks` do Webservice (Canal A).

---

## Canal C — Portal Web Autenticado `www.spotgifts.com.br`

**Host:** `https://www.spotgifts.com.br` · **source_channel:** — (não ingerido)
**Auth:** `POST /pt/area-reservada/login/` → cookie `PHPSESSID`
**Status:** ❌ **Dados operacionais — fora do escopo do catálogo**

| Endpoint | O que entrega |
|---|---|
| `getSemaforo` | Semáforo de disponibilidade (verde/amarelo/vermelho) |
| `/pt/loja/*` | Carrinho, checkout, cálculo de frete |
| `/pt/simulador/*` | Simulador de personalização |
| `/pt/clientes/*` | Pedidos, faturas, notas fiscais |
| `/pt/maquetas_guardadas/*` | Layouts salvos de personalização |
| `/pt/orcamentos/*` | Orçamentos comparativos |

### ⚠️ Alertas de segurança do Canal C

| Alerta | Detalhe |
|---|---|
| 🔴 Senha fraca | `12345` sem requisitos de complexidade |
| 🔴 Bloqueio geolocalizado | Acesso de IP fora do Brasil pode travar a conta por "acesso simultâneo de países diferentes" — robô precisa rodar de IP brasileiro |
| 🔴 Sem 2FA | Nenhum segundo fator de autenticação |
| 🟡 Sem CSRF Token | Endpoints POST sem proteção CSRF |
| 🟡 Sessão por cookie | `PHPSESSID` expira ao fechar o browser |

---

## Comparativo dos 3 canais

| Informação | A · Webservice | B · Portal público | C · Portal autenticado |
|---|:---:|:---:|:---:|
| Alimenta o Bronze | ✅ | ❌ | ❌ |
| Autenticação | AccessKey → token | nenhuma | login/senha → PHPSESSID |
| Catálogo completo (produto-pai + variante) | ✅ `OptionalsComplete` | — | — |
| Preço (5 faixas) | ✅ | — | — |
| Estoque | ✅ `Stocks` | ⚠️ por armazém | ⚠️ semáforo |
| Personalização (preços + áreas) | ✅ `CustomizationTables` | ⚠️ HTML | ⚠️ simulador |
| Cores / Taxonomia | ✅ `Colors` / `ProductTypes` | — | — |
| Descontinuados | ✅ `CanceledProducts` | — | — |
| Pedidos / Faturas / NF | ❌ | ❌ | ✅ operacional |
| Frete / Checkout | ❌ | ❌ | ✅ operacional |
| Risco de segurança | 🟢 baixo (Vault) | 🟢 baixo (público) | 🔴 alto (senha fraca, geo-block, sem 2FA) |

---

## Situação de integração e próximos passos

| Canal | Integrado | Automação | Ação |
|---|---|---|---|
| A · Webservice API | ✅ Bronze populado | ⚠️ snapshot dez/2025 | Ingestão n8n diária com watermark `UpdateDate` (ver cadência) |
| B · Portal público | ❌ | ❌ | Avaliar `getStockWarehouses` só se `Stocks` (Canal A) for insuficiente |
| C · Portal autenticado | ❌ | ❌ | Fora do escopo de catálogo. Se usado p/ operação: trocar senha, exigir IP BR, adicionar 2FA |

### Cadência de ingestão (estado-alvo, com stagger)

| Horário | Feed | Frequência |
|---|---|---|
| 03:00 | `OptionalsComplete` (produtos) | 1×/dia |
| */30 min | `Stocks` (estoque) | a cada 30 min |
| Dom 04:00 | `CustomizationTables` | 1×/semana |
| Dom 04:00 | `Colors` + `ProductTypes` | 1×/semana |
| Fim de pull | `CanceledProducts` (sweep) | a cada full-pull OK |

> **Regra de stagger:** o pull de produto nunca roda ao mesmo tempo que o `promote tick` (*/10 min).
> Produto é pesado e raro (cota de 22/dia); estoque é leve e frequente.
