# Estados do Mockup — glossário

**Escopo:** documentação. Nenhum código, schema, migration ou Edge Function foi alterado.
**Origem:** achado do documento do Codex (08/10/2026), p.12 e p.15, registrado no adendo do plano
(`docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md`, seção *“Conceito-chave adotado do Codex: SNAPSHOT
DE REVISÃO”*, etapa 71 para a p.12 e etapas 69/70 para o `snapshot_version` da p.15).
**Fontes de evidência:** leitura de `src/` e `git grep` no repositório, na revisão `a9c8bd9c4`
(worktree do cartão original, branch `v2/n60-2610082250`). Cada linha do código citada abaixo
existe no repositório nessa revisão.

## 1. Por que separar os estados

*Imagem gerada ≠ projeto salvo ≠ ficha disponível.* São três conclusões independentes, cada uma com
falha e retentativa próprias (Codex p.12; etapa 71). Somam-se os estados de ciclo de vida
(desatualizada, anexada a orçamento, na lixeira), que ainda **não** existem no código e estão
marcados aqui como **planejados**, com a etapa do plano que os cria.

Convenção: **Implementado** = existe no código desta branch. **Planejado** = decidido no plano
(`docs/PLANO_MOCKUP_50_ETAPAS_2026-10-08.md` / adendo), sem coluna, tabela ou tela no código.

## 2. Resumo

| Estado | Situação | Como se chega | Quem produz | O que permite hoje |
|---|---|---|---|---|
| **Gerada** (imagem) | Implementado | “Gerar Mockup” com empresa + produto + técnica + logo | Vendedor; Edge `generate-mockup` (compositor determinístico) | Ver, comparar antes/depois, anotar, baixar PNG/PDF, compartilhar |
| **Projeto salvo** (rascunho) | Implementado | Autosave do gerador (2 s) | `useMockupDraft` (automático) | Voltar ao gerador e retomar produto/técnica/cliente/áreas |
| **Projeto salvo** (registro) | Implementado | Autosave da geração, logo após a imagem ficar pronta | `saveMockupToDb` (automático) | Aparecer no histórico, gerar ficha, carregar/configurar de novo, excluir |
| **Ficha disponível** | Implementado | Captura automática com registro já salvo (caminho “Gerar Layout” estático ou geração normal) | Vendedor + `OffscreenLayoutCapture` (html2canvas → `layout_url`) | Imagem de ficha em `layout_url`, consumida pelo painel/lightbox/comparador |
| **Desatualizada** (`is_stale`) | **Planejado** (etapas 69/70) | Edição relevante depois de salvar | Snapshot de revisão (proposto) | Marcar a revisão anterior e abrir revisão nova |
| **Anexada a orçamento** | **Planejado** (etapas 38/39) | Ação “Anexar mockups” no item do orçamento | Orçamento (`quote_items.mockup_urls`) | Bloquear exclusão do mockup anexado |
| **Na lixeira** | **Planejado** (etapas 6/10, Q7) | Exclusão passa a marcar `deleted_at` | `deleteMockupFromDb` reescrito (proposto) | Restaurar; hoje a exclusão é definitiva |

Regra de leitura: um estado **planejado** não pode ser anunciado na UI como se existisse.
A barra de status do gerador já segue essa ordem — erro atual > salvando > salvo, para que um
“Salvo” antigo não encubra uma falha nova (`MockupToolbar.tsx:68`).

## 3. Detalhe por estado

### 3.1 Gerada (imagem gerada) — implementado

- **Como se chega:** `MockupGenerator` → `useMockupGenerator.generateMockup`
  (`src/hooks/mockup/useMockupGenerator.ts:526`) → `generateMockupApi`
  (`src/hooks/mockup/mockupGenerationService.ts:418`) → Edge `generate-mockup`
  (`supabase/functions/generate-mockup/index.ts`; é compositor determinístico, não IA na geração —
  `docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md` §2.1).
- **Pré-requisitos (todos obrigatórios hoje):** empresa, produto, técnica e ao menos uma área com
  logo (`useMockupGenerator.ts:531`); o produto precisa de imagem (`:535`). Logo SVG é recusado
  antes da chamada (`mockupGenerationService.ts:282`).
- **Permite:** ver o resultado (`MockupResultCard`), comparar antes/depois, anotar
  (`useMockupGenerator.ts:800-801`), baixar PNG/PDF (`ShareMenu.tsx:41-95`), compartilhar por
  WhatsApp/e-mail com a URL da imagem (`ShareMenu.tsx:97-108`), gerar a ficha (3.3).
- **Bloqueia/limita hoje:**
  - Multárea: cada área é uma chamada; falha parcial entrega as áreas boas e avisa
    (`mockupGenerationService.ts:445-469`) — o teto de 6 áreas e o “regerar só a que falhou” são a
    etapa 17 (planejado).
  - Gerar de novo **limpa** o resultado anterior na tela (`useMockupGenerator.ts:569`) e cria um
    registro novo, **sem** vínculo de revisão (`parent_mockup_id` não existe — etapa 16).
  - Não há marcação de “desatualizada” (3.4) nem anexo a orçamento (3.5).

### 3.2 Projeto salvo — implementado, em dois planos distintos

**(a) Rascunho do gerador (`mockup_drafts`)**

- **Como se chega:** automático. Cada mudança de produto/técnica/cliente/áreas dispara
  `saveDraft` com debounce de 1 s no hook (`useMockupGenerator.ts:323-345`) e 2 s de autosave do
  rascunho (`src/hooks/mockup/useMockupDraft.ts:10`), gravando `mockup_drafts` via upsert
  (`useMockupDraft.ts:221-223`) e uma cópia no `localStorage` (`:97-114`).
- **Produzido por:** `useMockupDraft` (automático) — não é ação do vendedor.
- **Permite:** retomar o trabalho (a carga compara a cópia local e a do backend por data —
  `useMockupDraft.ts:344,363-364`); o vendedor vê o estado na barra (`Salvando...` / `Salvo` /
  `Erro ao salvar`, nessa prioridade — `src/pages/mockups/mockup-generator/MockupToolbar.tsx:68-100`,
  com teste em `__tests__/MockupToolbar.test.tsx`).
- **Bloqueia/limita hoje:** o rascunho **não** guarda logo em `data:` URL no backend
  (`useMockupDraft.ts:149-189`) nem no `localStorage` (`:103-114`) — a logo volta pelo arquivo já
  enviado ao storage; e o rascunho não é o registro do histórico, ou seja, “Salvo” na barra
  **não** significa imagem no histórico.

**(b) Registro no histórico (`generated_mockups`)**

- **Como se chega:** automático depois de a imagem ficar pronta — `saveMockupToHistory`
  (`useMockupGenerator.ts:492`) → `saveMockupToDb` (`mockupGenerationService.ts:156`), INSERT em
  `generated_mockups` (`:228`) com produto, técnica, cliente, geometria, anotações e URL.
  No lote, um registro por área (`useMockupGenerator.ts:606-611`). O caminho estático
  (“Gerar Layout”) também salva um registro (`src/pages/mockups/MockupGenerator.tsx:481-501`).
- **Permite:** aparecer no painel e na página de histórico (`fetchMockupHistory`,
  `mockupGenerationService.ts:101`; `src/pages/mockups/MockupHistoryPage.tsx`), recarregar as
  configurações (`useMockupGenerator.ts:701`), gerar a ficha (3.3), excluir (3.6).
- **Bloqueia/limita hoje:** se o INSERT falhar, a imagem continua na tela mas o aviso é explícito
  (“Mockup gerado, mas não foi possível salvar no histórico.”, `mockupGenerationService.ts:247`) e
  **não** há `lastSavedRecordId` — sem ele a ficha não é capturada (`MockupGenerator.tsx:140`).
  O `technique_id` é gravado como `null` de propósito (FK divergente do catálogo —
  `mockupGenerationService.ts:177-185`), então a técnica sobrevive pelo nome.

### 3.3 Ficha disponível (documento de aprovação / layout) — implementado

- **Como se chega:** com um registro já salvo, a tela monta a requisição de captura
  (`src/pages/mockups/MockupGenerator.tsx:139-199`, que exige `lastSavedRecordId`) e renderiza o
  timbrado fora da tela (`MockupGenerator.tsx:236`). O `OffscreenLayoutCapture` converte o
  documento em imagem (`html2canvas`), envia para o bucket `mockup-assets` em
  `{userId}/mockup-layouts/…` e grava o resultado em `generated_mockups.layout_url`
  (`src/components/mockup/approval/OffscreenLayoutCapture.tsx:111-126`).
- **Produzido por:** captura automática depois de o registro existir (acima); no painel o vendedor tem
  “Gerar documento” (papel timbrado; `src/components/mockup/approval/MockupLayoutButtons.tsx:346`,
  handler `:159`) e “Gerar Layout” (composição estática; `:368`, handler `:181`).
- **Permite:** exibir e baixar a ficha pelo painel/lightbox/comparador, que preferem `layout_url` e
  caem para `mockup_url` (`src/components/mockup/MockupHistoryPanel.tsx:547,642,726,802`;
  `MockupLightbox.tsx:105,127`; `MockupCompareDialog.tsx:73,97`).
- **Bloqueia/limita hoje:**
  - O diálogo “Aprovação de Layout” (`MockupApprovalPreview.tsx`) só **exporta PDF no navegador**
    (`:69-119`); nada é persistido por ele — a persistência vem do caminho off-screen acima.
  - Sem registro salvo não há ficha: `layoutCaptureRequest` fica `null`
    (`MockupGenerator.tsx:140-143`).
  - A página de histórico **não** lê a coluna: ela fixa `layout_url: null` no mapeamento
    (`MockupHistoryPage.tsx:97`) — quem exibe a ficha são o painel do gerador e o lightbox.
  - O “snapshot de revisão” que garantiria ficha fiel ao momento da geração (etapas 69/70) não
    existe: a captura usa os dados correntes do formulário.

### 3.4 Desatualizada (`is_stale`) — **planejado** (etapas 69/70)

- **Decisão:** cada geração captura um *snapshot* imutável (produto+variante+foto, marca e versão
  aplicada, cores, geometria por área, cliente, data); alterar dado relevante marca a revisão
  anterior como desatualizada e abre revisão nova, sem sobrescrever
  (`docs/PLANO_MOCKUP_50_ETAPAS_ADENDO_CODEX.md`, *Conceito-chave*, etapas 69/70).
- **Estado no código:** **não existe.** `git grep -n "is_stale\|snapshot_version\|parent_mockup_id"
  -- src supabase/migrations` não retorna resultado; `src/types/mockup.ts` e
  `mockupGenerationService.ts` não têm o campo. Colunas previstas na proposta SQL da etapa 69
  (`snapshot jsonb`, `revision int`, `is_stale boolean`, `snapshot_version int`), a cargo de
  `workersql` + aplicação do Joaquim (a fábrica só propõe).
- **O que o código faz hoje no lugar:** editar depois de gerar não muda nada no registro; gerar de
  novo descarta o resultado em tela (`useMockupGenerator.ts:569`) e cria outro registro, sem
  parentesco. A UI **não** deve anunciar “desatualizado” antes das etapas 69/70.

### 3.5 Anexada a orçamento — **planejado** (etapas 38/39)

- **Decisão:** ação “Anexar mockups” no item do orçamento lista os mockups salvos do cliente e
  preenche `quote_items.mockup_urls` (etapa 38); a exclusão de mockup anexado passa a ser bloqueada
  em `deleteMockupFromDb` (etapa 39, depende da 38). O mesmo plano alerta que orçamentos antigos
  guardam URL pública de mockup/arte, e que o orçamento deve passar a guardar **caminho ou id**,
  resolvendo URL assinada na leitura (etapas 38/83/84 — risco registrado no adendo, §*RISCO
  descoberto*).
- **Estado no código:**
  - A coluna existe e é lida: `quote_items.mockup_urls` em
    `src/integrations/supabase/types.ts:34791` e `:34828`, tipada em
    `src/hooks/quotes/quoteTypes.ts:39`, mapeada em `src/hooks/quotes/quoteHelpers.ts:234` e
    selecionada em `src/services/quoteService.ts:84`; o contrato de payload é coberto por
    `src/services/__tests__/quoteServicePayloadContract.test.ts:113,132`.
  - **Não há** tela que anexe mockup: em `src/components/quotes/` e `src/pages/quotes/` o único
    ponto que menciona mockup é o atalho para o gerador (`QuickQuoteFAB.tsx:37,112`).
  - Quem grava arte de caixa hoje é o Kit Builder, e em outra coluna:
    `artwork_urls` (`src/pages/kit-builder/useKitBuilderQuote.ts:250,284`).
- **Bloqueio correlato:** como `deleted_at` não existe (3.6), excluir um mockup hoje **não** verifica
  se ele está citado em orçamento (etapa 39 pendente).

### 3.6 Na lixeira — **planejado** (etapas 6/10, decisão Q7)

- **Decisão:** exclusão vira *soft delete* com `deleted_at` + índice em `generated_mockups`
  (etapa 6, proposta SQL), e uma função única `deleteMockupFromDb` — usada por todas as telas — passa
  a marcar a data e a remover os arquivos do storage só ao expirar (etapa 10).
- **Estado no código: hoje é exclusão definitiva.**
  - A coluna **não existe**: `git grep -n "deleted_at" -- supabase/migrations` não retorna
    `generated_mockups` (as ocorrências de `deleted_at` em `src/` são de empresas do CRM, ex.:
    `src/components/mockup/MockupClientSelector.tsx:67-80`).
  - `deleteMockupFromDb` (`mockupGenerationService.ts:483-526`) apaga a linha com `.delete()` e
    remove logo e PNG do bucket `mockup-assets` (melhor esforço, falha de storage só é logada).
  - Chamadores: `MockupHistoryPage.tsx:125` (diálogo com “Esta ação não pode ser desfeita.”, `:335`)
    e `useMockupGenerator.ts:658`; há teste de fluxo em `src/tests/MockupDeletion.test.tsx`.
- **Regra de leitura:** enquanto as etapas 6/10 não forem aplicadas, “lixeira”, “restaurar” e
  “desfazer exclusão” **não** podem aparecer na UI — o botão de exclusão hoje é definitivo.

## 4. Caminho de ponta a ponta (hoje × planejado)

- **Hoje:** rascunho (autosave) → gerar → registro no histórico (autosave) → captura da ficha
  (`layout_url`) → excluir (definitivo).
- **Planejado:** gerar → salvar → **anexar ao orçamento** (38/39) → link assinado de 7 dias →
  **lixeira** (`deleted_at`), com o *snapshot de revisão* (69/70) marcando a revisão anterior como
  desatualizada — é o fluxo do smoke E2E da etapa 82 e a numeração oficial da etapa 31/32.

## 5. O que **não** é estado (evitar confusão)

- **Modo do layout** (`lastSavedLayoutMode`, tipo `'ai' | 'static'` em
  `src/hooks/mockup/useMockupGenerator.ts:97`; uso em `MockupGenerator.tsx:196,491`): é como a imagem
  foi produzida, não um estado de ciclo de vida. Os botões do painel já não usam o rótulo “- IA”
  (commit `3c1ae11d4`: “Gerar Mockup”, “Gerar documento”, “Gerar Layout”); os textos “IA” que restam
  no fluxo (`MockupWizard.tsx:85`, `MockupApprovalTemplate.tsx:108`) seguem como alvo da etapa 43.
- **Créditos/revisões** (`mockup_credits`, mensagem “Você ainda tem N revisões disponíveis” em
  `mockupGenerationService.ts:548-558`): a etapa 5 arquiva essas tabelas (decisão Q11); o contador
  não é estado do mockup.
- **Flag `magic_up`**: pertence ao Magic Up, não ao Mockup (`docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md`
  §2.1 e §5) — não governa nenhum dos estados acima.
- **Aba/passo do assistente** (`activeTab`, `wizardStep`, `useMockupGenerator.ts:826`): navegação,
  não estado persistido.

## 6. Como conferir estas afirmações

```bash
git grep -n "generated_mockups\|mockup_drafts" -- src ':!src/integrations/supabase/types.ts'
git grep -n "is_stale\|snapshot_version\|parent_mockup_id" -- src supabase/migrations   # vazio
git grep -n "deleted_at" -- supabase/migrations | grep -i mockup                         # vazio
git grep -n "layout_url" -- src ':!src/integrations/supabase/types.ts'
git grep -n "mockup_urls\|artwork_urls" -- src
```

Sem resultado acima = o estado correspondente **não** está implementado nesta branch.
