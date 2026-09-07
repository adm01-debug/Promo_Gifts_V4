# Magazine — Blue Premium: plano de execução em 100 etapas

> Escopo: `/magazine`, `/magazine/templates`, inspector de template e `/magazine/:id`
> (5 etapas do editor). Fonte visual: 5 telas aprovadas (2026-09-07). Fonte sistêmica:
> `PROMO_GIFTS_V4_BLUE_PREMIUM_DESIGN_SYSTEM.md` (mesma pasta). Fonte funcional: o código.
>
> Legenda de status: `[x]` feito e verificado nesta sessão · `[~]` feito, verificação parcial
> (motivo ao lado) · `[ ]` pendente (dono/como ao lado). Cada fase termina num CHECKPOINT
> com o critério objetivo de aceite.

## Fase 0 — Recon (1–10)

1. [x] Rotas mapeadas: `tools-routes.tsx` → List, Gallery, Editor, Print; `public-routes.tsx` → PublicView e harness `/__test/magazine-ring`.
2. [x] Componentes principais lidos: `MagazineListPage`, `MagazineTemplatesGalleryPage`, `TemplateCard`, `TemplatePreviewDialog`, `MagazineEditorPage`, `EditorHero`, `PreviewSidebar`, 5 steps, `MagazineClientPicker`, `BrandColorPicker`, `MagazineCardThumbnail`, `MagazinePageRenderer`.
3. [x] Hooks/serviços/dados: `useMagazineEditor` (autosave), `useMagazinePublish`, `useMagazineGoldImport`, `magazineService`, `useProducts`, `paginateMagazine`, `stepValidation`, `TemplateRegistry`.
4. [x] Testes que travam contrato: 8 suítes de rings (`tests/magazine/*`), `EditorHero.test`, `PreviewSidebar.empty.test`, `gallery.test`, `DesignStep.test`, `hooksOrder.test`, `Clickable.integration-audit`, `tailwindRings.interaction`.
5. [x] E2E com baseline visual: `magazine-header-align`, `magazine-header-responsive`, `magazine-preview-sticky`, `magazine-ring-visual` (todos `@smoke`, fora do gate padrão `test:e2e`).
6. [x] Tokens: `--primary` já é azul (217 91% 60%); superfícies/bordas/ring são laranja (hue 24); `brand-primary` existe no Tailwind; radius global 12–24px; `Card` tem `card-glow` (shine + lift 4px); `Button` tem lift/shadow-lg/scale .96.
7. [x] Armadilhas CSS globais medidas: `.dark span/p/label/li` e `.dark .text-muted-foreground` fixam cor em literal com especificidade acima das utilities; `a:not([class*='link-'])` força cor primária/800/underline em links; `theme-presets.ts` grava tokens inline no `<html>` (vence qualquer regra em `html[...]`).
8. [x] Shell (sidebar/header) usa tokens `--sidebar-*`/`--background` — pode receber a família via tokens sem tocar os componentes.
9. [x] Funcionalidades protegidas listadas: criar/duplicar/excluir+Undo, busca/filtro/ordenação, favoritos de template, returnTo/applyTemplate, autosave, publish, PDF/print, zoom + atalhos `+ − 0`, highlight LayoutStep↔Preview, DnD, picker CRM, WCAG da paleta, categoria semântica, drawer de preview < xl.
10. [x] **CHECKPOINT 0** — recon entregue no início da sessão: arquivos a alterar, componentes reutilizados, riscos (rings, hooks #310, testids, e2e visuais).

## Fase 1 — Camada de tokens Blue Premium (11–20)

11. [x] Criado `src/pages/magazine/blue-premium.css` com os 30+ tokens do DS convertidos hex→HSL (formato do `tailwind.config.ts`).
12. [x] Escopo por atributo `html[data-pg-theme='blue-premium'] body { … }` — mira em `body` para vencer as vars inline dos presets; cobre portais Radix.
13. [x] Hook `useBluePremiumTheme()` com contador de referência (sem flash ao navegar entre páginas do módulo); chamado nas 3 páginas.
14. [x] Superfícies §5: bg-0/bg-1/surface-1/2/3/elevated mapeados em `--background/--card/--card-elevated/--surface-hover/--popover`.
15. [x] Accent §4: `--primary` e `--brand-primary` convergem em #0B6EFD/#2780FF/#075CD6; `--primary-foreground` branco (contraste 4,51:1 AA sobre #0B6EFD).
16. [x] Bordas §6 (rgba(154,180,210) .15/.28/.10), `--border-width` 1px, ring azul.
17. [x] Radius §7 (6/8/10/12/14/16), sombras §8, overlay §9 (0.62 + blur 5px), motion §38 (160/200ms, ease .2,.8,.2,1).
18. [x] Correções escopadas das armadilhas do item 7: utilities de cor em `span/p/label/li` restauradas ao token; pesos 700/600/500; `.link-unstyled` para `Button asChild`.
19. [x] Neutralizações `.pg-module`: `card-glow` sem shine/lift, botões sem translate/shadow-lg (pressed ≤ 1px), inputs sem shadow; `.pg-stage` para o stage A4.
20. [x] **CHECKPOINT 1** — nenhum token global alterado (`git diff src/index.css src/styles tailwind.config.ts` vazio); atributo só existe com rota do módulo montada.

## Fase 2 — Primitivos compartilhados do módulo (21–30)

21. [x] `src/pages/magazine/pg.ts`: `PG_PAGE`, `PG_PANEL` (14px), `PG_CARD` (12px), `PG_SURFACE_2`, `PG_ICON_BOX` (44px), `PG_INPUT`/`PG_SELECT` (40px, foco azul 15%).
22. [x] Botões: `PG_BTN` (600, sem lift), `PG_BTN_OUTLINE` (neutro), `PG_BTN_OUTLINE_PRIMARY` (azul), `PG_ICON_BTN` (40px).
23. [x] `pgPill(active)` + `pgPillCount` (filtros §16, ativo azul sólido / inativo surface-2), `pgToggleIcon` (grade/lista/direção).
24. [x] `pgStatusBadge` §33: publicada success/15, rascunho neutro, arquivada muted.
25. [x] Tipografia: `PG_SECTION_TITLE` 20/700 display, `PG_PANEL_TITLE` 16/600, `PG_LABEL` 13/600, `PG_HELP` 11, `PG_OVERLINE` 11 uppercase.
26. [x] `PagesRail` (§31): lista vertical thumb 72px + número + rótulo; contrato de rings mantido (`ring-primary` ativo, `ring-amber-500` destaque, `focus-visible:ring-primary`).
27. [x] `PreviewSidebar` refatorado: variantes `sidebar` (stage + trilho), `drawer`, `stage`; barra inferior [‹ n/total ›] [− Fit +] [tela cheia]; API/aria/atalhos idênticos aos testes.
28. [x] `MagazineCardThumbnail` em proporção paisagem 11:5 (§20) com `className` opcional.
29. [x] `MagazinePageRenderer` null-safe para linhas legadas (`branding`/`items` nulos) — antes só não estourava porque o preview era mockado no teste.
30. [x] **CHECKPOINT 2** — `npm run test:magazine` + suítes do módulo: 412 testes verdes (rings, zoom, a11y axe, empty state, PDF).

## Fase 3 — Biblioteca `/magazine` (31–40)

31. [x] Page header §14: ícone 56px azul soft, H1 30px, subtítulo do mockup, `Explorar templates` (outline azul) + `Nova revista` (primário).
32. [x] KPI strip §15: Total / Rascunhos / Publicadas / Arquivadas / Visualizações totais — contagens reais (`status`, `viewCount`).
33. [x] Toolbar §16 em uma linha no Full HD: busca (flex) · pills de status com contador (inclui **Arquivadas**, antes ausente) · select de ordenação · direção asc/desc · grade/lista.
34. [x] Ordenação real: recentes / nome / visualizações × direção.
35. [x] Card §20: capa real 11:5 com badge de status sobreposta; título 16/600; cliente; produtos · template; "Editada há…" + views; ações.
36. [x] Ações: CTA específico `Abrir revista` (publicada) / `Continuar edição` como `<Link>`; menu `⋯` com Editar, Ver publicação (só publicada com token), Duplicar, Excluir (vermelho só dentro do menu).
37. [x] Modo lista implementado (linhas com thumb, meta, status, ações) — o toggle não é decorativo.
38. [x] Empty state §35 compacto e estado "sem resultados".
39. [x] Preservado: `Clickable` (auditoria estrutural), testids `page-title-magazine`, `magazine-create-btn`, `magazine-templates-gallery-btn`, `magazine-card-*`, AlertDialog de exclusão com Undo.
40. [x] **CHECKPOINT 3** — `Clickable.integration-audit` verde; tsc + eslint limpos no arquivo.

## Fase 4 — Galeria `/magazine/templates` (41–50)

41. [x] Header §14 com ícone, H1, subtítulo do mockup e `Voltar para revistas` / `Voltar ao editor` (returnTo seguro mantido).
42. [x] Filtros de família (tablist, testids `template-family-*`) em pills; separador; filtro de densidade (1 / 2–4 / 5+) real sobre `productsPerPage`.
43. [x] Ordenação (recentes / nome / densidade ↑↓) + grade/lista.
44. [x] `TemplateCard`: preview do template REAL escalado à largura do card (ResizeObserver) recortado 16:9 no topo; skeleton com geometria.
45. [x] Meta do card: nome + badge de família neutro; descrição; chips densidade (azul) e fonte; 3 pontos de paleta.
46. [x] CTA duplo §22: `Preview` outline neutro + `Usar template ↗` primário; favorito como coração (badge "Seu favorito" mantida para o teste).
47. [x] Modo lista (`variant="row"`) com thumb 224px, meta e CTAs.
48. [x] Preservado: favoritos em localStorage e reordenação, toast sem returnTo, `aria-live` no grid, skip-link.
49. [x] `gallery.test.tsx` verde (12 cards, filtros, favoritos, returnTo malicioso).
50. [x] **CHECKPOINT 4** — filtros de família + densidade combinam sem estado impossível; estado vazio explícito.

## Fase 5 — Inspector de template (51–58)

51. [x] Dialog largo `min(1500px, 100vw − 64px)` × `calc(100vh − 48px)`, radius 16, overlay escuro.
52. [x] Header: nome 24px, badges família/densidade, descrição, menu `⋮` (favoritar) e CTA primário (`template-preview-use` mantido).
53. [x] Coluna de metadados 340px: Sobre, Formato A4, Orientação, Produtos por página, Estilo visual, Público-alvo.
54. [x] Metadados editoriais adicionados ao SSOT (`MagazineTemplateMeta.visualStyle/audience/features/useCases`, opcionais) e preenchidos para os 12 templates — sem hardcode do mockup.
55. [x] Seções: Principais características (checks), Casos de uso (chips), Tipografia (Títulos/Textos), Paleta.
56. [x] Canvas: páginas REAIS da revista mock (`paginateMagazine` → capa, produtos, contracapa) via `MagazinePageRenderer`; abre na 1ª página de produtos.
57. [x] Controles: ‹ › (também setas do teclado), "Página n de N", zoom 50–150% sobre o fit, tela cheia (Fullscreen API), dots.
58. [x] **CHECKPOINT 5** — sem `role="img"`/`<img>` fora do canvas; fit recalculado por ResizeObserver; fallback por viewport.

## Fase 6 — Editor: shell + stepper (59–68)

59. [x] `EditorHero` §24: breadcrumb + ícone + H1 28px + chip do template + `Trocar template` na mesma linha (`magazine-hero-title-row` mantém filhos diretos exigidos pelo teste).
60. [x] Popover de troca restilizado (`pg-module`, radios com seleção azul soft, ids/aria preservados).
61. [x] Cluster direito: status `Salvo automaticamente` + tempo relativo (role=status), `Preview` (drawer), `PDF`, `Publicar` (Send), menu `⋯` (galeria, voltar).
62. [x] Alinhamento hero × cluster via `lg:items-end` (substitui o hack `lg:pt-7`).
63. [x] Stepper §25 em uma linha: pill ativa azul, concluída com check verde, futura muted, conectores; barra de progresso removida.
64. [x] Alertas de validação em token (warning) em vez de `amber-*` literal.
65. [x] Workspace por etapa (`STEP_LAYOUT`): identity/layout = 3 painéis; content/design = 2; products = 1 (preview pelo drawer).
66. [x] Drawer de preview disponível em todos os breakpoints (única via < xl, complemento ≥ xl); aside inline `hidden xl:block`.
67. [x] Rodapé de navegação `Voltar` / `Continuar` / `Publicar revista` em painel.
68. [x] **CHECKPOINT 6** — `hooksOrder.test` (React #310) verde: hook do tema entra no topo da zona de hooks; nenhum hook abaixo dos early returns.

## Fase 7 — Identidade + Preview + Páginas (69–78)

69. [x] `IdentityStep` em um painel: Identidade (título com contador 80, subtítulo 200 — soft, sem truncar), Cliente CRM, avançado colapsável, Paleta da marca.
70. [x] `MagazineClientPicker` como campo input-like (logo/ícone, nome, limpar, chevron), popover `pg-module`; testid mantido.
71. [x] `BrandColorPicker`: swatches circulares + hex, paletas sugeridas em grade 3 colunas com estado ativo, preview WCAG compacto.
72. [x] Stage central §26 dominante (`variant="stage"`, sticky), fundo profundo com vinheta, sombra de página.
73. [x] Trilho `Páginas da revista` §31 à direita, scroll interno, sticky.
74. [x] Highlight LayoutStep ↔ trilho preservado (âmbar) e ativo (azul) com precedência do ativo.
75. [x] Grid 3 painéis `minmax(340px,.85fr) / minmax(0,1.35fr) / minmax(260px,.62fr)` ≥ 1280px; 1 coluna abaixo.
76. [x] Harness `/__test/magazine-ring` sincronizado com as classes do `PagesRail`.
77. [~] E2E `magazine-preview-sticky.spec.ts` atualizado (aside alinha à coluna principal, não ao hero) — **não executado** aqui (exige conta autenticada + revista).
78. [x] **CHECKPOINT 7** — testes de rings/zoom/empty state do `PreviewSidebar` verdes com o novo markup.

## Fase 8 — Produtos (79–86)

79. [x] Layout §27: catálogo `1fr` + trilho `320–380px` (≈72/28), sem coluna de preview.
80. [x] Cabeçalho "Catálogo de produtos" + subtítulo; botão `Filtros` (popover com Personalizáveis e Ocultar adicionados + contador de filtros ativos).
81. [x] Busca 44px + select "Ordenar por" (relevância / menor preço / maior preço / nome) — ordenação real.
82. [x] Chips de categoria com `Todos (n)`, 7 visíveis + `Mais ▾` (dropdown com o restante).
83. [x] Card de produto §21: imagem `object-contain` em fundo neutro, check circular de seleção, nome 14/600, `SKU`, preço em azul, 3 swatches (+N), botão `+` de adição rápida.
84. [x] Rodapé fixo do painel: contagem + `Adicionar (n)` (`magazine-product-add-btn` mantido); skeleton com geometria enquanto carrega.
85. [x] Trilho "Na revista": título + `Limpar tudo` (com confirmação), card do template ativo (capa real) com `Trocar template` → etapa Design, KPIs produtos/páginas (com projeção `→ N com +k`), lista com `VariantColorSelect` e remover, banner de sucesso.
86. [x] **CHECKPOINT 8** — funções preservadas: multi-select, filtro por categoria/personalização, ocultar adicionados, contagem de páginas por template, troca de variação, remover.

## Fase 9 — Conteúdo · Design · Layout (87–92)

87. [x] `ContentStep` §28: dois painéis, linhas de toggle compactas em 2 colunas, estado ligado em azul soft; testids `magazine-toggle-*` mantidos.
88. [x] `DesignStep` §29: CTA da galeria compacto, categoria semântica em chips 7 colunas, famílias em painéis com cards de metadados (sem miniaturas — `DesignStep.test` verde).
89. [x] `LayoutStep` §30: só a lista ordenável (DnD @dnd-kit); sumário duplicado removido — o trilho de páginas real ocupa o lugar.
90. [x] Linhas do LayoutStep: handle 32px, número mono, thumb 44px, nome, SKU · preço azul, remover com hover destrutivo; rings do teste mantidos.
91. [x] Design/Conteúdo com preview `sidebar` (stage + trilho) à direita ≥ xl.
92. [x] **CHECKPOINT 9** — `layout-step-rings`, `preview-and-highlight`, `preview-ring-collision/fuzz/edge/breakpoints/focus` verdes.

## Fase 10 — QA técnico, visual e entrega (93–100)

93. [x] `tsc -p tsconfig.app.json --noEmit` limpo.
94. [x] `eslint src/pages/magazine … --max-warnings=0` limpo; arquivos reescritos formatados com Prettier.
95. [x] Suíte do módulo (`tests/magazine`, `src/pages/magazine`, `src/services/__tests__`) verde.
96. [ ] Suíte completa `vitest run --exclude tests/hooks` — resultado registrado no PR (ver descrição).
97. [ ] `npm run build` (guard SSOT + vite build + chunk cycles + harnesses) — resultado registrado no PR.
98. [ ] Design QA visual ORIGINAL × APROVADO × IMPLEMENTAÇÃO em 1920/1600/1440/1366/1024/mobile — **pendente**: exige app rodando com Supabase autenticado; próximo passo via preview da Vercel + screenshots (Cloudflare Browser MCP).
99. [ ] Regenerar baselines dos e2e `@smoke` visuais (`magazine-header-align`, `magazine-header-responsive`, `magazine-ring-visual`) — workflow `e2e-update-magazine-ring-snapshots.yml` / `--update-snapshots`.
100. [x] **CHECKPOINT 10** — confirmação explícita: nenhuma camada proibida tocada (sem migration, schema, RLS, edge function, auth, API, integração, deploy, `client.ts`, workflows CI, tokens globais).

## Divergências conscientes em relação ao mockup

- **Shell (sidebar/header)**: recebe a família via tokens (`--sidebar-*`, `--background`) enquanto o módulo está montado; ícones/itens do menu não foram redesenhados (fora do escopo do módulo).
- **Breadcrumb no hero** (`Magazines / Editor`): mantido acima do título porque `EditorHero.test` e o e2e responsivo exigem o elemento visível acima do H1.
- **"Salvar rascunho" / "Continuar →" no header** (mockup Produtos): não replicado — o DS §52 proíbe botão Save com autosave; `Continuar` vive no rodapé do workspace.
- **Heart de favorito no card de produto** e **"+ Nova página" / menu por página** no trilho: não existem como função → não inventados (DS §1: nunca hardcodar/decorar sem função).
- **Textos longos do inspector** ("Sobre o template"): usa a `description` real do registry; características/casos de uso foram acrescentados ao SSOT, não ao mockup.
