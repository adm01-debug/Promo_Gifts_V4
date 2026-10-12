# Auditoria exaustiva — Funcionalidades planejadas e não executadas

> **Repositório:** `promo-gifts-v4` · **HEAD auditado:** `72ae243` (2026-10-11, `chore(main): release 1.0.5`)
> **Pergunta respondida:** de tudo que foi planejado, prometido, recomendado ou desenhado para o sistema
> (planos, roadmaps, ADRs, auditorias, handoffs, issues e TODOs no código), **o que não foi executado** —
> seja parcialmente, seja nem iniciado — e qual o efeito disso no negócio.
> **Modo:** somente leitura. Nenhum código, schema, workflow ou dado foi alterado por esta auditoria.
> **Estrutura:** este documento traz o sumário, os placares e a matriz de prioridades. O detalhe item a item
> (com evidência arquivo:linha) está em 11 anexos na pasta
> [`auditoria-planejado-nao-executado-2026-10-11/`](auditoria-planejado-nao-executado-2026-10-11/).

## Sumário

1. Sumário executivo
2. Metodologia
3. Placar por frente de auditoria
4. Placar por plano
5. Matriz de prioridades consolidada
6. Dívida crônica — o que reaparece plano após plano
7. Decisões pendentes do PO que travam execução
8. Documentos desatualizados que induzem erro
9. Índice dos anexos

---

## 1. Sumário executivo

### 1.1 Números

| Medida | Valor |
|---|---|
| Planos e auditorias numerados confrontados com o código | **20** (**1.387 etapas**) |
| Etapas desses planos efetivamente concluídas no código | **409 (29%)** |
| Outros itens auditados (roadmap, ADRs, docs de feature, relatórios de auditoria, issues, varredura do código) | ≈ 700 |
| **Linhas de pendência registradas nos anexos** (cada uma com evidência) | **1.258** |
| ↳ 🟨 Parcial | 563 |
| ↳ ❌ Não iniciado | 459 |
| ↳ ⚠️ Não verificável pelo repositório (depende de produção) | 125 |
| ↳ 🟦 Órfão (pronto, mas ninguém usa) | 62 |
| ↳ ⬛ Abandonado/removido | 49 |

As linhas não são todas independentes: o mesmo tema (ex.: "usuário de teste para E2E") aparece em vários
planos, e cada plano é contado separadamente para mostrar há quanto tempo o tema circula. A §5 deduplica.

### 1.2 O que exige ação imediata (segurança e dados)

> Os detalhes técnicos destes itens (arquivo, linha, forma de exploração) foram **omitidos deste documento
> público** e entregues ao PO por canal privado. Aqui fica só o necessário para priorizar.

1. **🚨 Credencial de produção com acesso total ao banco versionada no repositório público.** A rotação estava
   planejada no plano de Mockup de 08/10 (item MK-008) e não foi feita. → A05 MK-008
2. **Funções de teste publicadas em produção sem controle de acesso adequado** — permitem criar dados
   falsos em produção. → A07 IN-003/004
3. **Dados de aprovação de mockup acessíveis sem login.** A correção foi aprovada pelo dono em 08/10 e não
   foi aplicada. → A06 DB-050
4. **Revista: permissão de escrita mais ampla que a planejada** — a migration "RPC-only" de 09/09 nunca saiu
   do rascunho. → A05 MR-001
5. **Credenciais vazadas sem rotação registrada** (alerta aberto desde 19/05 e incidente do `.env` de abril
   ainda pendente). → A11 AQ-013/AQ-050
6. **Repositório público com a guarda de segurança desligada:** 62 alertas CodeQL abertos (38 HIGH),
   `fail-on: high` removido, ruleset da `main` com 0 aprovações e bypass "always". → A08 E53/E94–E96
7. **Correções de segurança aprovadas em pacote e nunca aplicadas** (Pacotes #1/#2, `REVOKE` pendente,
   correção de IDOR fora do ledger). → A08 §10.2 · A06 DB-068 · A11 AQ-018
8. **Backup/PITR e restore nunca comprovados** (nenhum exercício registrado). → A07 IN-069 · A09 PCB-015/060

### 1.3 Onde o sistema pode errar dinheiro

- **Kit Maker — gravação a R$ 0:** personalização sem preço calculado entra como zero no total, e a
  validação do kit não exige personalização válida. → A03 KM2-117/119/146
- **Kit Maker — orçamento não revalida preço**, não aplica pedido mínimo nem múltiplos (a view
  `vw_products_min_quantity` existe e não é usada), desconto fixo em zero. → A03 KM2-133/135/139 · A04 KMC-084
- **Kit Maker — frete subestimado:** `maxWeight` da caixa nunca é preenchido e `weight_g = 0` é tratado
  como peso conhecido; o frete é tabela fixa sem CEP. → A03 KM2-099/138 · A09 PC-110
- **Selos e BI com dado simulado apresentado como real** ("Fornecedor verificado", "Hot Item", Cliente 360,
  sazonalidade). → A01 RP-021/042–044

### 1.4 Funcionalidades prometidas que o vendedor ou o cliente não têm

- **Links públicos quebrados:** coleção, comparação e favoritos geram links para rotas inexistentes. → A01 RP-030
- **Personalização indisponível em ~4 mil produtos novos** (áreas de gravação fora do pipeline; só 46,7%
  dos ativos têm área). → A02 FD-164 · A03 5.21
- **Mockup com a arte sempre no centro do produto**, sem posição/escala; "verso" é a frente espelhada. → A03 KM2-121/124/125
- **Relatórios agendados que nunca são enviados** e 12 funções sem gatilho (alertas de preço de favoritos). → A01 RP-038 · A10 CD-060
- **17.709 fotos da XBZ sem upload** — dois crons chamam funções que não existem e registram "sucesso". → A07 IN-001/002
- **Painel de ruptura de estoque (EMA) pronto e invisível** — 2.548 linhas sem tela. → A10 CD-042
- **Direito ao esquecimento (LGPD)** — `anonymize-user` existe e nada a chama. → A10 CD-058
- **PDF de revista e de kit = impressão do navegador**; PDF de servidor planejado não existe. → A05 MG-003 · A03 KM2-149
- **Roadmap nunca iniciado:** aprovação pública de orçamento, pedidos, pagamentos, WhatsApp API oficial,
  gamificação, push. → A01
- **Bitrix:** a sincronização aponta para tabelas que não existem no banco. → A07 IN-042 · A01 RP-016

### 1.5 O que trava as entregas

- **O único check obrigatório da `main` (`Gate Final - Deploy Ready`) está vermelho em 18 dos 20 últimos
  runs** porque o CI não tem usuário de teste E2E válido. Toda PR herda esse vermelho. → A08 10.0
- **Kit Maker, Magazine e Mockup sem E2E autenticado real**: as specs existentes testam rotas antigas,
  `data-testid` inexistentes ou pulam quando falta o secret. → A04 KMF-001 · A05 ME-047 · A08
- **53 cenários de resiliência "P0" em skip**; `.skip/.only/xit` cresceu de 366 para 520. → A10 CD-061 · A11 AQ-034
- **Só 12 de 81 specs visuais têm baseline.** → A08 E43–E47
- **Não existe ambiente de staging**: "staging" de frete roda contra produção. → A09 PCB-034


## 2. Metodologia

### 2.1 Princípio: documento não é prova

Este repositório tem **411 documentos `.md` em `docs/`** (546 no repo inteiro) e um histórico conhecido de
documentação que cita arquivos inexistentes (284 referências quebradas medidas em 2026-08-16,
`docs/estado/12_PLANEJADO_E_SUGERIDO.md` §0). Por isso, **nenhum item deste relatório foi classificado
com base no que um documento diz de si mesmo**. Cada item foi confrontado com o código executável
(`src/`, `supabase/functions/`, `supabase/migrations/`, `scripts/`, `.github/workflows/`, `tests/`, `e2e/`)
por `rg`/`grep`/`ls`/leitura dirigida, e a evidência está na própria linha da tabela (arquivo:linha ou
comando + resultado).

O que depende de estado de produção (banco vivo `doufsxqlfjyuvxuezpln`, secrets do GitHub, branch
protection, N8N, VPS, Vercel) **não foi consultado** nesta auditoria — fica marcado `⚠️ NÃO VERIFICÁVEL`
com a indicação do que confirmaria.

### 2.2 Escopo varrido

| Camada | Volume no HEAD `72ae243` (2026-10-11) |
|---|---|
| Código front (`src/**/*.ts(x)`) | 2.611 arquivos · ~575 mil linhas · 174 páginas · 941 componentes · 320 hooks |
| Edge functions (`supabase/functions/*`) | 110 funções (+ `_shared`) |
| Migrations (`supabase/migrations/`) | 3.018 arquivos |
| Schema gerado (`src/integrations/supabase/types.ts`) | 64.733 linhas |
| Workflows CI (`.github/workflows/`) | 123 arquivos |
| Testes | 1.308 arquivos unitários (`*.test.ts(x)`) · 567 specs E2E (`e2e/**/*.spec.ts`) |
| `package.json` | 265 scripts npm |
| Documentação | 411 `.md` em `docs/` · 18 planos em `docs/plans/` · 15 retratos em `docs/estado/` |
| GitHub | 19 issues abertas · 3 PRs abertos (#2120, #2121, #2123) |

### 2.3 Frentes de auditoria

A análise foi dividida em 11 frentes independentes (executadas por agentes em paralelo, em rodadas sucessivas; cada item foi conferido no código), cada uma com fontes próprias e verificação contra o
código. Cada frente virou um anexo (as seções internas de cada anexo mantêm a numeração original 3–13):

| Anexo | Frente | Fontes principais |
|---|---|---|
| [A01](auditoria-planejado-nao-executado-2026-10-11/A01_roadmap_produto.md) | Roadmap de produto e funcionalidades de negócio | `05_ROADMAP`, `FUNCIONALIDADES_E_FERRAMENTAS`, `README`, `docs/estado/12` e `14` (revalidação) |
| [A02](auditoria-planejado-nao-executado-2026-10-11/A02_features_adr_handoffs.md) | Docs de feature, ADRs, arquitetura, handoffs | `docs/adr/`, `ADR_*`, auth/SSO, notificações, RBAC, promo-champions, plano 20 etapas (#264) |
| [A03](auditoria-planejado-nao-executado-2026-10-11/A03_kit_maker_plano_200.md) | Kit Maker — plano mestre 200 etapas | `KIT_MAKER_PLANO_200_ETAPAS_2000_SUBETAPAS_2026-09-10` |
| [A04](auditoria-planejado-nao-executado-2026-10-11/A04_kit_maker_planos_secundarios.md) | Kit Maker — corretivo 100, melhorias 100, finalização 20, correções 50 | `docs/plans/KIT_MAKER_*` |
| [A05](auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md) | Magazine, Mockup, Magic Up, IA | `MAGAZINE_*`, `PLANO_MOCKUP_50_ETAPAS_2026-10-08`, ADR Mockup×Magic Up |
| [A06](auditoria-planejado-nao-executado-2026-10-11/A06_banco_dba.md) | Banco de dados / DBA / migrations | `PLANO_DBA_50`, reconciliação 50×2, `E08–E49`, `docs/db/`, `medallion/` |
| [A07](auditoria-planejado-nao-executado-2026-10-11/A07_integracoes_infra.md) | Integrações, fornecedores, edge functions, infra | ADRs de contrato, `docs/suppliers/`, bridge REST, VPS, DR, observabilidade |
| [A08](auditoria-planejado-nao-executado-2026-10-11/A08_ci_engenharia.md) | CI/CD e engenharia de plataforma | `PLANO_WORKFLOWS_CI_100`, `ENGENHARIA_SENIOR_50`, `MELHORIAS_50 (09-13)`, padrão E12 |
| [A09](auditoria-planejado-nao-executado-2026-10-11/A09_planos_consolidacao.md) | Planos gerais e consolidação de auditorias | `AUDITORIA_20DIM`, `JEV_100`, `CONSOLIDACAO_100`, `PENDENCIAS_50`, `CHECKLIST_100` |
| [A10](auditoria-planejado-nao-executado-2026-10-11/A10_varredura_codigo.md) | Varredura do código | TODO/FIXME/stub, UI "em breve", rotas×menu, flags, órfãos, RPC/edge inexistentes, testes pulados |
| [A11](auditoria-planejado-nao-executado-2026-10-11/A11_auditorias_bugs_issues.md) | Auditorias, bugs, incidentes, segurança, issues | relatórios de maio–setembro, `docs/hardening/`, `docs/security/`, issues abertas |

### 2.4 Legenda de classificação

| Rótulo | Significado |
|---|---|
| ❌ NÃO INICIADO | Planejado; nenhum vestígio no código executável |
| 🟨 PARCIAL | Existe algo real, mas incompleto (backend sem UI, UI sem backend, sem rota, mock, stub, flag desligada, sem teste exigido) |
| 🟦 ÓRFÃO | Código pronto, mas inalcançável: sem rota/menu, sem consumidor fora de testes, script não ligado a workflow |
| ⬛ ABANDONADO/REMOVIDO | Foi construído e depois removido/desligado — a promessa original não está cumprida |
| ⚠️ NÃO VERIFICÁVEL | Depende de estado de produção/infra externa que esta auditoria não consultou |
| ✅ CONCLUÍDO | Cumprido com evidência no código — só contado, não detalhado |

Esforço: **P** (≤ 1 dia) · **M** (2–5 dias) · **G** (> 1 semana ou exige decisão/DDL em produção).

### 2.5 Limitações

- Clone raso (50 commits): histórico anterior não foi usado como evidência de autoria/data.
- Leituras da API do GitHub (alertas, rulesets, runs) foram feitas em 2026-10-11/12; algumas rotas responderam 403 (branch protection, Dependabot) e ficaram ⚠️.
- Contagens de "código órfão" usam busca estática (`rg`); referência dinâmica por string pode gerar falso positivo — os itens estão marcados como candidatos.
- Banco de produção, secrets, branch protection, N8N, VPS e Vercel não foram consultados (somente leitura do repo).
- PRs abertos (#2120, #2121, #2123) **não** contam como entregue.
- Algumas frentes cobrem planos com centenas de etapas; quando uma etapa depende só de produção, foi marcada ⚠️ em vez de presumida.

---

## 3. Placar por frente de auditoria

Linhas de tabela em aberto em cada anexo (uma linha pode agrupar etapas com o mesmo estado e a mesma evidência).

| Anexo | Frente | Linhas em aberto | ❌ | 🟨 | 🟦 | ⬛ | ⚠️ |
|---|---|---|---|---|---|---|---|
| [A01](auditoria-planejado-nao-executado-2026-10-11/A01_roadmap_produto.md) | Roadmap de produto e funcionalidades de negócio | 67 | 11 | 32 | 10 | 9 | 5 |
| [A02](auditoria-planejado-nao-executado-2026-10-11/A02_features_adr_handoffs.md) | Docs de feature, ADRs, arquitetura e handoffs | 86 | 25 | 28 | 4 | 8 | 21 |
| [A03](auditoria-planejado-nao-executado-2026-10-11/A03_kit_maker_plano_200.md) | Kit Maker — plano mestre de 200 etapas | 144 | 20 | 110 | 1 | 0 | 13 |
| [A04](auditoria-planejado-nao-executado-2026-10-11/A04_kit_maker_planos_secundarios.md) | Kit Maker — correções, finalização, melhorias, corretivo | 154 | 49 | 94 | 1 | 0 | 10 |
| [A05](auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md) | Magazine, Mockup, Magic Up e IA | 152 | 76 | 46 | 14 | 2 | 14 |
| [A06](auditoria-planejado-nao-executado-2026-10-11/A06_banco_dba.md) | Banco de dados, DBA e migrations | 87 | 23 | 51 | 3 | 2 | 8 |
| [A07](auditoria-planejado-nao-executado-2026-10-11/A07_integracoes_infra.md) | Integrações, fornecedores, edge functions e infra | 80 | 20 | 24 | 7 | 12 | 17 |
| [A08](auditoria-planejado-nao-executado-2026-10-11/A08_ci_engenharia.md) | CI/CD e engenharia de plataforma | 132 | 65 | 61 | 3 | 1 | 2 |
| [A09](auditoria-planejado-nao-executado-2026-10-11/A09_planos_consolidacao.md) | Planos gerais e consolidação de auditorias | 231 | 142 | 76 | 2 | 1 | 10 |
| [A10](auditoria-planejado-nao-executado-2026-10-11/A10_varredura_codigo.md) | Varredura do código | 67 | 9 | 17 | 17 | 14 | 10 |
| [A11](auditoria-planejado-nao-executado-2026-10-11/A11_auditorias_bugs_issues.md) | Auditorias, bugs, incidentes, segurança e issues | 58 | 19 | 24 | 0 | 0 | 15 |
| | **Total** | **1.258** | **459** | **563** | **62** | **49** | **125** |

A08 inclui ainda 12 linhas de inventário de segredos sem classificação (§10.5 do anexo).

## 4. Placar por plano

| Plano (data) | Etapas | ✅ concluídas | % | Onde |
|---|---|---|---|---|
| Plano de 20 etapas (2026-05-23, issue #264) | 20 | 19 | 95% | A02 §4.8 |
| Checklist de 100 etapas (2026-08-26) | 100 | 42 | 42% | A09 §11.5 |
| Auditoria exaustiva (2026-08-26) | 24 achados | 8 | 33% | A09 §11.5 |
| Pendências 50 (2026-08-29) | 50 | 0 | 0% | A09 §11.4 |
| Kit Maker — plano mestre 200 (2026-09-10) | 200 | 50 | 25% | A03 |
| Kit Maker — corretivo 100 (2026-09-11) | 100 | 49 | 49% | A04 §6.4 |
| Melhorias e Correções 50 (2026-09-13) | 50 | 17 | 34% | A08 §10.3 |
| Reconciliação Local×GitHub×Supabase (2026-09-15) | 50 | 15 | 30% | A06 §8.2 |
| DBA — Correções e Melhorias 50 (2026-09-16) | 50 | 18 | 36% | A06 §8.1 |
| Engenharia Sênior 50 (2026-09-17) | 50 | 16 | 32% | A08 §10.2 |
| Kit Maker — melhorias 100 (2026-09-22) | 100 | 47 | 47% | A04 §6.3 |
| Reconciliação R22 (2026-09-22) | 50 | 10 | 20% | A06 §8.2 |
| Kit Maker — finalização 20 (2026-09-23) | 20 | 6 | 30% | A04 §6.2 |
| Consolidação de auditorias 100 (2026-09-24) | 100 | 14 | 14% | A09 §11.3 |
| Workflows/CI 100 (2026-09-26) | 100 | 38 | 38% | A08 §10.1 |
| Kit Maker — correções 50 (2026-09-27) | 50 | 0 | 0% | A04 §6.1 |
| JEV 100 (v2, 2026-09-28) — parado por decisão do PO | 43 | 1 | 2% | A09 §11.2 |
| Magazine — correções e melhorias 50 (2026-09-09; auditoria 28/09) | 50 | 23 | 46% | A05 §7.3 |
| Auditoria 20/22 dimensões (2026-10-02) | 81 ações | 21 | 26% | A09 §11.1 |
| Mockup 50 + adendo Codex (2026-10-08) | 99 | 15 | 15% | A05 §7.1 |
| **Total** | **1.387** | **409** | **29%** | |

Fora desses planos, o módulo Magazine, as migrações do Magazine, o Magic Up e as demais ferramentas de IA somam 79 itens, 38 deles concluídos (A05 §7.2, §7.4–7.6).

**Leitura:** nenhum plano de setembro passou de 50%. O padrão é sempre o mesmo: o código avança, mas a
etapa não fecha porque falta **teste real (E2E autenticado, banco efêmero), aplicação em produção (migration
aprovada e não aplicada) ou aceite do PO**. Cada novo plano reabre os mesmos itens (§6).

## 5. Matriz de prioridades consolidada

Deduplicada entre frentes. **P0** = risco de segurança, dado de cliente ou dinheiro, agora. **P1** = funcionalidade
prometida que não funciona ou bloqueio de entrega. **P2** = governança e dívida técnica.

### P0 — agir esta semana

| # | Item | Efeito no negócio | Anexo / IDs | Depende de |
|---|---|---|---|---|
| 1 | Rotacionar a credencial de produção versionada no repositório e passar a lê-la do ambiente | Encerra o acesso total ao banco por quem tiver o código | A05 MK-008 | PO (janela de rotação; atualizar N8N, edge functions e scripts) |
| 2 | Tirar do ar ou proteger as funções de teste publicadas em produção | Impede criação de dados falsos em produção | A07 IN-003/004 | Nenhum (código + deploy pelo workflow oficial) |
| 3 | Aplicar `20261008230000` (já aprovada) e as demais migrations prontas `20260928212000/213000` | Fecha o acesso sem login a dados de aprovação de mockup | A06 DB-050 | Disparo do `db-apply-migration.yml` (E15) |
| 4 | Promover e aplicar o contrato RPC-only do Magazine | Restringe a escrita na revista ao que foi planejado | A05 MR-001 | PO (REGRA #8) |
| 5 | Registrar e encerrar a rotação das credenciais vazadas | Fecha incidentes abertos há 5–6 meses | A11 AQ-013, AQ-050 · A07 IN-072 | Acesso aos painéis |
| 6 | Decidir repositório privado vs. público e religar `fail-on: high` no CodeQL; exigir aprovação na `main` | Fecha a porta por onde vazaram as chaves | A08 E53, E94–E96 | PO |
| 7 | Decidir e aplicar os Pacotes de Aprovação #1/#2 (inclui `mcp_kv_get`) e o `REVOKE` de `zapp_catalog_stats` | Correções críticas de acesso escritas em setembro e paradas | A08 §10.2 · A06 DB-068 · A11 AQ-018 | PO + E15 |
| 8 | Kit Maker: bloquear orçamento com personalização sem preço; revalidar preço e pedido mínimo no servidor | Evita vender gravação a R$ 0 ou abaixo do mínimo | A03 KM2-117/119/133/135/139/146 · A04 KMC-084 | Nenhum para o bloqueio; PO para regra de mínimo |
| 9 | Comprovar backup/PITR e fazer um exercício de restore | Sem isso, um erro grave em produção pode não ter volta | A07 IN-069 · A09 PCB-015/060 | Acesso ao painel |

### P1 — próximas 2 a 4 semanas

| # | Item | Efeito no negócio | Anexo / IDs |
|---|---|---|---|
| 10 | Criar o usuário E2E de CI (secrets válidos) e ligar `E2E_*` em todos os workflows | Destrava o único check obrigatório da `main` e os E2E do Kit Maker, Magazine e Mockup | A08 10.0 · A04 KMF-001 · A05 ME-047 · PR #2121 |
| 11 | Corrigir ou remover os links públicos de coleção/comparação/favoritos | O cliente para de receber link que não abre | A01 RP-030 |
| 12 | Corrigir os crons que chamam funções inexistentes e subir as 17.709 fotos da XBZ | Catálogo com fotos completas | A07 IN-001/002 |
| 13 | Marcar a origem ou remover os dados simulados (selos, BI Cliente 360, sazonalidade, `Math.random`) | O vendedor para de apresentar número inventado ao cliente | A01 RP-021/042–044 · A05 IA-002/003 |
| 14 | Kit Maker: peso real da caixa (`maxWeight`), `weight_g = 0` como desconhecido, posição/escala da arte, filtro "Publicados" | Frete e mockup corretos; biblioteca confiável | A03 KM2-099/124 · A04 KMM-075 · A09 PC-110 |
| 15 | Levar as áreas de gravação ao pipeline de importação | Libera personalização para ~4 mil produtos | A02 FD-164 |
| 16 | Disparar os relatórios agendados e as 12 funções sem gatilho (ou retirar a opção da tela) | O usuário para de agendar algo que nunca chega | A01 RP-038 · A10 CD-060 |
| 17 | Montar o painel de ruptura de estoque (EMA) já pronto em `/estoque` | Compra antecipada de itens em risco de faltar | A10 CD-042 |
| 18 | Ligar a anonimização LGPD a um fluxo real | Cumprimento do direito ao esquecimento | A10 CD-058 |
| 19 | Decidir o destino do Bitrix (espelho local, API direta ou outro CRM) e alinhar `bitrix-sync` | Para de gravar em tabelas inexistentes | A07 IN-042 · A01 RP-016 |
| 20 | Baselines visuais dos fluxos críticos e aceite do PO do Kit Maker/Magazine | Mudança do Lovable deixa de desfigurar telas sem alarme | A08 E43–E47 · A03/A04 · A05 ME-048 |

### P2 — governança e dívida

| # | Item | Anexo / IDs |
|---|---|---|
| 21 | Classificar as 144 migrations "indeterminadas" e decidir os 121 arquivos com prefixo duplicado | A06 DB-046/047 · A09 PCB-072 |
| 22 | Versionar DDL e crons do Magazine e do pipeline de estoque; versionar workflows do N8N | A05 MG-001/005 · A07 IN-033/035 |
| 23 | Decidir JEV (Blocos 1–2) e aplicar o Bloco 0 (vínculos de 522 e 489 produtos) | A09 PC-061/062 |
| 24 | Remover ou ligar o código órfão (165 arquivos, ~23 mil linhas de funcionalidade) e as 10 flags decorativas | A10 CD-035/042–053 |
| 25 | Ligar ao CI as guardas já escritas (`check:schema-reference-drift`, `check:public-views-drift`, quarentena de flaky) | A06 DB-052 · A08 E51 |
| 26 | Lockfile único, atualização da toolchain, redução de scripts npm e de arquivos > 600 linhas | A08 §10.3 · A09 PCB-069 |
| 27 | Inventariar os 25 segredos/variáveis usados nos workflows e não documentados | A08 §10.5 |
| 28 | Fechar a issue #264 (plano de 20 etapas está 19/20) e atualizar os docs da §8 | A02 FD-125 |

## 6. Dívida crônica — o que reaparece plano após plano

| Tema | Planos em que aparece sem fechar | Desde | Anexo |
|---|---|---|---|
| Usuário/conta de teste com JWT para E2E | Kit Maker 09-10, 09-11, 09-22, 09-23, 09-27 · Consolidação 09-24 · CI 09-26 · Magazine 09-09 | 2026-09-09 | A04 §6.5 · A09 §11.7 |
| E2E autenticado dos fluxos completos (kit, revista, orçamento) | 5 planos do Kit Maker · Magazine · Pendências 08-29 | 2026-08-29 | A04 §6.5 |
| Referências visuais congeladas, baselines e aceite do PO | 5 planos do Kit Maker · Magazine · Checklist 08-26 · CI 09-26 | 2026-08-26 | A04 §6.5 · A08 |
| Migrations aprovadas e não aplicadas | DBA 09-16 · Reconciliação 09-15/09-22 · Eng. Sênior 09-17 · JEV 09-28 · Mockup 10-08 | 2026-09-15 | A06 · A08 |
| Lockfile duplo (`bun.lock` + `package-lock.json`) | 8 documentos | 2026-08-26 | A09 PCB-069 |
| `types.ts` gigante (cresceu para 64.733 linhas) | Melhorias 09-13 · 20DIM · Pendências | 2026-08-29 | A09 PCB-073 |
| Baselines espalhados (17 arquivos na raiz) | Melhorias 09-13 · Checklist 08-26 | 2026-08-26 | A09 PCB-071 |
| Nomes de migration fora do padrão (68) e prefixos repetidos | Melhorias 09-13 · Reconciliação 09-15 · DBA 09-16 | 2026-09-13 | A06 · A09 |
| Fallback para o banco de produção em workflows de teste | ADR 08-26 · Pendências · 20DIM | 2026-08-26 | A02 FD-023 · A09 PCB-076 |
| Staging inexistente | Pendências 08-29 · Simulações 08-26 · Consolidação 09-24 | 2026-08-26 | A09 PCB-034 |

## 7. Decisões pendentes do PO que travam execução

| Decisão | O que destrava | Anexo |
|---|---|---|
| Janela de rotação da credencial de produção | P0 #1 | A05 MK-008 |
| Repositório privado ou público; aprovação obrigatória na `main` | P0 #6 | A08 E53/E95 |
| Pacotes de Aprovação #1/#2 e migrations prontas (Magazine RPC-only, JEV Bloco 0, `zapp_catalog_stats`) | P0 #3, #4, #7 · P2 #23 | A06 · A08 · A09 |
| Kit Maker D1–D8: dados de embalagem (acabamento, fechamento, peso), templates curados (0 ativos), frete real, PDF, selos comerciais, significado de "publicado", **conta de teste (D8, a que mais destrava)** | Fechamento do Kit Maker | A04 §6.5 · A03 5.21 |
| Mockup D1/D2: cliente obrigatório no timbrado? Pantone em uso? | Gerador de mockup | A05 MK-099 |
| Bitrix: espelho local, API direta ou outro CRM | P1 #19 | A07 IN-042 |
| ADRs aguardando aceite: retenção do `webhook-inbound`, `fn_ema_pipeline_health`, `simulation-orchestrator`, canário de login, deleção do bridge, `stock_notes`, `e2e_cleanup_audit` | Observabilidade e limpeza | A07 §9.6 · A09 PCB-021…029 |
| Donos por domínio (CODEOWNERS com 13 de 14 domínios "TBD") e protocolo multiagente em rascunho desde 29/08 | Revisão obrigatória por área | A02 FD-154/155 · A09 PCB-001…005 |

## 8. Documentos desatualizados que induzem erro

| Documento | Problema | Anexo |
|---|---|---|
| `CLAUDE.md` | Tabela de gates não lista 1.9–1.13 nem `secrets-check`; cita `envPointsToForbidden`, função que não existe | A08 §10.6 |
| `docs/adr/0001-ssot-external-db.md` | Segue "Accepted", mas o bridge foi desligado (410) | A02 FD-001 |
| `medallion/README.md` | Manda executar `fn_silver_to_gold`; a camada Silver foi removida em 16/07 | A07 §9.8 |
| `docs/MAGAZINE_MODULE.md` e planos de migração do Magazine | Descrevem estado anterior ao HEAD | A05 MG-009, MR-002/003/005 |
| `docs/QUOTE_NUMBERING.md` | Lista como lacunas UNIQUE e lock que já existem | A02 §4.6 |
| `docs/PLANO-20-ETAPAS-2026-05-23.md` | Diz 11/20; o código está em 19/20 | A02 FD-125 |
| `docs/RBAC_MATRIX.md` | 108 funções contra 110 reais; cobre 47 de 133 rotas | A02 FD-082 · A10 CD-029 |
| `docs/plans/MATRIZ_PLANOS_2026-09.md` | Vários estados errados (E08, E10, E22, E24, E25, E49) | A08 §10.3 |
| `docs/design-system-audit-2026-05-25.md` | Declara "15/15 corrigido"; três correções foram revertidas | A02 FD-066–068 |
| `graphify-out/GRAPH_REPORT.md` | Construído a partir de commit que não existe neste clone; sem `graph.json`/`wiki` | A08 §10.6 |
| Referências a arquivos inexistentes | `docs/SUPABASE_CONNECTION.md`, `deploy-failure-alert.yml`, `gate.py` da fábrica VPS | A07 IN-071/076/080 |

## 9. Índice dos anexos

| Anexo | Conteúdo | IDs |
|---|---|---|
| [A01 — Roadmap de produto](auditoria-planejado-nao-executado-2026-10-11/A01_roadmap_produto.md) | Orçamentos, pedidos, pagamentos, CRM, metas, multi-tenant, catálogo, BI, notificações, mobile; delta contra o retrato de 2026-08-16 | RP-001…070 |
| [A02 — Docs de feature e ADRs](auditoria-planejado-nao-executado-2026-10-11/A02_features_adr_handoffs.md) | ADRs, autenticação/SSO, notificações, design system, RBAC, Promo Champions, plano de 20 etapas, handoffs, validações | FD-001…177 |
| [A03 — Kit Maker, plano de 200 etapas](auditoria-planejado-nao-executado-2026-10-11/A03_kit_maker_plano_200.md) | 20 áreas × 10 etapas | KM2-001…200 |
| [A04 — Kit Maker, demais planos](auditoria-planejado-nao-executado-2026-10-11/A04_kit_maker_planos_secundarios.md) | Correções 50, finalização 20, melhorias 100, corretivo 100; dívida crônica | KMX, KMF, KMM, KMC |
| [A05 — Magazine, Mockup, Magic Up, IA](auditoria-planejado-nao-executado-2026-10-11/A05_magazine_mockup_ia.md) | Plano de Mockup de 08/10, módulo e plano do Magazine, migrações, Magic Up, ferramentas de IA | MK, MG, ME, MR, MU, IA |
| [A06 — Banco de dados](auditoria-planejado-nao-executado-2026-10-11/A06_banco_dba.md) | Plano DBA, reconciliações, docs E08–E49, pacotes de aprovação, propostas SQL, Medallion, faxina | DB-001…087 |
| [A07 — Integrações e infra](auditoria-planejado-nao-executado-2026-10-11/A07_integracoes_infra.md) | Edge functions, fornecedores, Bitrix, N8N, bridge REST, observabilidade, deploy, DR | IN-001…080 |
| [A08 — CI/CD e engenharia](auditoria-planejado-nao-executado-2026-10-11/A08_ci_engenharia.md) | Plano de workflows 100, engenharia sênior 50, melhorias 50, padrão E12, segredos | CI-001… |
| [A09 — Planos gerais](auditoria-planejado-nao-executado-2026-10-11/A09_planos_consolidacao.md) | Auditoria 20DIM, JEV, consolidação 100, pendências 50, checklist 100, simulações, dívida crônica | PC-001…149, PCB-001…082 |
| [A10 — Varredura do código](auditoria-planejado-nao-executado-2026-10-11/A10_varredura_codigo.md) | Marcadores, UI que promete e não entrega, rotas, flags, órfãos, tabelas/RPCs, testes pulados, env vars | CD-001…067 |
| [A11 — Auditorias, bugs e issues](auditoria-planejado-nao-executado-2026-10-11/A11_auditorias_bugs_issues.md) | Issues abertas, segurança, bugs, QA, performance, incidentes, auditorias de maio a setembro | AQ-001…058 |

**Como manter este documento vivo:** ele não se atualiza sozinho. Ao fechar um item, cite o ID (ex.: `A07 IN-003`)
na descrição da PR; ao reauditar, rode a mesma verificação descrita na linha do item e atualize a classificação
com a nova evidência, nunca com opinião.
