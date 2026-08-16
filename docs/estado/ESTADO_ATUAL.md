# ESTADO ATUAL DO SISTEMA — Promo Brindes (`promo-gifts-v4`)

> **Auditoria de estado.** Medição: **2026-08-16**.
> **Produção foi tratada como somente leitura.** Zero DDL, zero DML, zero migration, zero deploy.
> Nenhum arquivo de código, workflow ou configuração do projeto foi alterado por esta auditoria.
>
> **Leia isto primeiro. Os detalhes com evidência estão nos 13 documentos de lote** (`docs/estado/01..13`).

---

## 1. VEREDITO EM UMA TELA

Este sistema é **dois sistemas** com maturidades opostas, e tratá-los como um só é a origem da maior parte da confusão documental.

**A metade "dados" está em produção, viva e em escala industrial.** 7.842 produtos, 1,78 milhão de snapshots de estoque, 104 edge functions implantadas com paridade perfeita com o repositório, 135 cron jobs ativos que executaram 65.548 vezes em 7 dias com **uma** falha, e RLS habilitada em 390 das 391 tabelas. Isso não é maquete: é operação real.

**A metade "produto" existe em código e quase não existe em uso.** 13 usuários cadastrados, 2 ativos nos últimos 30 dias, **5 orçamentos e 5 pedidos em toda a história do sistema**, e 135 das 391 tabelas (34,5%) nunca receberam um único registro. Pela regra que rege esta auditoria — *pronto = em produção com uso real* — praticamente toda a linha comercial tem teto 🟨, por mais completo que esteja o código.

**Três problemas estruturais atravessam os dois lados:**

1. **O repositório não descreve o banco de produção.** Recriar o ambiente a partir de `supabase/migrations/` não reproduz produção.
2. **O CI não protege nada há três semanas**, e mesmo quando funcionava os Deploy Gates não podiam bloquear o deploy.
3. **A documentação canônica descreve um sistema que não existe.** Um único documento faz 518 referências a arquivos, das quais **223 não resolvem**.

O trabalho de engenharia feito aqui é sério. O que falhou foi o **circuito de verificação** — as guardas que deveriam avisar quando o sistema e a documentação divergem.

---

## 2. CONTAGEM HONESTA

Os lotes mediram **unidades diferentes** (arquivos, funções, integrações, promessas). Somá-las num percentual único seria desonesto. Cada tabela abaixo tem denominador próprio.

### 2.1 Módulos de código (arquivos de produção, exclui testes)

| Escopo | Denominador | ✅ | 🟨 | 🟦 | ⬛ |
|---|---:|---:|---:|---:|---:|
| Componentes admin | 291 | 269 | 10 | 0 | 12 |
| Hooks / services / stores / contexts | 348 | 310 | 10 | 0 | 28 |
| Lib / utils / tipos / integrações | 284 | 245 | 10 | 4 | 25 |
| **Subtotal medido arquivo a arquivo** | **923** | **824 (89%)** | **30 (3%)** | **4 (0,4%)** | **65 (7%)** |

Componentes comerciais (281 arquivos) e ferramentas/IA (564) foram classificados por **fluxo e ferramenta**, não por arquivo — ver §2.2 e os documentos `03` e `04`.

### 2.2 Unidades funcionais

| Unidade | Denominador | ✅ | 🟨 | 🟦 | ⬛ |
|---|---:|---:|---:|---:|---:|
| **Edge functions** | 104 | 73 (70%) | 17 (16%) | 13 (13%) | 1 (1%) |
| **Integrações com terceiros** | 44 | 18 (41%) | 22 (50%) | 1 | 3 (7%) |
| **Rotas declaradas** | 131 | — | — | — | — |
| **Páginas** | 217 | 110 roteadas · 57 subcomponentes · 2 órfãs · 48 testes |

### 2.3 Promessas × realidade (o que foi planejado ou sugerido)

| Classificação | Qtd | % |
|---|---:|---:|
| ✅ cumprida | 19 | 29% |
| 🟨 parcial | 14 | 22% |
| 🟦 só iniciada | 11 | 17% |
| ⬛ construída e abandonada | 6 | 9% |
| ❌ **nunca materializada** | **12** | **18%** |
| `NAO_VERIFICADO` | 3 | 5% |
| **Total** | **65** | 100% |

Mais **11 integrações que existem apenas em documentação** (Twilio, Mercado Pago, WhatsApp Business API, PagerDuty, Stripe/PagSeguro/Asaas, Correios/Melhor Envio, Google Analytics/GTM/Meta Ads…). Nenhuma tem código.

### 2.4 Banco de dados (medido ao vivo)

| Métrica | Valor |
|---|---:|
| Tabelas em `public` | 391 |
| **Vazias (0 linhas)** | **135 (34,5%)** |
| Quase vazias (1–10) | 68 (17,4%) |
| Com dados (>10) | 188 (48,1%) |
| Tabelas declaradas no repo sem consumidor no código | 130 de 258 (50,4%) |

### 2.5 Código sem consumidor

Somando as medições de cada lote: **≈21.000 linhas** de código de produção que nenhum caminho de execução alcança.

> ⚠️ **Confiança MÉDIA — rebaixada na autoauditoria (§9).** Este número é a soma de grandezas heterogêneas relatadas por 5 lotes distintos (3.384 + 1.980 + 8.900 + 5.400 + 1.513), e **não consegui reproduzi-lo mecanicamente** somando as linhas dos arquivos individualmente listados. Os números *por lote* estão cada um com prova de ausência de chamador no documento respectivo e são confiáveis; **o agregado é uma estimativa de ordem de grandeza, não uma medição.** Trate como "dezenas de milhares", não como 21.000 exatos.

---

## 3. RISCOS ESTRUTURAIS, POR GRAVIDADE

### 🔴 R1 — O ambiente não é reconstruível a partir do repositório

2.354 migrations aplicadas × 1.672 versionadas. Até abril/2026 o versionamento era **impecável** (474 × 474, zero drift); o rompimento é de maio a julho/2026. No diff exato de julho, **150 de 152** versões aplicadas não existem no repositório — e a busca das versões em todo o repo (`grep -rl` em `*.sql`, `*.md`, `*.json`) retornou **zero ocorrências**, descartando artefato de nomenclatura.

Confirmado por caminho independente: a análise estática das migrations mostra que `supplier_products_raw` (a camada **Bronze**) é referenciada em 127 migrations e **nunca tem `CREATE TABLE`**; o módulo Magazine inteiro não tem criação de tabela declarada; 13 de 120 relações usadas pelo frontend não existem no repo.

**Consequência:** perder o projeto Supabase significa perder o schema. Não há backup estrutural no git.

> **Correção de leitura, registrada em voz alta:** minha primeira formulação foi *"96 migrations do repo nunca foram aplicadas"*. Isso estava **superdimensionado**. Amostrei 3 arquivos e verifiquei objeto a objeto no banco: `get_profile_and_roles` existe, `idx_user_roles_user_id_role` existe, mas as policies `user_sees_own_notifications` e `enable_read_for_requesting_user` **não existem**. A leitura correta é que o registro de versões não corresponde ao conteúdo — parte foi aplicada sob outro identificador, e ao menos uma migration de RLS (`20260712_fix_rls_policies_critical.sql`) está aplicada **pela metade**. O total de "nunca aplicadas" permanece `NAO_VERIFICADO`.

### 🔴 R2 — Nenhum quality gate está protegendo nada

`npm ci` falha na `main` desde **2026-07-27**: `package.json` declara `react: ^18.3.1` e `react-router: ^8.3.0`, que exige `react >= 19.2.7`. O install morre em ~15 segundos e **os 107 workflows morrem junto**. Medido: `ci.yml` falhou em **todos os 8 pushes** desde então.

A origem é o padrão da REGRA #7 do `CLAUDE.md`: `8beb242` introduziu o conflito, `26035a1` **já o havia corrigido** (*"revert react-router 8→6 (unbreak npm ci)"*), e `af231ea` (#1790, Dependabot) o **reintroduziu**.

E mesmo com CI verde, há um problema mais profundo: **os Deploy Gates não gateiam o deploy.** `deploy-vercel.yml:26` e `deploy-gates.yml:18` disparam no mesmo `push` em `main`, em paralelo; o job de deploy declara apenas `needs: check-secrets`, e nenhum dos outros 106 workflows referencia `deploy-gates`. A única proteção efetiva é **pós-deploy** (smoke + rollback).

### 🔴 R3 — Quatro endpoints de produção sem autorização

Fato que reordena a leitura: `supabase/config.toml` deixa 65 das 104 funções no default `verify_jwt = true`, **que aceita a anon key pública**. Logo `verify_jwt` não é autorização.

| Endpoint | O que faz sem gate | Evidência |
|---|---|---|
| `audit-suite` | Cria contas (`admin.auth.admin.createUser`) e concede roles com `service_role` | `index.ts:28-57`; `grep` de `has_role\|authorize\|requireRole` = **0** |
| `detect-new-device` | `userId` vem do body e nunca é confrontado com o JWT; escreve para qualquer usuário | `index.ts:14,47,53,81` |
| `crm-callback-alerts` | Público total | `config.toml:104` (`verify_jwt=false`) + 0 tokens de auth no código |
| `load-test` | Dispara N requests contra alvo do body com `SUPABASE_SERVICE_ROLE_KEY` no header (SSRF) | `index.ts:36,44,66` |

Também medido: `_shared/token-revocation.ts` tem **0 imports** — nenhuma edge verifica revogação de JWT, apesar de existir `force-global-logout`. E `get-visitor-info/index.ts:31` chama `http://ip-api.com` **sem TLS**, alimentando decisão anti-fraude pré-login.

### 🟠 R4 — Dado fictício exibido como real

Três casos, todos verificados diretamente:

- **BI**: `useClientBI.ts` retorna `isMock: false` **e** `topCategories: MOCK_CLIENT_STATS.topCategories` na mesma estrutura, com comentário do próprio código admitindo *"fallback mock parcial"*. O badge "Dados simulados" só liga com `isMock === true` — no caminho "real" o usuário vê categorias fabricadas **sem aviso**. Achado independentemente por dois lotes distintos.
- **"Montar com IA" (Kit Builder)**: chama a edge function de verdade, exibe a sugestão e dispara `toast.success('Sugestão aplicada')` — sobre `onAIApply={() => {}}` (`KitBuilderPage.tsx:54`). Mesmo padrão em `onExportPDF` (`:105`).
- **"Assistente IA" do mockup**: `setTimeout(1500)` + `responses[Math.floor(Math.random()*4)]` sobre 4 frases fixas (`src/components/ai/AIMockupAssistant.tsx`). O comentário no código diz *"Simulate AI response"*.

Contraexemplo do jeito certo, que existe no repo: **Tendências** usa `?demo=1` explícito com badge visível.

### 🟠 R5 — Fios partidos que perdem dados silenciosamente

- **Todo webhook de entrada é perdido.** `webhook-inbound/index.ts:182` grava em `webhook_events` — **verifiquei no banco: a tabela não existe**. A RPC `increment_webhook_stats` existe, mas com assinatura `(p_endpoint_id uuid, p_is_invalid boolean)`, diferente da chamada. O painel lê `inbound_webhook_events`, que também não existe. A via de saída está igualmente morta: o cron `process-webhook-outbox` está **desativado**, o que explica as 5 tabelas `webhook_*` vazias.
- **Técnicas de personalização gravam na tabela errada.** `useTecnicasList` lê de `tabela_preco_gravacao_oficial` e `useTecnicaMutations` aplica o `id` em `personalization_techniques` — outra tabela, outra PK. O UPDATE atinge 0 linhas sem erro e a tela exibe *"Técnica atualizada!"*.
- **Relatórios agendados não têm agendador.** A UI cria `scheduled_reports`; nenhuma automação os envia. Tabela vazia em produção.
- **VirusTotal falha aberto.** Sem `VIRUSTOTAL_API_KEY`, o upload é aceito e registrado como *"Arquivo recebido para análise"* — indistinguível de varredura real.
- **`viacep` e `ipify` são bloqueados pela própria CSP do projeto** e falham em silêncio por causa de `catch{}`.

### 🟠 R6 — Os testes não protegem o que dizem proteger

- **O contrato que guarda a REGRA #1 é vacuamente verde.** As 3 asserções de `src/tests/contracts/supabase-config.test.ts` começam com `if (!isSupabaseHosted) return;`, e `tests/setup.ts:10` injeta `http://localhost:54321` quando a env não vem do ambiente. Em qualquer job sem bloco `env:`, o teste **passa sem verificar nada** — sem skip visível. É a guarda que existe por causa do incidente 401.
- **O teste de RBAC testa papéis inexistentes.** Replica a matriz com `admin|manager|seller|viewer`; o código real declara `RoleName = 'agente' | 'dev' | 'supervisor'`. O arquivo nunca importa o alvo. **52 testes-espelho** identificados no total.
- **A suíte completa do Vitest nunca roda em CI** (`test:quality` exclui `tests/hooks/**` — 849 casos fora). Dos 555 specs Playwright, **~12** rodam no PR padrão.
- **64,6% dos módulos de `src/`** (1.247 de 1.931) nunca são importados por teste algum.
- **35 `vi.mock()` apontam para módulos inexistentes** — o mock não surte efeito e o módulo real passa sem stub.

### 🟡 R7 — A documentação canônica descreve outro sistema

`docs/FUNCIONALIDADES_E_FERRAMENTAS.md` faz 518 referências a arquivos; **223 não resolvem**, 93 apontando para artefatos inexistentes em qualquer caminho. Verificados 28 componentes citados como prontos: **28 de 28 inexistentes** (`useGamification.ts`, `QuoteQRCode.tsx`, `useBitrixSync.ts`, `UserBehaviorTracking.tsx`, `PasskeyManager.tsx`…).

A hipótese do método se confirmou com precisão: **páginas administrativas têm lastro real; features de negócio prometidas, não.**

Números de status errados por ordem de grandeza: 11 vs **107** workflows · 155 vs **555** specs Playwright · 349 vs **~1.796** arquivos de teste · 82 vs **104** edge functions.

> **Correção aplicada em 2026-08-16 (autoauditoria — ver §9).** Esta linha dizia *"349 vs **1.191** arquivos de teste · 82 vs **106** edge functions"*. Os dois números vinham do lote 12 e estavam errados: contei 1.798 arquivos de teste (o lote 10 mediu 1.796) e **104** edge functions com `index.ts` (o lote 07 mediu 104, e o painel do Supabase confirma 104 implantadas). Eu havia repassado a medição pior sem cruzá-la com a melhor — exatamente o erro que este método manda evitar.

E `docs/03_ARQUITETURA_DO_SISTEMA.md` descreve multi-tenant, enquanto `src/contexts/OrganizationContext.tsx:2` declara **"SINGLE-TENANT"**.

### 🟡 R8 — REGRA #4 violada agora

`src/integrations/supabase/types.ts` tem 7 `export type` e **faltam 5 das 8 tabelas** que a regra manda verificar: `personalization_techniques`, `supplier_products_raw`, `magazines`, `magazine_items`, `magazine_templates`. O módulo Magazine sobrevive por um shim manual (`magazine-schema.ts`) com 40+ chamadas.

*(Do lado bom: os 5 campos críticos do tipo `Product` da REGRA #2 estão **todos presentes** em `product-catalog.ts:30-36`.)*

### 🟡 R9 — Automações que falham sem erro visível

| Job | Situação |
|---|---|
| `vacuum-high-dead-tuples` | **3 execuções, 3 falhas (100%)** — e `stock_snapshots` tem 1,78M linhas |
| `process-webhook-outbox` | Desativado, 0 execuções |
| `pipeline-classify-categories` | Desativado, 0 execuções |
| `cleanup-stale-ai-pending-logs` | Agendado com o corpo **comentado** |

Uma migration contém o literal `cron.unschedule('<nome>')` — placeholder nunca substituído.

### 🟡 R10 — Backup codes de 2FA gerados com `Math.random()`

`src/hooks/auth/use2FA.ts:96` gera os 8 códigos de recuperação com `Math.random().toString(36)`; zero `crypto.getRandomValues` no arquivo. **Exposição atual é zero** — `user_2fa_settings` está vazia em produção, ninguém habilitou 2FA. É defeito real com risco presente nulo, e deve ser corrigido antes de qualquer ativação.

---

## 4. O QUE ESTÁ BOM — sem suavizar nem exagerar

Não distorço o quadro para parecer rigoroso. Estes pontos foram medidos e são fortes:

1. **Pipeline de catálogo em escala real.** 7.842 produtos, 1.784.894 snapshots de estoque, 1.312.533 linhas de sumário diário, 407 mil linhas de histórico de fornecedor só em junho. Esta parte do sistema **está em produção com uso real** no sentido pleno.

2. **Edge functions com paridade perfeita.** 104 no repositório ↔ 104 implantadas, todas `ACTIVE`, **zero drift nas duas direções**. É o oposto exato do que acontece com as migrations — prova de que o time sabe fazer certo quando o processo existe.

3. **Cron saudável.** 135 jobs ativos, **65.548 execuções bem-sucedidas contra 1 falha** em 7 dias (99,998%). Rodando durante esta auditoria.

4. **RLS quase total.** 390 de 391 tabelas com RLS habilitada (99,7%), 927 policies. As 3 exceções são partições futuras vazias e um log de auditoria com deny-all.

5. **A guarda do SSOT funciona.** Durante esta própria auditoria, o `guard-canonical-project` detectou em minutos uma menção ao ID legado num documento novo que eu havia commitado, e me obrigou a corrigir. Num repositório onde a maioria dos gates está inoperante, **este está vivo e fez o serviço**.

6. **Padrões-ouro que já existem no repo** e servem de modelo para o resto: a reconciliação Cloudflare Images (credencial em Vault, cron versionado, tabela de estado, view de progresso, comentário explicando por que a abordagem anterior era falsa) e o modo demo de Tendências (`?demo=1` + badge explícito).

7. **Qualidade do código nos módulos vivos.** Zero `TODO`/`FIXME`/stub nos 297 componentes admin; `Math.random()` nunca aparece em lógica de preço ou estoque; o cliente Supabase tem 11 guardas ativas em runtime.

---

## 5. O QUE ESTA AUDITORIA NÃO COBRIU

Declarado, não escondido.

- **Build e testes não foram executados.** `node_modules` está ausente no ambiente da auditoria — e o install está quebrado no próprio repositório. **Nada neste documento afirma que o projeto compila ou que qualquer teste passa.**
- **Comportamento em navegador.** Nenhuma sessão real de usuário foi exercida. "Rota declarada e alcançável" ≠ "tela abre".
- **Conteúdo dos dados.** Contei linhas de tabela; não inspecionei valores de negócio.
- **Se as credenciais existem em produção.** Supabase Edge Secrets, Vault, GitHub Secrets e Vercel não são inspecionáveis do repositório. Toda coluna "credencial provisionada?" é `NAO_VERIFICADO` por construção.
- **Logs de execução das edge functions** — taxa de erro real das 104 funções: `NAO_VERIFICADO`.
- **Histórico do GitHub Actions além da conclusão dos runs** — nenhum check foi declarado como passando.
- **Storage buckets, Realtime e subscriptions** — não medidos.
- **Total exato de migrations "nunca aplicadas"** — `NAO_VERIFICADO` (ver correção em R1).
- **`docs/AUDITORIA_2026-05-07.md` tem 178 checkboxes abertos** e merece um levantamento dedicado.
- **`eslint.config.js` (98 KB) e `vite.config.ts`** não foram lidos integralmente.

---

## 6. PRÓXIMOS PASSOS

### 6.1 Barato e seguro — posso fazer sozinho, sem tocar em produção

| # | Ação | Por quê |
|---|---|---|
| 1 | Corrigir os 3 casos de dado fictício exibido como real (R4) | O usuário está vendo número inventado sem aviso. Correção pequena e localizada. |
| 2 | Trocar `Math.random()` por `crypto.getRandomValues` nos backup codes de 2FA (R10) | Antes que alguém ative 2FA. Uma linha. |
| 3 | Fazer o contrato SSOT falhar em vez de passar vazio (R6) | Trocar o `return` silencioso por um `skip` visível ou uma asserção de ambiente. |
| 4 | Corrigir os 4 projetos Playwright inexistentes (`routes-mobile`, `routes-public`, `routes-authed`, `chromium`) | 88 specs de rota não têm caminho de execução hoje. |
| 5 | Reescrever o teste de RBAC para importar o alvo real (R6) | Ele testa papéis que não existem. |
| 6 | Atualizar `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` ou marcá-lo como histórico (R7) | É o documento que todo dev e todo agente lê primeiro, e ele está inventando. |

### 6.2 Toca produção ou arquitetura — **é decisão sua**

| # | Decisão | O que está em jogo |
|---|---|---|
| A | **Destravar o CI** (R2) | Três caminhos: (a) repetir o revert já validado em `26035a1` → `react-router@^6.30.4`; (b) alinhar em 7; (c) subir `react` para 19 (migração de major). Recomendo (a) — é precedente do próprio time. Posso abrir o PR separado, mas **não consigo validar aqui** (o install falha). |
| B | **Fechar os 4 endpoints sem autorização** (R3) | `audit-suite` cria contas com `service_role` sem gate. Existe `_shared/createEdge.ts` pronto e com 0 imports, feito exatamente para isso. Mexe em produção. |
| C | **Decidir o que fazer com o drift de schema** (R1) | Extrair o schema vivo para migrations versionadas, ou aceitar que o banco é a fonte da verdade e documentar isso. Hoje o repositório mente por omissão. |
| D | **Fazer os Deploy Gates realmente gatearem** (R2) | Adicionar dependência entre `deploy-gates.yml` e `deploy-vercel.yml`. Muda o fluxo de deploy — não faço sem seu aval. |
| E | **`webhook-inbound`** (R5) | Criar `webhook_events` e corrigir a chamada de RPC, ou desligar o endpoint. Exige DDL em produção — REGRA #1 e #8 pedem sua aprovação explícita. |
| F | **Reativar ou remover** `process-webhook-outbox`, `pipeline-classify-categories` e `vacuum-high-dead-tuples` (R9) | Toca cron de produção. |
| G | **≈21.000 linhas sem consumidor** (§2.5) | **Não endosso remoção em bloco.** Vários módulos são a única implementação conhecida de leitura/escrita de tabelas reais. Cada lote traz nível de confiança por item; a REGRA #3 exige `git log --all -S` antes de apagar qualquer coisa — o que não foi feito e está marcado `NAO_VERIFICADO`. |

### 6.3 Sugestão de ordem

**A** (destrava tudo o mais) → **1, 2, 3** (baratos, corrigem mentira ao usuário e à guarda) → **B** (segurança) → **C, D** (estrutura) → **E, F** → **G** por último, item a item.

---

## 7. ÍNDICE DOS DOCUMENTOS DE DETALHE

| Documento | Escopo | Cobertura declarada |
|---|---|---|
| `01_ROTAS_PAGINAS.md` | 131 rotas, 217 páginas | 232 arquivos, alcançabilidade 100% |
| `02_COMPONENTES_ADMIN.md` | 297 arquivos | 100%, por grafo de imports com BFS |
| `03_COMPONENTES_COMERCIAL.md` | 388 arquivos | 100%, zero não alcançados |
| `04_FERRAMENTAS_IA.md` | 564 arquivos | 100% por grep de importador |
| `05_LOGICA_HOOKS_SERVICOS.md` | 474 arquivos | 348/348 módulos de produção |
| `06_LIB_UTILS_TIPOS.md` | 404 arquivos | 284/284 de produção |
| `07_EDGE_FUNCTIONS.md` | 104 funções | 104/104 em profundidade |
| `08_DADOS_SCHEMA.md` | 1.672 migrations | Inventário por objeto (altitude declarada) |
| `09_CI_INFRA_SCRIPTS.md` | 107 workflows, 186 scripts | 100% cruzados |
| `10_TESTES.md` | 1.796 arquivos de teste | 100% parseados; nada executado |
| `11_INTEGRACOES.md` | 44 integrações | Varredura sistemática |
| `12_PLANEJADO_E_SUGERIDO.md` | 65 promessas, 275 docs | Verificação por item |
| `13_RUNTIME_BANCO.md` | Banco canônico | Medição ao vivo, somente leitura |

---

## 8. COMO ESTA AUDITORIA SE VERIFICOU

O método exige não confiar no próprio relato. O que foi feito:

- **Recontagem de cobertura:** extraí os 1.253 caminhos distintos citados em todos os documentos e comparei com a árvore real. **1.215 existem.** Os 38 restantes foram inspecionados um a um: **não são evidência fabricada** — são citados como *prova de ausência*, cada um com o comando de busca e o resultado vazio ao lado.
- **Amostragem dos achados graves:** reproduzi pessoalmente, sem intermediário, os achados de `audit-suite`, `detect-new-device`, `crm-callback-alerts`, `load-test`, `useClientBI`, `KitBuilderPage`, `AIMockupAssistant`, `use2FA`, o contrato SSOT, o teste de RBAC, o desacoplamento dos Deploy Gates e a tabela `webhook_events` (esta última **contra o banco vivo**). Nenhum estava superdimensionado.
- **Convergência independente:** o drift de schema foi encontrado por dois caminhos que não se falaram — medição do banco vivo e análise estática das migrations. O vazamento de mock do BI foi encontrado por dois lotes distintos.
- **Correção em voz alta:** uma leitura minha estava superdimensionada e foi corrigida no próprio documento, com o original preservado (R1).
- **Contraprova contra artefato de nomenclatura:** antes de afirmar o drift, busquei as versões aplicadas em todo o repositório — zero ocorrências.

**Nada foi alterado em produção.**

---

## 9. AUTOAUDITORIA — falhas e lacunas encontradas no próprio trabalho

Depois de fechar a auditoria, submeti-a ao mesmo tratamento que apliquei ao sistema. Achei quatro problemas. Os três primeiros são **falhas minhas de fatiamento e de repasse**, não dos lotes.

### 9.1 🔴 O fatiamento deixou buracos de costura — 43 arquivos sem dono

Ao definir os 12 escopos, atribuí `src/components/admin` a um lote, 11 subdiretórios ao lote comercial e 28 ao lote de ferramentas. **Sobraram 18 subdiretórios e 3 arquivos de raiz que não entraram em escopo nenhum.**

| Medida | Valor |
|---|---:|
| Arquivos de produção fora de qualquer escopo | **43** |
| Linhas | **4.859** |
| Destes, nunca citados em documento algum | **26** |
| Cobertura real de `src/` (1.934 arquivos de produção) | **97,8%**, não 100% |

Diretórios órfãos: `a11y`, `access`, `audit`, `clients`, `dev`, `goals`, `materials`, `mobile`, `navigation`, `onboarding`, `presentation`, `providers`, `ramo-atividade`, `reports`, `seo`, `settings`, `word-magic` — mais `ThemeInitializer.tsx`, `RoleBadge.tsx`, `LoadingScreen.tsx`.

Alguns pesam: `providers/AppProviders.tsx` (composição da árvore React), `presentation/PresentationMode.tsx`, `reports/ScheduledReportsManager.tsx` (que é justamente a UI do fio partido dos relatórios agendados, R5). **Nenhum deles foi classificado.** É o erro previsto: *arquivos que caem entre dois escopos*.

### 9.2 🟠 Um terceiro lugar onde mora DDL — `qa/`, também sem lote

`qa/` (87 arquivos) não foi atribuído a lote nenhum. É majoritariamente documentação (57 `.md`), mas contém **`qa/migrations-draft/` com 13 arquivos `.sql` de DDL** — fora de `supabase/migrations/`, fora do pipeline.

Verifiquei três no banco vivo:

| Objeto do draft | Aplicado em produção? |
|---|---|
| `crm_callback_events` | ✅ sim — o draft foi promovido a migration real |
| `get_edge_invoke_summary` (draft de 23/07) | ❌ **não** |
| `reposicao_variants_summary` | ❌ **não** |

Isso **acrescenta** ao risco R1: o schema não vive em dois lugares (repo × banco), vive em **três** — `supabase/migrations/`, o banco, e este rascunhário com DDL pendente e sem rastreio.

### 9.3 🟠 Repassei dois números errados de um lote sem cruzá-los

Corrigidos em §3 (R7), com o texto original preservado: `1.191` arquivos de teste (real: ~1.796) e `106` edge functions (real: **104**). Ambos vinham do lote 12 e **contradiziam medições melhores de outros lotes do meu próprio pacote** — o documento chegou a se contradizer entre §3 e §7. É precisamente o defeito que o método alerta: *se você repassar uma premissa errada, ela se multiplica.*

Também rebaixei a confiança do agregado de "≈21.000 linhas mortas" (§2.5) de medição para **estimativa de ordem de grandeza**, por não conseguir reproduzi-lo mecanicamente.

### 9.4 🟡 Escopos menores sem cobertura declarada

`tailwind.config.ts` (350 linhas), `test-hooks-safety.mjs` (409) e `test-magazine-fix.mjs` (330) não são citados por nenhum documento. `medallion/` (22 arquivos) e `api/` foram tocados apenas de raspão.

### 9.5 ✅ O que resistiu ao teste

A autoauditoria também serve para dizer o que **não** quebrou:

- **Aritmética confere.** Todos os totais e percentuais de §2 fecham: 291+348+284 = 923; 269+310+245 = 824 (89%); 73+17+13+1 = 104; 18+22+1+3 = 44; 135+68+188 = 391 (34,5% vazias); 19+14+11+6+12+3 = 65.
- **Amostrei dois achados que eu ainda não havia verificado pessoalmente, e ambos se sustentaram:**
  - *Constantes de SELECT* (lote 03): confirmado que `category_name` e `base_price` aparecem em **zero** das 6 constantes, e `tags` só nas 2 de detalhe. Minha suspeita inicial de que o lote havia errado é que estava errada.
  - *Gate SECURITY DEFINER* (lote 09): confirmado que `required-checks.json:25` o exige, que ele vive em `magazine-unit-tests.yml:93`, e que os `paths` do `pull_request` **não incluem `supabase/migrations/**`**.
- **Nenhum dos 12 achados graves verificados anteriormente caiu.** A taxa de superdimensionamento dos lotes foi zero nas amostras — o problema esteve na minha costura e no meu repasse, não na medição deles.

### 9.6 Veredito da autoauditoria

O **critério de pronto do método exige "100% dos arquivos de código inventariados, verificado por recontagem"**. Com a medição acima, isso é **falso**: a cobertura real de `src/` é **97,8%**, e `qa/` mais três arquivos de configuração ficaram fora.

**Corrigir isso custa um lote adicional** cobrindo os 43 arquivos órfãos + `qa/migrations-draft/` + os configs. Nenhuma das conclusões estruturais (§1, §3) depende deles — os 43 arquivos são componentes de apoio, e `qa/` é rascunho —, mas **a afirmação de cobertura total não se sustenta e não vou fingir que sim.**
