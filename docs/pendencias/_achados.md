# Achados da sessão (2026-11-20)

## RP-030 — links públicos mortos (A01)
- **Decisão PO (07/05/2026)**: rotas públicas descontinuadas; não restaurar.
- **Estado real**: fix mergeado na main em 26/10 — PR #2547, commit `5387e52d6` "remove botões e diálogos de link público morto (coleção, comparação, favoritos)".
- **Verificação byte-a-byte** (main): 0 ocorrências de `colecao-publica|comparar-publica|lista-publica` em src/ e e2e/; `route-matrix.ts` sem rotas fantasmas; `public-routes.tsx` sem resíduo.
- **Conclusão**: item FECHADO. Nada a fazer.

## 1 teste falho no baseline da main
- Em investigação (rodada 2 em background). Provável flaky herdado, não desta sessão.

## CD-058 — LGPD anonymize-user (A02)
- **Auditoria de 11/10**: "edge sem gatilho" (desatualizada).
- **Estado real (main)**: fluxo completo integrado desde 26/10 via PR #2548 (commit `9be832a35` "feat(lgpd): dialog de anonimização de conta").
  - Trigger no menu: `src/components/layout/Header.tsx` L537-542 ("Excluir meus dados (LGPD)"), dialog montado L558.
  - Dialog: `src/components/privacy/AnonymizeAccountDialog.tsx` (103L), `CONFIRM_PHRASE='EXCLUIR MINHA CONTA'`, chama edge `anonymize-user` via `invokeEdge` (op `anonymize_user`), signOut pós-sucesso, toast de erro sem ação destrutiva.
  - Edge: `supabase/functions/anonymize-user/index.ts`, deployado — último deploy 12/11 (EDGE_FUNCTIONS_DEPLOY_LOG L945, versão 24, commit `5f956d2cf`).
- **Conclusão**: item FECHADO (auditoria desatualizada). Nada a fazer.

## KMM-075 — filtro "Publicados" inclui `ready` (A04)
- **Estado real (main)**: o filtro já usa semântica correta — chips "Todos/Rascunhos/Prontos/Arquivados" (`KitLibraryPage.tsx:421-430`), match por status exato (L269-271). `getKitStatusBadge` (`persistence.ts:36-41`): 'ready' → "Pronto".
- **Pendência real**: badge cai em "Publicado" para status desconhecido (default L40) — hoje nenhum status real o atinge (só draft/ready/archived).
- **Bloqueio**: semântica de "Publicado" depende da decisão D7 do PO — KMM-075/KMC-038. Não é bug sem regra de produto. **Aguardando D7**.

## KM2-096/KM2-099 — maxWeight e revalidação servidor (A03)
- **Estado real (main)**: `transformToKitBox` (`useKitBuilderTransformers.ts:96-110`) nunca preenche `maxWeight`; `KIT_PACKAGING_SELECT` (`useKitBuilderQueries.ts:32`) não busca `max_weight_g`; view `v_products_public` não expõe o campo. `useKitBuilder.ts:140` só checa excesso se `maxWeight` existir.
- **Dado novo**: tabela `shipping_boxes` (migration `20261119213000_create_shipping_boxes.sql`, 19/11) tem `max_weight_g` + `empty_weight_g` com seed — candidato natural de fonte do limite estrutural.
- **Bloqueio**: fonte do limite = decisão D1 (PO). **Aguardando D1**.
## Resgate da sessão 2026-11-20 (noite)
- **quote_comments**: feature resgatada e publicada — DDL #3942 (migration , aplicada em prod 18:29), código+testes #3944 (squash , deploy prod success 20:01), recibo E15 docs #3946 (, deploy prod success 20:19), release **gifts-store-v1.16.0** #3945 (, tag criada, deploy prod success 20:29).
- **Branches limpas**:  deletada após verificação byte-a-byte (MIGRATIONS_SYNC_LOG idêntico à main). Restam no repo: , ,  (históricas) e  (#3943, regra 8, aguarda dono).
- **1 teste falho no baseline**: resolvido — era o  intencional (PromoFlixPlayer Regression). Main 100% verde (32836 passed + 1 expected fail).

## Resgate da sessão 2026-11-20 (noite)
- **quote_comments**: feature resgatada e publicada — DDL #3942 (migration 20261120180000_restore_quote_comments_scoped_threads.sql, aplicada em prod 18:29), código+testes #3944 (squash cfd7f833, deploy prod success 20:01), recibo E15 docs #3946 (3f273fe9, deploy prod success 20:19), release gifts-store-v1.16.0 #3945 (f83c473f, tag criada, deploy prod success 20:29).
- **Branches limpas**: branch e15-receipt deletada após verificação byte-a-byte (MIGRATIONS_SYNC_LOG idêntico à main). Restam no repo: main, contexto, gh-pages (históricas) e codex/fix-invoke-gate-parser (#3943, regra 8, aguarda dono).
- **1 teste falho no baseline**: resolvido — era o expected fail intencional (PromoFlixPlayer Regression). Main 100% verde (32836 passed + 1 expected fail).
