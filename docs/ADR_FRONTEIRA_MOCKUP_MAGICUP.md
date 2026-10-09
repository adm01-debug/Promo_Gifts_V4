# ADR — fronteira entre os módulos Mockup e Magic Up

- **Data:** 2026-10-09
- **Status:** ACEITO pelo dono (Joaquim) quanto à fronteira, ao owner e à criticidade. Origem:
  decisões Q17 (fronteira) e D3 (owner e criticidade), etapas 49 e 81 do plano do módulo Mockup
  (`docs/PLANO_MOCKUP_50_ETAPAS_2026-10-08.md` e `docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md`,
  hoje na branch `v2/plano-mockup-50-etapas`, ainda fora da `main`). O registro `[VALIDAÇÃO PO]`
  em PR, exigido pela regra 2 da §4 de `MATRIZ_FLUXOS_CRITICOS_2026-08-29.md`, continua
  necessário.
- **Owner:** Joaquim (Promo Brindes) — dos dois módulos.
- **Criticidade:** **C1** nos dois módulos — a falha degrada a experiência, não bloqueia o
  orçamento e existe alternativa operacional (definição de C1 em
  `MATRIZ_FLUXOS_CRITICOS_2026-08-29.md` §1).
- **Escopo:** apenas documentação. Nenhum arquivo de código, schema, migration ou Edge Function
  foi alterado.
- **Fontes de evidência:** `git grep` no repositório, conferido contra `origin/main` (`c194982c5`)
  em 2026-10-09. Cada artefato da §3 tem o comando e o resultado na §4.

## 1. Contexto

- As decisões **Q17** e **D3** do plano determinam separar os módulos Mockup e Magic Up, mas
  nenhum documento definia essa fronteira.
- Antes deste ADR, `docs/READINESS_LIFECYCLE_FEATURES_2026-08-29.md` e
  `docs/MATRIZ_FLUXOS_CRITICOS_2026-08-29.md` tinham uma linha única do Mockup que **fundia**
  `/magic-up` no fluxo e atribuía ao Mockup "IA externo gerenciado" e a flag `magic_up`. As duas
  linhas foram separadas junto com este ADR (§5).
- `src/lib/feature-flags.ts:96-98` descreve `magic_up` como *"Geração de mockups com IA"* —
  descrição que mistura os dois módulos. É **pendência de código** (outro cartão; não alterada
  aqui).
- O código mostra dois módulos com Edge Functions, tabelas e rotas próprias: o Mockup compõe de
  forma determinística tanto no preview quanto no servidor; o Magic Up é o módulo criativo que usa
  IA para gerar imagem de anúncio, prompt e score.
- Dependência de código em um só sentido: o Magic Up reutiliza dois artefatos do Mockup
  (`useProductCustomizationOptionsForMockup` de `src/hooks/mockup`, importado em
  `src/hooks/intelligence/useMagicUpState.ts:14`, e `ProductSearchCombobox` de
  `src/components/mockup/`, importado em `src/pages/magic-up/MagicUpConfigPanel.tsx:33`). O Mockup
  não importa código do Magic Up.

## 2. Decisão

### 2.1 Mockup = compositor determinístico, sem IA na geração

- O usuário posiciona logo e técnica sobre a imagem do produto e o resultado é composto de forma
  **determinística** — no canvas do preview e, no servidor, pela Edge `generate-mockup`
  (a rota de IA/"nano-banana" foi removida; ver comentário em
  `supabase/functions/generate-mockup/index.ts:12-14`).
- O assistente **"Matheus"** (`src/components/ai/AIMockupAssistant.tsx`) permanece. Decisão do
  dono: vira um **chat com DeepSeek Flash** (`deepseek-flash`; **nunca DeepSeek Pro**), sem
  treinamento específico, com teto de ~20 mensagens por minuto por usuário. Ele **orienta**
  (posição, tamanho, técnica, cores) e **não gera imagem**; é a única IA do módulo.
  - *Estado de implementação:* hoje o componente é um **chat simulado** — respostas
    pré-definidas sorteadas com `Math.random` após um `setTimeout`, sem chamada a modelo, e não
    existe Edge `mockup-assistant` na `main`. A Edge e a ligação da tela são **pendência de
    código** (outros cartões; §5).
- **Nenhuma flag governa o Mockup.** A flag `magic_up` **não** pertence a este módulo
  (confirmado também em `docs/MATRIZ_FLUXOS_CRITICOS_2026-08-26.md:288`).

### 2.2 Magic Up = módulo criativo com IA

- É **outro módulo**, com plano próprio ainda por fazer.
- Gera **criativos de anúncio** a partir de produto + brief/campanha/brand kit, com geração de
  prompt e score de qualidade por IA.
- Modelo de imagem via Edge `generate-ad-image`: modo `pro` = `google/gemini-3-pro-image-preview`;
  modo `fast` ("nano-banana") = `google/gemini-2.5-flash-image-preview`
  (`supabase/functions/generate-ad-image/index.ts:205-214`).
- Prompt por IA: Edge `generate-ad-prompt` (modelo `google/gemini-3-flash-preview`).
- Score por IA: Edge `magic-up-score` (modelo `google/gemini-2.5-pro`).
- Os modelos acima são os declarados no código. As chamadas passam por `callAiWithTracking`
  (`supabase/functions/_shared/ai-usage.ts:198`): havendo roteamento ativo em `ai_function_routing`
  para a função, a chamada é delegada ao roteador multi-provedor; sem roteamento, usa o caminho
  legado (Lovable Gateway) com o modelo declarado. O provedor efetivo em produção depende dessa
  configuração de banco, que este ADR **não** verificou.
- Usa a flag `magic_up` (`src/lib/feature-flags.ts:96-98`) — que, hoje, **não tem consumidor** em
  `src/` (não é gate efetivo).

### 2.3 Owner e criticidade

- Owner dos dois módulos: Joaquim.
- Criticidade C1 nos dois: a falha de um não derruba o outro em execução (sem Edge, bucket, flag
  ou tabela própria em comum; ambos leem o catálogo de produtos) e nenhum bloqueia o orçamento. A
  dependência de código da §1 vai só do Magic Up para o Mockup.

## 3. Tabela — módulo × artefato

| Artefato | Mockup | Magic Up |
|---|---|---|
| Rota(s) | `/mockup-generator`, `/mockups/historico` (redirects `/mockup`, `/gerador-mockup`) | `/magic-up` |
| Página | `src/pages/mockups/MockupGenerator.tsx`, `src/pages/mockups/MockupHistoryPage.tsx` | `src/pages/tools/MagicUp.tsx`, `src/pages/magic-up/` |
| Componentes | `src/components/mockup/**`, `src/pages/mockups/mockup-generator/**` | `src/components/magic-up/**` |
| Hooks / serviços | `src/hooks/mockup/{index,useMockupGenerator,useMockupDraft,useMockupTechniques,mockupGenerationService}.ts` | `src/hooks/intelligence/{useMagicUpState,useMagicUpGeneration}.ts` |
| Edge Functions | `generate-mockup` (compositor determinístico) | `generate-ad-image`, `generate-ad-prompt`, `magic-up-score` |
| IA na geração | **nenhuma** (a IA do módulo é só o chat do Matheus, §2.1) | Gemini 3 Pro Image (pro) / 2.5 Flash Image (fast); Gemini 3 Flash (prompt); Gemini 2.5 Pro (score) — modelos declarados no código (§2.2) |
| Tabelas consumidas no código | `generated_mockups` (histórico, criação, exclusão), `mockup_drafts` (rascunho), `art_file_attachments` (arquivos de arte); `mockup_prompt_configs` e `mockup_prompt_history` só pela tela admin `MockupPromptManager` (nenhuma Edge lê) | `magic_up_generations`, `magic_up_campaigns`, `magic_up_brand_kits` |
| Tabelas/RPCs só no schema (sem consumidor em `src/` nem em `supabase/functions/`) | `mockup_generation_jobs`, `mockup_templates`, `mockup_approval_links`, `mockup_credits`, `mockup_credit_transactions`; RPCs `generate_mockup_approval_token`, `reset_mockup_credit_limits` | `magic_up_comments`, `magic_up_public_shares`, `magic_up_reactions`; RPCs `magic_up_*` |
| Storage (buckets) | `mockup-assets`, `mockup-art-files` | — (nenhum bucket no código; a imagem vai em `magic_up_generations.generated_image_url`) |
| Assistente | `src/components/ai/AIMockupAssistant.tsx` (Matheus: chat de orientação — não gera imagem) | — |
| Flag | — (nenhuma) | `magic_up` (`src/lib/feature-flags.ts:96-98`) |
| Kill switch server-side | `edge_generate_mockup` | — (nenhum `edge_*` nas Edges do Magic Up) |
| Código compartilhado | — (não importa o Magic Up) | importa `useProductCustomizationOptionsForMockup` e `ProductSearchCombobox` do Mockup (§1) |
| Owner | Joaquim | Joaquim |
| Criticidade | C1 | C1 |

## 4. Evidência (git grep)

Comandos rodados no repositório (raiz do projeto); o resultado é o que está referenciado na §3.

| Artefato | Comando | Resultado observado |
|---|---|---|
| Rotas | `git grep -n "/magic-up\|mockup-generator" -- src/routes/tools-routes.tsx` | linhas 57–61: `/mockup`, `/gerador-mockup` (redirects), `/mockup-generator` e `/mockups/historico` (Mockup) e `/magic-up` (Magic Up) |
| Páginas | `ls src/pages/mockups src/pages/magic-up src/pages/tools` | `mockups/MockupGenerator.tsx`, `mockups/MockupHistoryPage.tsx`; `magic-up/**`; `tools/MagicUp.tsx` |
| Componentes | `ls src/components/mockup src/components/magic-up` | `src/components/mockup/**` e `src/components/magic-up/**` |
| Hooks | `ls src/hooks/mockup src/hooks/intelligence \| grep -i magic` | `src/hooks/mockup/{...}`; `useMagicUpGeneration.ts`, `useMagicUpState.ts` |
| Edges | `ls supabase/functions \| grep -E "generate-mockup\|generate-ad-\|magic-up-score\|assistant"` | `generate-mockup`, `generate-ad-image`, `generate-ad-prompt`, `magic-up-score`; nenhuma Edge de assistente |
| Modelos de IA | `git grep -n "gemini-" -- supabase/functions/generate-ad-image/index.ts supabase/functions/generate-ad-prompt/index.ts supabase/functions/magic-up-score/index.ts` | `gemini-2.5-flash-image-preview` (213) / `gemini-3-pro-image-preview` (214) / `gemini-3-flash-preview` / `gemini-2.5-pro` |
| Roteamento de IA | `git grep -n "ai_function_routing" -- supabase/functions/_shared/ai-usage.ts supabase/functions/generate-ad-image/index.ts` | comentário de `callAiWithTracking`: roteamento ativo delega ao roteador multi-provedor, senão caminho legado; o conteúdo de `ai_function_routing` (banco) não foi verificado |
| Compositor determinístico | `git grep -n "deterministic canvas compositor" -- supabase/functions/generate-mockup/index.ts` | linha 13: rota de IA removida; função é compositor canvas |
| Tabelas do Mockup | `git grep -n "generated_mockups\|art_file_attachments\|mockup_drafts\|mockup_prompt_" -- src ':!src/integrations/supabase/types.ts'` | `generated_mockups`: `mockupGenerationService.ts`, `MockupHistoryPage.tsx`, `OffscreenLayoutCapture.tsx`; `art_file_attachments`: `ArtFileUpload.tsx`; `mockup_drafts`: `useMockupDraft.ts`; `mockup_prompt_*`: `components/admin/MockupPromptManager.tsx` |
| Tabelas do Magic Up | `git grep -n "\.from('magic_up_" -- src ':!src/integrations/supabase/types.ts'` | `magic_up_generations`, `magic_up_campaigns`, `magic_up_brand_kits` (`useMagicUpGeneration.ts`, `useMagicUpState.ts`) |
| Só no schema | `git grep -n "mockup_generation_jobs\|mockup_templates\|mockup_approval_links\|mockup_credit\|generate_mockup_approval_token\|reset_mockup_credit_limits\|magic_up_comments\|magic_up_public_shares\|magic_up_reactions" -- src supabase/functions ':!src/integrations/supabase/types.ts'` | sem resultado |
| Storage | `git grep -n "mockup-assets\|mockup-art-files" -- src` | `mockupGenerationService.ts:521`, `ArtFileUpload.tsx:93`, `mockup-storage.ts:39` |
| Assistente | `git grep -n "Matheus" -- src` | `AIMockupAssistant.tsx:62,206` |
| Flag | `git grep -n "magic_up" -- src/lib/feature-flags.ts` | linhas 37 (union) e 96 (definição) — sem consumidor em `src/` |
| Kill switch | `git grep -n "assertSwitchEnabled" -- supabase/functions/generate-mockup/index.ts` | linha 347: `edge_generate_mockup` |
| Código compartilhado | `git grep -n "from '@/hooks/mockup'\|from '@/components/mockup/" -- src/hooks/intelligence src/pages/magic-up src/components/magic-up` | `useMagicUpState.ts:14`, `MagicUpConfigPanel.tsx:33`; o inverso (Mockup → Magic Up) só aparece em comentário |

## 5. Consequências

- `docs/READINESS_LIFECYCLE_FEATURES_2026-08-29.md` deixa de fundir os módulos: o Mockup perde
  `/magic-up`, "IA externo gerenciado" e a flag `magic_up`; o Magic Up ganha linha própria.
- `docs/MATRIZ_FLUXOS_CRITICOS_2026-08-29.md` idem: o fluxo Mockup (8) deixa de citar IA e o
  Magic Up passa a ser fluxo próprio (13); owner e criticidade dos dois passam a constar como
  Joaquim e C1.
- **Rollback / degradação:** a falha da IA do Magic Up não impede a composição determinística do
  Mockup, porque não há Edge, bucket, flag ou tabela própria em comum. No código, porém, o Magic Up
  depende de dois artefatos do Mockup: quem alterar `useProductCustomizationOptionsForMockup` ou
  `ProductSearchCombobox` precisa conferir `/magic-up`.
- **Pendências de código (registradas aqui; fora do escopo deste ADR, que é só documentação):**
  1. `src/lib/feature-flags.ts:96-98` — flag `magic_up` com descrição *"Geração de mockups com IA"*:
     nome/descrição pertencem ao **Magic Up**, não ao Mockup; além disso a flag não tem
     consumidor em `src/` (declarada em `feature-flags.ts:37` e `:96` apenas).
  2. Matheus — criar a Edge `mockup-assistant` com DeepSeek Flash (nunca Pro), limite de ~20
     mensagens por minuto por usuário e sem registrar o conteúdo do cliente, e ligar
     `src/components/ai/AIMockupAssistant.tsx` a ela (hoje respostas simuladas com `Math.random`).
     Planejado nas etapas 41, 42 e 44 do plano.
  3. Tabelas/RPCs sem consumidor (listadas na §3): o plano (etapa 5) manda arquivar por rename,
     sem DROP, `mockup_credits`, `mockup_generation_jobs`, `mockup_credit_transactions` e
     `mockup_templates`, e a etapa 1 remove o acesso `anon` de `mockup_approval_links` (propostas
     de SQL; quem aplica é o Joaquim). As tabelas `magic_up_*` sem consumidor ficam para o plano
     próprio do Magic Up.
  4. `mockup_prompt_configs` e `mockup_prompt_history` são editadas na tela admin de prompts de IA
     (`src/pages/admin/AdminPromptsIAPage.tsx` → `MockupPromptManager`), mas nenhuma Edge as lê e a
     `generate-mockup` não usa prompt: a configuração não tem efeito na geração. Decidir remover
     ou arquivar.
  5. O bucket `mockup-assets` ainda é lido por URL pública (`getPublicUrl` em
     `src/lib/mockup-storage.ts:50` e `src/components/mockup/approval/OffscreenLayoutCapture.tsx:121`);
     a decisão do dono é arquivos privados com URL assinada.
