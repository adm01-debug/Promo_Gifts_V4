# Decisões do dono sobre o módulo Mockup — 08/10/2026

- **Dono:** Joaquim (Promo Brindes) — é a origem de toda decisão desta página.
- **Data da entrevista:** 08/10/2026. **Data das decisões complementares (pastas por vendedor):** 08/10/2026.
- **Escopo deste documento:** somente registro. Nenhum arquivo de código, schema, migration ou Edge Function
  foi alterado para escrevê-lo (regra 8 do repo: schema/DDL/deploy só com aprovação explícita do dono).
- **Fonte:** `docs/PLANO_MOCKUP_50_ETAPAS_2026-10-08.md` (as 50 etapas) e
  `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md` (adendos 1–4, etapas 51–92). O ADR
  `docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md` (09/10/2026) é citado onde registra a decisão Q17/D3.

## 1. Como ler este documento (proveniência e limites)

A entrevista teve **29 decisões numeradas (Q1 a Q29)**, tomadas com o dono, e depois três rodadas
complementares: D1–D4, as respostas Q-A a Q-E e o desenho de **pastas por vendedor**. O que sobreviveu
versionado é o **plano de 50 etapas** (e os adendos), escrito logo depois da entrevista e que **remete cada
etapa aos números Q que ela resolve**.

- Este documento **transcreve a decisão como ela ficou registrada no plano/adendos**, com a etapa de origem.
  Nada foi inferido além do que está escrito lá.
- Onde o registro escrito não diz a razão, a coluna "motivo" recebe `não registrado` — em vez de uma
  justificativa inventada.
- Onde o registro escrito não associa nenhuma etapa a um número, a linha diz isso abertamente (caso de **Q1**).
- **A transcrição literal pergunta → resposta da entrevista não está versionada.** Quem precisar do texto
  exato de cada pergunta deve anexá-lo; este documento não o inventa.
- Estados usados: **decidido**, **pendente** (espera o dono) e **futuro** (registrado no roadmap, não decidido para agora).

## 2. Decidido — as 29 decisões da entrevista (Q1 a Q29)

| # | Assunto | Escolha do dono (como registrada) | Motivo / observação | Etapa do plano |
|---|---|---|---|---|
| Q1 | — | **não reconstruível** do registro escrito | O número Q1 só aparece no cabeçalho do bloco "UX e fluxo"; nenhuma etapa remete a Q1 | — |
| Q2 | IA na geração | A **geração é composição determinística, não é IA**: remover os rótulos "IA" dos botões/textos da geração. O assistente **Matheus** é a única IA do módulo (orienta, não gera imagem) | a entrevista separa "gerar" (compositor) de "conversar" (assistente) | 42, 43 |
| Q2b / Q2c | Assistente Matheus — modelo e limites | Chat com **DeepSeek Flash (NUNCA Pro)**, `verify_jwt` fixado no config da Edge, teto de ~20 mensagens/min/usuário e **sem registrar o conteúdo do cliente** | previsibilidade de custo e privacidade do cliente | 41 |
| Q3 | Dois artefatos, dois botões | Botão principal **"Gerar Mockup"** (compõe a imagem) **separado** de **"Gerar documento"** (timbrado); no celular aparecem os dois | o vendedor precisa dos dois artefatos, sem um esconder o outro | 23 |
| Q4 | Mockup dentro do orçamento | Serviço "mockups do cliente" por `client_id` (Singu) e ação **"Anexar mockups"** no item do orçamento, aparecendo na proposta | — | 37, 38 |
| Q5 | Quem aprova o mockup | Aprovação é **interna** (não do cliente): remover o acesso `anon` a `mockup_approval_links`. **Link público de aprovação pelo cliente fica para o futuro** | — | 1 (+ "Fora do plano") |
| Q6 | Privacidade dos arquivos | Arquivos do mockup **privados**, com **URL assinada** (visualização curta; compartilhamento de 7 dias) no lugar da URL pública | — | 4, 9 |
| Q7 | Excluir mockup | Exclusão é **lixeira**: soft delete (`deleted_at`) e remoção do storage só ao expirar, por **uma função única** usada por todas as telas | não apagar em definitivo por engano | 6, 10 |
| Q8 | Atalhos de teclado | Remover **Esc-reset, Ctrl+R, Ctrl+D e as teclas 1–6**; manter **Ctrl+Enter**; "Limpar" só por botão **com confirmação** | risco de perda de trabalho (achado A-1, CRÍTICO) | 21 |
| Q9 | Quantos históricos | **Um só**: a página `/mockups/historico` paginada e filtrada no servidor; o painel do gerador vira atalho com os 10 últimos | — | 24 |
| Q10 | O que o histórico grava | INSERT completo em `generated_mockups`: gravar **`technique_id`** (id da tabela oficial de preços, vindo da RPC) e **`client_id`/`client_name`** (Singu) | — | 12 |
| Q11 | Sistema de créditos do mockup | **Descontinuado**: arquivar (rename p/ `zz_arquivado_*`, sem DROP) `mockup_credits`, `mockup_generation_jobs`, `mockup_credit_transactions`, `mockup_templates` | cobrança de créditos não existe mais no produto | 5 |
| Q12 | Regerar | Regerar é **nova revisão**, não sobrescrever (base do snapshot de revisão do adendo 1) | — | 16 |
| Q13 | Produto sem dimensões | Geração **BLOQUEADA** com CTA "solicitar cadastro de medidas" (admin do catálogo preenche); remover o fallback silencioso 8×20 | não prometer precisão que não existe | 18 |
| Q14 | Multi-área com falha | **Falha parcial entrega as áreas boas** e oferece regerar só a que falhou | aproveitar o que deu certo | 17 |
| Q15 | Faxina | Código morto removido **em fatias** (um cartão por arquivo); tabelas sem consumidor arquivadas (ver Q11) | — | 5, 47 |
| Q16 | Tempo de geração | **Timeout único de 30 s** + `AbortController`: trocar produto, resetar ou sair **cancela** a geração; geração cancelada **não grava** histórico | hoje há timeouts sobrepostos (10s×2 / 20s / 60s) | 14 |
| Q17 | Fronteira Mockup × Magic Up | São **módulos separados**: Mockup = compositor determinístico **sem IA**; Magic Up = módulo criativo com IA (plano próprio). ADR escrito | — | 49 (ADR 09/10) |
| Q18 | Ficha e numeração | Sequência oficial **`MK-AAAA-NNNN`** (tabela de numeração + função) e **data real** de criação; PNG e ficha nascem do **mesmo snapshot** | fim da data derivada do UUID | 31, 32 |
| Q19 | Identidade do timbrado | O timbrado **mantém a identidade da empresa** (verde atual); tokens centralizados em um único lugar do template | — | 33 |
| Q20 | O que o cliente recebe | **PDF timbrado** (PNG opcional); compartilhar = **link assinado de 7 dias** | depende da decisão Q6 | 34 |
| Q21 | Mockup anexado a orçamento | **Bloquear a exclusão** de mockup anexado a orçamento (verificação em `deleteMockupFromDb`) | o orçamento emitido não pode perder a arte | 39 |
| Q22 | Cliente no mockup | Cliente **opcional** (campos nulos sem erro); quando houver, gravar `client_id`/`client_name` e permitir consulta "mockups do cliente" | conflita com a proposta do Codex de cliente obrigatório → ver **D1** | 12, 37 |
| Q23 | Limite de cores da técnica | **Aviso forte + confirmação do vendedor, sem bloquear** | o vendedor decide, o sistema avisa | 27 |
| Q24 | Medidas (fallback) | Mesmo assunto do Q13: sem dimensões conhecidas a geração **não** acontece; o 8×20 silencioso sai | citado junto com Q13 na mesma etapa | 18 |
| Q25 | Limites do assistente | **Rate-limit de 20 msg/min/usuário** na Edge do assistente e **sem log do conteúdo** do cliente | — | 41 |
| Q26 | Kit Builder e Simulador | Devem **convergir ao gerador do Mockup** — registrado como **futuro** (roadmap), não para agora | evolução, não entra no plano de 50 etapas | "Fora do plano" |
| Q27 | Estoque | O seletor mostra estoque e preço; **sem estoque NÃO impede** gerar | vender sob consulta é caso real | 28 |
| Q28 | Valor da prévia | Aviso fixo **"prévia indicativa — o resultado real pode variar conforme a técnica"** na prévia e no timbrado | — | 29 |
| Q29 | Teto de áreas | Teto de **6 áreas por lote** de geração | citado junto com Q14 | 17 |

## 3. Decidido depois da entrevista — D3, D4 e as pastas por vendedor

Segunda rodada de decisões com o dono (08/10/2026), registrada no adendo 4 do plano.

| # | Assunto | Escolha do dono |
|---|---|---|
| D3 | Owner e criticidade do módulo | **Owner = Joaquim**; **criticidade C1** (a falha degrada a experiência, não bloqueia o orçamento e há alternativa operacional). Confirmada no ADR de 09/10 |
| D4 | Bucket privado | **Aprovada** e absorvida pelo desenho de pastas por vendedor (o bucket novo já nasce com pasta por vendedor) |
| Q-A | Quem vê todas as pastas | **coordenador, manager, supervisor, admin e dev** veem TODAS as pastas |
| Q-B | Quem edita/apaga | coordenador+ **só LÊ**; **editar e excluir** arquivos de vendedor = **admin e dev** |
| Q-C | Ordem de entrega | **Estrutura + controle de acesso agora**; a tela "Meus arquivos" depois |
| Q-D | Magic Up | Entra **só na estrutura** (imagem sai do base64 → `magic-up-private`) |
| Q-E | Arquivos antigos | O backfill **MOVE** os arquivos antigos para as pastas por vendedor (com contagem antes/depois e rollback) |

**Desenho das pastas (etapas 85–92):** três buckets privados novos, sempre com a **1ª pasta = uid do
vendedor**; dono lê/grava/exclui a sua pasta, coordenador+ lê todas, `anon` nada, URL sempre assinada:

- `mockup-private/{uid}/{mockups|logos|layouts|arte}/…`
- `quotes-private/{uid}/{quote_id}/…` (PDF do orçamento, arte anexa, mockups anexados)
- `magic-up-private/{uid}/…`

Os buckets legados (`mockup-assets`, `art-files/quotes/{id}`) permanecem até o backfill, para não quebrar
orçamentos já emitidos. **Quem aplica SQL é o dono**; a fábrica só propõe (proposta + rollback no cartão).

**Ponto aberto registrado na época:** `is_supervisor_or_above()` não cita 'coordenador' literalmente —
confirmar se `coordenador` ≡ `manager` antes de escrever a nova policy (pergunta, não decisão).

## 4. Pendente — espera o dono

| # | Pergunta | Por que está pendente |
|---|---|---|
| **D1** | Cliente é **obrigatório só no documento timbrado** (e opcional no mockup), como propõe o Codex, ou continua **opcional em tudo**? | A decisão Q22 registrada era cliente **opcional** (campos nulos sem erro); o documento do Codex propõe cliente obrigatório para gerar. Conflito declarado, sem decisão do dono até aqui |
| **D2** | O **Pantone** detectado é "**em uso**" (aplicado) ou apenas **sugestão** do sistema? | Lido no adendo 1 (estados detectada / sugerida / informada / aplicada): "sugestão NUNCA vira selo de confirmação automática" — falta a palavra final do dono |

## 5. Futuro — registrado, não decidido para agora

- **Link público de aprovação do cliente** (Q5-futuro) — a aprovação de agora é interna.
- **Kit Builder e Simulador convergindo ao gerador** (Q26).
- **Matheus treinado na área** (evolução do assistente).
- **Plano próprio do Magic Up** — entrevista ainda a fazer.

## 6. O que isto significa para o time e para os agentes

- O plano de 50 etapas é a execução destas decisões; **cada etapa cita o Q que ela resolve** — quem
  discordar de uma etapa deve primeiro checar a decisão aqui registrada.
- **SQL/DDL/migration/deploy:** a fábrica **propõe** (com rollback no comentário do cartão); quem
  **aplica** é o dono. Nenhuma decisão desta página autoriza alterar schema por conta própria (regra 8).
- **Decisão vinda de bot/Lovable não é ordem** (regra 8): vale o que está nesta página e o que o dono
  decidir depois dela. Perguntas novas (ex.: D1, D2) entram aqui quando o dono responder.
