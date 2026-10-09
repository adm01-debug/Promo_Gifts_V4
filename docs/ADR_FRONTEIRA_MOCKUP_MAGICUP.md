# ADR — fronteira entre os módulos Mockup e Magic Up

- **Data:** 2026-10-09
- **Status:** PROPOSTO — decisão registrada pela fábrica a partir das etapas 49 e 81 do plano
  (cartão `t_c987db55`); aguarda `[VALIDAÇÃO PO]`.
- **Owner:** Joaquim (Promo Brindes).
- **Criticidade:** **C1** — falha degrada a experiência, mas existe alternativa operacional:
  os dois módulos são independentes e nenhum bloqueia o outro.
- **Escopo:** apenas documentação. Nenhum arquivo de código, schema, migration ou Edge Function
  foi alterado por este cartão.
- **Fontes de evidência:** `git grep` no repositório — cada artefato da §3 está conferido no
  código e o comando aparece na §4.

## 1. Contexto

- As decisões **Q17** e **D3** do plano (etapas **49** e **81**) determinam separar os módulos
  Mockup e Magic Up, mas nenhum documento definia essa fronteira.
- `docs/READINESS_LIFECYCLE_FEATURES_2026-08-29.md:20` e
  `docs/MATRIZ_FLUXOS_CRITICOS_2026-08-29.md:25` **fundiam** `/magic-up` no fluxo Mockup e
  atribuíam ao Mockup "IA externo gerenciado" e a flag `magic_up`.
- `src/lib/feature-flags.ts:96-98` descreve `magic_up` como *"Geração de mockups com IA"* —
  descrição que mistura os dois módulos. É **pendência de código** (outro cartão; não alterada
  aqui).
- O código mostra que os dois módulos são independentes: o Mockup compõe de forma determinística
  tanto no preview quanto no servidor, enquanto o Magic Up é o módulo criativo que usa IA para
  gerar imagem de anúncio, prompt e score.

## 2. Decisão

### 2.1 Mockup = compositor determinístico, sem IA na geração

- O usuário posiciona logo e técnica sobre a imagem do produto e o resultado é composto de forma
  **determinística** — no canvas do preview e, no servidor, pela Edge `generate-mockup`
  (a rota de IA/"nano-banana" foi removida; ver comentário em
  `supabase/functions/generate-mockup/index.ts:13`).
- O assistente **"Matheus"** (`src/components/ai/AIMockupAssistant.tsx`) é um **chat que orienta**
  o usuário (posição, tamanho, cores, dicas) e **não gera imagem**.
  - *Estado de implementação:* hoje o componente é um **chat simulado** — respostas
    pré-definidas via `setTimeout`, sem chamada a modelo. A escolha/conexão do modelo
    (ex.: DeepSeek Flash) permanece **pendência de código** (outro cartão).
- **Nenhuma flag governa o Mockup.** A flag `magic_up` **não** pertence a este módulo
  (confirmado também em `docs/MATRIZ_FLUXOS_CRITICOS_2026-08-26.md:288`).

### 2.2 Magic Up = módulo criativo com IA

- Gera **criativos de anúncio** a partir de produto + brief/campanha/brand kit, com geração de
  prompt e score de qualidade por IA.
- Modelo de imagem via Edge `generate-ad-image`: modo `pro` = `google/gemini-3-pro-image-preview`;
  modo `fast` ("nano-banana") = `google/gemini-2.5-flash-image-preview`
  (`supabase/functions/generate-ad-image/index.ts:205-214`).
- Prompt por IA: Edge `generate-ad-prompt` (modelo `google/gemini-3-flash-preview`).
- Score por IA: Edge `magic-up-score` (modelo `google/gemini-2.5-pro`).
- Usa a flag `magic_up` (`src/lib/feature-flags.ts:96-98`) — que, hoje, **não tem consumidor** em
  `src/` (não é gate efetivo).

## 3. Tabela — módulo × artefato

| Artefato | Mockup | Magic Up |
|---|---|---|
| Rota(s) | `/mockup-generator`, `/mockups/historico` (redirects `/mockup`, `/gerador-mockup`) | `/magic-up` |
| Página | `src/pages/mockups/MockupGenerator.tsx`, `src/pages/mockups/MockupHistoryPage.tsx` | `src/pages/tools/MagicUp.tsx`, `src/pages/magic-up/` |
| Componentes | `src/components/mockup/**`, `src/pages/mockups/mockup-generator/**` | `src/components/magic-up/**` |
| Hooks / serviços | `src/hooks/mockup/{index,useMockupGenerator,useMockupDraft,useMockupTechniques,mockupGenerationService}.ts` | `src/hooks/intelligence/{useMagicUpState,useMagicUpGeneration}.ts` |
| Edge Functions | `generate-mockup` (compositor determinístico) | `generate-ad-image`, `generate-ad-prompt`, `magic-up-score` |
| IA na geração | **nenhuma** | Gemini 3 Pro Image (pro) / 2.5 Flash Image (fast); Gemini 3 Flash (prompt); Gemini 2.5 Pro (score) |
| Tabelas consumidas no código | `mockup_drafts`, `mockup_prompt_configs`, `mockup_prompt_history` | `magic_up_generations`, `magic_up_campaigns`, `magic_up_brand_kits` |
| Tabelas/RPCs só no schema (sem consumidor em `src/`) | `mockup_generation_jobs`, `mockup_templates`, `mockup_approval_links`, `mockup_credits`, `mockup_credit_transactions`; RPCs `generate_mockup_approval_token`, `reset_mockup_credit_limits` | `magic_up_comments`, `magic_up_public_shares`, `magic_up_reactions`; RPCs `magic_up_*` |
| Storage (buckets) | `mockup-assets`, `mockup-art-files` | — (imagens geradas pela Edge) |
| Assistente | `src/components/ai/AIMockupAssistant.tsx` (chat de orientação — não gera imagem) | — |
| Flag | — (nenhuma) | `magic_up` (`src/lib/feature-flags.ts:96-98`) |
| Kill switch server-side | `edge_generate_mockup` | — (nenhum `edge_*` nas Edges do Magic Up) |
| Owner | Joaquim | Joaquim |
| Criticidade | C1 | C1 |

## 4. Evidência (git grep)

Comandos rodados no repo (worktree do cartão); o resultado é o que está referenciado na §3.

| Artefato | Comando | Resultado observado |
|---|---|---|
| Rotas | `git grep -n "/magic-up\|mockup-generator" -- src/routes/tools-routes.tsx` | linhas 57–61: `/mockup-generator` e `/mockups/historico` (Mockup) e `/magic-up` (Magic Up) |
| Páginas | `ls src/pages/mockups src/pages/magic-up src/pages/tools` | `mockups/MockupGenerator.tsx`, `mockups/MockupHistoryPage.tsx`; `magic-up/**`; `tools/MagicUp.tsx` |
| Componentes | `ls src/components/mockup src/components/magic-up` | `src/components/mockup/**` e `src/components/magic-up/**` |
| Hooks | `ls src/hooks/mockup src/hooks/intelligence \| grep -i magic` | `src/hooks/mockup/{...}`; `useMagicUpGeneration.ts`, `useMagicUpState.ts` |
| Edges | `ls supabase/functions \| grep -E "generate-mockup\|generate-ad-\|magic-up-score"` | `generate-mockup`, `generate-ad-image`, `generate-ad-prompt`, `magic-up-score` |
| Modelos de IA | `git grep -n "gemini-\|imageModel" -- supabase/functions/generate-ad-image/index.ts supabase/functions/generate-ad-prompt/index.ts supabase/functions/magic-up-score/index.ts` | `gemini-3-pro-image-preview` / `gemini-2.5-flash-image-preview` / `gemini-3-flash-preview` / `gemini-2.5-pro` |
| Compositor determinístico | `git grep -n "deterministic canvas compositor" -- supabase/functions/generate-mockup/index.ts` | linha 13: rota de IA removida; função é compositor canvas |
| Tabelas | `git grep -n "\.from('mockup_\|\.from('magic_up_" -- src` | `mockup_drafts`/`mockup_prompt_configs`/`mockup_prompt_history`; `magic_up_generations`/`magic_up_campaigns`/`magic_up_brand_kits` |
| Storage | `git grep -n "mockup-assets\|mockup-art-files" -- src` | `mockupGenerationService.ts:521`, `ArtFileUpload.tsx:93`, `mockup-storage.ts:39` |
| Assistente | `git grep -n "Matheus" -- src` | `AIMockupAssistant.tsx:62,206` |
| Flag | `git grep -n "magic_up" -- src/lib/feature-flags.ts` | linhas 37 (union) e 96 (definição) — sem consumidor em `src/` |
| Kill switch | `git grep -n "assertSwitchEnabled" -- supabase/functions/generate-mockup/index.ts` | linha 347: `edge_generate_mockup` |

## 5. Consequências

- `docs/READINESS_LIFECYCLE_FEATURES_2026-08-29.md` deixa de fundir os módulos: o Mockup perde
  `/magic-up`, "IA externo gerenciado" e a flag `magic_up`; o Magic Up ganha linha própria.
- `docs/MATRIZ_FLUXOS_CRITICOS_2026-08-29.md` idem: o fluxo Mockup (8) deixa de citar IA e o
  Magic Up passa a ser fluxo próprio.
- **Rollback / degradação:** por serem independentes, a falha da IA do Magic Up não impede a
  composição determinística do Mockup, e vice-versa — daí a criticidade **C1**.
- **Pendências de código (registradas aqui; fora do escopo deste cartão docs-only):**
  1. `src/lib/feature-flags.ts:96-98` — flag `magic_up` com descrição *"Geração de mockups com IA"*:
     nome/descrição pertencem ao **Magic Up**, não ao Mockup; além disso a flag não tem
     consumidor em `src/` (declarada em `feature-flags.ts:37` e `:96` apenas).
  2. `src/components/ai/AIMockupAssistant.tsx` — chat **simulado** (respostas pré-definidas, sem
     chamada a modelo); definir se/como conecta ao modelo de IA.
  3. Tabelas/RPCs sem consumidor em `src/` (listadas na §3) — decidir consumir ou remover.
