# Operação do módulo Mockup (fluxo, estados, falhas, permissões e retenção)

Documento de operação do módulo **Mockup** do Promo_Gifts_V4, escrito depois das decisões de
08/10. Cobre o fluxo ponta a ponta, os três estados em que um mockup vive, o que fazer quando
falha, quem pode fazer o quê e a política de retenção.

**Como ler este documento.** Cada afirmação cita o arquivo (e, quando ajuda, a linha) onde ela
foi conferida no código. O que **ainda não existe** está marcado com `[PLANEJADO]` — nada aqui
descreve processo que o código não tenha.

---

## 1. Fluxo (ponta a ponta)

Rotas do módulo (`src/routes/tools-routes.tsx:59-60`), montadas sob `ProtectedRoute`
(`src/routes/AppRoutes.tsx:178`):

- `/mockup-generator` → `src/pages/mockups/MockupGenerator.tsx:103` (gerar + histórico em abas)
- `/mockups/historico` → `src/pages/mockups/MockupHistoryPage.tsx:41` (listagem paginada)
- `/mockup` e `/gerador-mockup` redirecionam para `/mockup-generator` (`tools-routes.tsx:57-58`)

Passos:

1. **Selecionar empresa, produto e técnica.** O hook carrega as técnicas de
   `tabela_preco_gravacao_oficial` (`src/hooks/mockup/useMockupGenerator.ts:351-380`). O produto
   pode chegar pela URL (`?product_id=` / `?technique=`, `useMockupGenerator.ts:291-321`) — é o
   caminho usado pelo botão "Gerar Mockup" do catálogo (`src/components/quotes/QuickQuoteFAB.tsx:112`).
2. **Upload do logo** por área de personalização. Validação no cliente: só imagem, máx 10 MB,
   SVG recusado (`.tsx` `useMockupGenerator.ts:439-482`). O logo ainda é um `data:` URL neste ponto.
3. **Gerar (composição sem IA).** `generateMockup` (`useMockupGenerator.ts:526`) chama
   `generateMockupApi` (`src/hooks/mockup/mockupGenerationService.ts:418`), que invoca a Edge
   Function `generate-mockup` (`mockupGenerationService.ts:349`). A função é um **compositor
   determinístico de canvas** — a rota de IA/"nano-banana" foi removida
   (`supabase/functions/generate-mockup/index.ts:12-17,457`). Ela desenha produto + logo num
   canvas de 1024 px com fundo branco e `object-contain` (`generate-mockup/index.ts:196,308-315`), dimensiona o
   logo em cm→px espelhando o preview WYSIWYG (`generate-mockup/index.ts:221-248`) e sobe o PNG resultante no
   bucket `mockup-assets` em `${userId}/mockups/...` (`generate-mockup/index.ts:504-522`), devolvendo `mockupUrl`
   (`generate-mockup/index.ts:522-543`). Várias áreas = uma invocação por área, em paralelo (`mockupGenerationService.ts:445-449`).
4. **Salvar no histórico.** Cada URL gerada vira uma linha em `generated_mockups` via
   `saveMockupToDb` (`mockupGenerationService.ts:156,190-231`). `technique_id` é gravado sempre
   `null` de propósito (a FK aponta para outra tabela; o nome vai em `technique_name`,
   `mockupGenerationService.ts:177-185`); se `product_id` violar FK, a linha é re-gravada com
   `product_id=null` (`:234-244`).
5. **Documento timbrado (ficha de aprovação).** Os botões "Gerar Layout" / "Gerar Layout - IA"
   (`src/components/mockup/approval/MockupLayoutButtons.tsx:320-372`) abrem
   `MockupApprovalPreview` (`:374-381`), que renderiza `MockupApprovalTemplate` (cabeçalho
   timbrado, dados do cliente/produto/técnica/Pantone) e exporta em PDF via html2canvas+jsPDF
   (`src/components/mockup/approval/MockupApprovalPreview.tsx:69-119`). Em paralelo, o
   `OffscreenLayoutCapture` renderiza o mesmo template fora da tela, captura em JPEG, sobe em
   `${userId}/mockup-layouts/` e grava a URL em `generated_mockups.layout_url`
   (`src/components/mockup/approval/OffscreenLayoutCapture.tsx:106-131`).
6. **Compartilhar / baixar.** `ShareMenu` (link, WhatsApp, e-mail, PNG, PDF,
   `src/components/mockup/ShareMenu.tsx:28-108`) e o download PDF por produto/técnica
   (`mockupGenerationService.ts:472-481`).
7. **Excluir.** `DeleteMockupDialog` (`src/pages/mockups/mockup-generator/MockupDialogs.tsx:58-71`)
   → `deleteMockup` (`useMockupGenerator.ts:655`) → `deleteMockupFromDb`, que apaga a linha e os
   objetos do storage (logo + PNG composto) em best-effort (`mockupGenerationService.ts:483-525`).

**Rascunho (auto-save).** Enquanto o vendedor monta o mockup, o estado é salvo em duas camadas:
`localStorage` e a tabela `mockup_drafts` (`src/hooks/mockup/useMockupDraft.ts:8-9,112-114`), com
debounce de 1 s no hook (`useMockupGenerator.ts:325-337`) e 2 s no serviço de rascunho
(`useMockupDraft.ts:9,226-228`). Ao reabrir, o mais recente (local × backend) vence
(`useMockupDraft.ts:243-262`).

### 1.1 Anexar ao orçamento — `[PLANEJADO]` no fluxo padrão

No fluxo padrão do orçamento **não há** caminho que anexe o mockup gerado a um item. A coluna
`quote_items.mockup_urls` existe (`src/integrations/supabase/types.ts:34791`;
`src/hooks/quotes/quoteHelpers.ts:234`), mas nenhum código a **preenche** — `buildItemsInsertPayload`
apenas lê `item.mockup_urls ?? []`, e nada escreve nesse campo. O único caminho que hoje leva uma
imagem gerada para o orçamento é o **Kit Builder**, em `artwork_urls`
(`src/pages/kit-builder/useKitBuilderQuote.ts:287`). O `ArtFileUpload` aceita um `quoteId`
(`src/components/mockup/ArtFileUpload.tsx:40,124`), mas é montado sem ele no mockup
(`src/components/mockup/MockupConfigPanel.tsx:331-335`). Portanto: anexar mockup ao orçamento
**ainda não está implementado** no fluxo `/mockup-generator` → `/orcamentos/novo`.

---

## 2. Estados

Um mockup passa por três artefatos distintos. Nomear cada um evita confundir "imagem", "registro"
e "documento".

| Estado | O que é | Onde vive (fonte) |
|---|---|---|
| **Imagem gerada** | PNG 1024×1024 composto (produto + logo) | Bucket `mockup-assets`, caminho `${userId}/mockups/*.png`; URL devolvida em `mockupUrl` (`generate-mockup/index.ts:504-522`). Em memória: state `generatedMockup` (`useMockupGenerator.ts:71`). |
| **Projeto salvo** | (a) rascunho editável; (b) registro persistente do histórico | (a) `mockup_drafts` (`supabase/migrations/20260107013155_66a04f90-a966-424c-a356-15f40b5f08b7.sql:2`, chave `user_id,draft_key` + `personalization_areas` JSONB). (b) `generated_mockups` (`mockupGenerationService.ts:190-226`), com `position_x/y`, `logo_width_cm/height_cm`, `layout_url` em colunas top-level (`supabase/migrations/20251215011449_730d6884-f2e8-4fe0-96e6-b03c13694aa4.sql:51-57`) e `client_id`/`client_name`/`logo_rotation`/`logo_scale` (`supabase/migrations/20260620000001_mockup_client_logo_rotation_cols.sql:19-39`). |
| **Ficha (documento)** | Ficha de aprovação capturada (JPEG) com cabeçalho timbrado | `generated_mockups.layout_url`; arquivo em `${userId}/mockup-layouts/` (`OffscreenLayoutCapture.tsx:111,125`). O histórico prefere mostrar a ficha quando existe: `mockup.layout_url \|\| mockup.mockup_url` (`src/components/mockup/MockupHistoryPanel.tsx:547`). |

Observação: o rascunho **não** guarda `data:` URLs no backend — só logos já em `http(s)` para não
gravar base64 de vários MB (`useMockupDraft.ts:84-90,247-260`).

---

## 3. Falhas e o que fazer

Todos os caminhos abaixo mostram erro ao usuário (toast/banner) ou relançam — nenhum engole falha.

| Sintoma | Mensagem / comportamento | Onde |
|---|---|---|
| Faltou empresa, produto, técnica ou logo | toast "Selecione empresa, produto, técnica e faça upload de pelo menos um logo" | `useMockupGenerator.ts:531-534` |
| Nenhuma área com logo | erro "Faça upload de pelo menos um logo antes de gerar o mockup." | `mockupGenerationService.ts:428-430` |
| Produto sem imagem | toast "O produto selecionado não possui imagem" | `useMockupGenerator.ts:535-539` |
| Logo SVG | recusado no upload e no serviço: "Logos SVG não são suportados..." | `useMockupGenerator.ts:447-450`; `mockupGenerationService.ts:282-290` |
| Demora > 60 s | erro "Tempo esgotado ao gerar mockup (limite de 60s)." | `mockupGenerationService.ts:277,355-360` |
| Queda de rede / 502 / 503 / timeout | **1 retry automático** após 2 s (mesma `Idempotency-Key`, evita PNG órfão) | `mockupGenerationService.ts:376-416` |
| Algumas áreas falharam (batch) | toast "N área(s) não puderam ser geradas. Mostrando as N que deram certo." | `mockupGenerationService.ts:464-469` |
| Todas as áreas falharam | erro "Nenhum mockup gerado: todas as áreas falharam." | `mockupGenerationService.ts:461-463` |
| Gerou mas não salvou | toast "Mockup gerado, mas não foi possível salvar no histórico." | `mockupGenerationService.ts:246-254` |
| Edge responde erro | 400 `validation_failed`; 422 `product_image_unavailable`/`logo_unavailable`; 500 `storage_upload_failed`/`composition_failed`; 501 `canvas_runtime_unavailable`; 504 `composition_timeout` | `supabase/functions/generate-mockup/index.ts:43-52,78,436-477,518` |
| Host interno/inexistente (SSRF) | host bloqueado e registrado; URL reprovada antes de buscar; a allowlist de egresso é obrigatória (sem env, só o host do projeto) e **cada hop de redirect é revalidado** pelo mesmo gate antes de ser buscado | `generate-mockup/index.ts:95-144,370-384`; `generate-mockup/fetch-guard.ts:25-88` |
| Kill switch ligado | a geração é interrompida pelo switch `edge_generate_mockup` | `generate-mockup/index.ts:352` |
| Captura da ficha falhou | erro logado, **sem** `layout_url`; trava de 3 tentativas por registro | `OffscreenLayoutCapture.tsx:52-58,137-139` |

Nota de UI: o "Assistente IA de Mockup" (`AIMockupAssistant`) **não chama IA alguma** — é
`setTimeout` + resposta sorteada de um array fixo (`src/components/ai/AIMockupAssistant.tsx:102,114`;
ver `docs/estado/04_FERRAMENTAS_IA.md:52`). Não confie nele para sugerir técnica/posição.

---

## 4. Permissões

Aplicam-se três regras, todas ancoradas no banco (RLS) e refletidas no front.

**a) Todo usuário autenticado usa o módulo.** As rotas ficam sob `ProtectedRoute`
(`src/routes/AppRoutes.tsx:178`) e não exigem papel específico (`tools-routes.tsx:59-60`). Vale
para vendedor (`agente`/`vendedor`).

**b) Cada um só vê/edita/exclui o próprio registro.** As policies de `generated_mockups` são
`gm_select_own_or_admin` / `gm_update_own_or_admin` / `gm_delete_own_or_admin` (`auth.uid() =
user_id` **ou** `is_admin_or_above(auth.uid())`) e `gm_insert_self` (`auth.uid() = user_id`) —
`supabase/migrations/20260512000001_t25_fix_auth_rls_initplan.sql:489-504`. O mesmo padrão de
posse vale para `mockup_drafts` (`supabase/migrations/20260107013155_66a04f90-a966-424c-a356-15f40b5f08b7.sql:22-57`) e `art_file_attachments`
(`supabase/migrations/20260514000002_t39_create_missing_tables.sql:533-560`).

**c) Papel de gestão lê/edita/exclui de todos.** `is_admin_or_above` delega para
`is_supervisor_or_above` (`supabase/migrations/20260522030000_rls_002_security_definer_hardening.sql:40`),
que retorna `true` para **`dev`, `supervisor` e `admin` legado**
(`supabase/migrations/20260426010557_27a64407-f199-43c2-87b2-e8aeaec63f40.sql:62-73`). No front,
`isAdmin = isSupervisorOrAbove` (`src/contexts/AuthContext.tsx:486`), que também inclui `manager`
(`src/lib/auth/auth-utils.ts:41-43`).

| Perfil (rótulo de UI) | Papéis no banco (`app_role`) | Mockups |
|---|---|---|
| **Vendedor** | `agente` / `vendedor` | Ver, criar, editar e excluir **os seus** (`gm_insert_self`; `gm_*_own_or_admin`) |
| **Coordenador** | `supervisor` / `manager` / `coordenador` | `supervisor` e `manager` herdam gestão no front (`auth-utils.ts:41`); no banco só `supervisor` entra em `is_supervisor_or_above` — os valores `coordenador`/`manager` do enum **não** estão nessa função (`supabase/migrations/20260426010557_27a64407-f199-43c2-87b2-e8aeaec63f40.sql:62-73`). Ver observação abaixo. |
| **Admin** | `admin` (legado) / `dev` | Ler/editar/excluir **de todos** (`is_admin_or_above`) |

Vocabulário de papéis: `app_role` = `dev, supervisor, admin, manager, agente, coordenador,
vendedor` (`src/integrations/supabase/types.ts:64470`); rótulos de UI em `src/lib/roles.ts:31-82`
(vendedor="Agente", supervisor/coordenador="gestão").

> Observação a confirmar com o Joaquim: o enum tem `coordenador` e `manager`, mas a função de
> banco `is_supervisor_or_above` só reconhece `dev`/`supervisor`/`admin`. Ou seja, hoje um usuário
> apenas com `coordenador` (ou `manager`) **não** recebe no banco o acesso "de todos" que o
> front sugere. Este documento registra o comportamento do código; a unificação dos papéis não é
> decisão deste cartão.

**Storage — "pastas por vendedor".** Cada arquivo fica sob uma pasta cujo primeiro segmento é o
`auth.uid()` do dono, e as policies comparam `(storage.foldername(name))[1]` com o usuário:
`mockup-assets` (`supabase/migrations/20260716000007_sec_storage_mockup_assets.sql`,
`INSERT`/`UPDATE`/`DELETE`/`SELECT` escopados) e `mockup-art-files` (bucket privado,
`supabase/migrations/20260416195918_397d6363-83a0-45f5-a8f6-ea33e21352a6.sql:171-203`). Consequência: um vendedor não lê os logos, PNGs nem
fichas de outro; a Edge Function usa `service_role` para gravar o PNG composto
(`generate-mockup/index.ts:504-522`). Limites do bucket `mockup-assets`: 10 MB e
`image/jpeg|png|webp|gif` (`supabase/migrations/20260620000001_mockup_client_logo_rotation_cols.sql:89-94`).

---

## 5. Retenção

**Hoje não há lixeira para mockup.** A exclusão é **definitiva**: o diálogo avisa "Esta ação não
pode ser desfeita." (`MockupDialogs.tsx:65`) e `deleteMockupFromDb` apaga a linha de
`generated_mockups` **e** os objetos do storage (`mockupGenerationService.ts:483-525`). Não existe
coluna `deleted_at`/`is_deleted` em `generated_mockups` nem cron de expurgo de mockup. Os
rascunhos (`mockup_drafts`) também não têm TTL.

O único "lixeira com TTL de 30 dias" do sistema é de **outras** entidades — favoritos
(`favorite_items_trash`, TTL 30d, cron `purge-favorite-trash`) e itens de coleção
(`collection_items_trash`), conforme `docs/estado/03_COMPONENTES_COMERCIAL.md:159` e
`docs/estado/08_DADOS_SCHEMA.md:223`.

`[PLANEJADO]` **Lixeira de 30 dias para mockup:** não implementada. Não há tabela de lixeira,
coluna de soft-delete, job de expurgo nem UI de restauração para `generated_mockups`. Enquanto
isso, a política efetiva é: o registro fica no histórico até o dono (ou a gestão) excluí-lo, e a
exclusão é irreversível.

---

## 6. Resumo dos `[PLANEJADO]`

- **Anexar mockup ao orçamento** no fluxo padrão (`/mockup-generator` → `/orcamentos/novo`): a
  coluna existe, mas nada a preenche (§1.1). O Kit Builder anexa em `artwork_urls`.
- **Lixeira de 30 dias** para mockup (§5).
- **Homogeneização de papéis** `coordenador`/`manager` no `is_supervisor_or_above` (§4).
- **`AIMockupAssistant` como IA real**: hoje é resposta fixa simulada (§3).
