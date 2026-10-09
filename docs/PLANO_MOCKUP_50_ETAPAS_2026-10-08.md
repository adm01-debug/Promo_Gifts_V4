# Plano Mockup — 50 etapas (correções e melhorias)

**Data:** 08/10/2026 · **Base:** auditoria de 7 relatórios (frontend, lógica/testes, backend/banco, documentação, docs/planos) + entrevista de 29 decisões com o dono (Joaquim).
**Fronteira:** Mockup = compositor determinístico, SEM IA na geração. Matheus = assistente de chat (DeepSeek Flash), não gera imagem. Magic Up é outro módulo (plano próprio, futuro).
**Executores:** `[F:perfil]` = cartão da fábrica VPS (worker/iris/hugo/edgar/vera/workertestes/workersql/complexo). `[J]` = ação do Joaquim (CI, aplicar SQL, config de bucket, merges). Banco: a fábrica só **propõe** SQL (proposta + rollback no comentário do cartão); quem aplica é o Joaquim.
**Ondas:** O1 = agora (sem dependências). O2 = depois da integração da O1 (mesmos arquivos ou dependência). O3 = depende de SQL aplicado pelo Joaquim ou de decisão externa.

## A. Segurança e dados (decisões Q5, Q6, Q7, Q11, Q22)

1. [F:workersql][O1] PROPOSTA SQL: remover o acesso `anon` a `mockup_approval_links` (revoke + drop da policy permissiva) — aprovação é interna (Q5). Rollback incluso.
2. [F:workersql][O1] PROPOSTA SQL: corrigir a policy de listagem do bucket `mockup-assets` (`name IS NOT NULL` é sempre-verdadeiro): dono vê os seus; remover listagem ampla.
3. [J][O3] Aplicar as propostas 1–2 no Supabase após revisão.
4. [F:workersql][O2] PROPOSTA SQL: bucket `mockup-assets` privado (public=false) + política de leitura por dono/equipe. Depende da etapa 9 (URLs assinadas no app) para não quebrar a exibição.
5. [F:workersql][O2] PROPOSTA SQL: arquivar `mockup_credits`, `mockup_generation_jobs`, `mockup_credit_transactions`, `mockup_templates` (rename p/ `zz_arquivado_*`, sem DROP; rollback = rename de volta) (Q11, Q15).
6. [F:workersql][O2] PROPOSTA SQL: lixeira — coluna `deleted_at` em `generated_mockups` + índice; e índice `(client_id, created_at desc)` e `(user_id, created_at desc)` (Q7, Q22).
7. [F:workersql][O2] PROPOSTA SQL: trigger de guarda em `generated_mockups`: dono não altera `approval_status`/`approved_by_user_id` para estados aprovados (só supervisor/admin) — aprovação interna não forjável.
8. [J][O3] Aplicar 4–7; rotacionar a `service_role` commitada em `scripts/kit-enrichment/*` (pendência antiga, fora do módulo mas crítica).
9. [F:hugo][O2] Trocar `getPublicUrl` por URL assinada (visualização curta; compartilhamento 7 dias) em serviço/hooks do mockup (Q6, Q20). Depende da 4 aplicada em staging de teste? Não: código aceita os dois; portão prova com o banco de teste.
10. [F:hugo][O2] Exclusão = soft delete (`deleted_at`) + remoção dos arquivos do storage ao expirar; função única `deleteMockupFromDb` usada por TODAS as telas (Q7).

## B. Integridade da geração (Q10, Q12, Q13, Q14, Q16, Q22)

11. [F:hugo][O1] `useMockupDraft`: parar de zerar logo `data:` URL — persistir a logo do rascunho (subir ao storage no primeiro uso e guardar a URL) (B F-01).
12. [F:hugo][O1] INSERT completo em `generated_mockups`: gravar `technique_id` (id da `tabela_preco_gravacao_oficial` vindo da RPC `fn_get_product_customization_options`) e `client_id`/`client_name` (Singu) (Q10, Q22; B F-03).
13. [F:hugo][O2] Unificar a lista de técnicas: `techniques` e `filteredTechniques` com o MESMO id (da RPC); restauração de técnica por rascunho/histórico/URL volta a funcionar (B F-03).
14. [F:hugo][O2] Timeout único de 30 s (fim dos 10s×2/20s/60s sobrepostos) + `AbortController`: trocar produto, resetar ou sair CANCELA a geração; geração cancelada não grava no histórico (Q16; B F-04/F-05).
15. [F:hugo][O2] Áreas não são recriadas quando o RPC de locations resolve após restaurar rascunho/histórico (preservar logo, posição, tamanho) (B F-02).
16. [F:hugo][O2] Regerar = revisão: coluna já existente? Não — usar `area_config.revision`+`parent_id`? PROPOSTA mínima: gravar `parent_mockup_id` (workersql propõe coluna; hugo preenche) (Q12). [Par com 6]
17. [F:hugo][O2] Multi-área: falha parcial entrega as áreas boas e oferece regerar só a que falhou; teto de 6 áreas por lote (Q14, Q29).
18. [F:iris][O2] Produto sem dimensões físicas: geração BLOQUEADA com CTA "solicitar cadastro de medidas" (admin do catálogo preenche); remover o 8×20 silencioso (Q13, Q24; A-9).
19. [F:hugo][O2] Eliminar a conta cm→px duplicada (LogoPositionEditor × MockupLayoutButtons): uma função única compartilhada (A-9).
20. [F:workertestes][O2] Testes de contrato da geração: timeout/cancelamento/falha parcial com o código real (sem mock do próprio mock).

## C. UX e fluxo (Q1, Q3, Q8, Q9, Q23, Q27, Q28)

21. [F:iris][O1] `KeyboardShortcuts`: remover Esc-reset, Ctrl+R, Ctrl+D e teclas 1–6; manter Ctrl+Enter; "Limpar" só por botão com confirmação (Q8; A-1 CRÍTICO).
22. [F:iris][O1] `MockupHistoryPage`: excluir com confirmação, via `deleteMockupFromDb` (limpa storage), filtrando por dono, e busca `.or()` com termo escapado (A-10, B F-06).
23. [F:iris][O1] Botão principal "Gerar Mockup" (só compõe a imagem), separado de "Gerar documento" (timbrado); celular tem os dois (Q3; A-2).
24. [F:iris][O2] Unificar históricos: página `/mockups/historico` paginada e filtrada no servidor (dono; supervisor vê equipe — RLS da etapa 7) vira a única; painel do gerador = atalho com os 10 últimos (Q9).
25. [F:iris][O2] Ações do histórico visíveis sem hover (toque/teclado) (A-5).
26. [F:iris][O2] Painel de configuração montado UMA vez (fim da duplicação desktop/mobile escondida por CSS, que duplica chamadas ao CRM) (A-3).
27. [F:iris][O2] Limite de cores da técnica: aviso forte + confirmação do vendedor, sem bloquear (Q23).
28. [F:iris][O2] Seletor de produto: mostra estoque e preço; sem estoque não impede (Q27); grade virtualizada responsiva (colunas dinâmicas) (A-11).
29. [F:iris][O2] Aviso fixo "prévia indicativa — o resultado real pode variar conforme a técnica" na prévia e no timbrado (Q28).
30. [F:iris][O2] Entradas unificadas: aceitar `?product_id=` e `?productId=` e o state do router (QuickQuoteFAB e "Visualizar com Logo" passam a pré-selecionar o produto) (A-7).

## D. Documento timbrado (Q18, Q19, Q20)

31. [F:workersql][O2] PROPOSTA SQL: sequência `MK-AAAA-NNNN` (tabela de numeração + função) (Q18).
32. [F:iris][O3] Data REAL de criação + numeração oficial única nos dois caminhos (fim da data derivada do UUID) (A-6). Depende da 31 aplicada.
33. [F:iris][O2] Timbrado mantém a identidade da empresa (verde atual); tokens centralizados num único lugar do template (Q19).
34. [F:iris][O2] Cliente recebe PDF timbrado (PNG opcional); compartilhar = link assinado de 7 dias (Q20). Depende da 9.
35. [F:edgar][O1] `generate-mockup`: redirects não seguidos às cegas (validar o host final), allowlist de hosts obrigatória com default = storage do próprio projeto + image-proxy; erros do fetch não vazam ao cliente (C-1).
36. [F:edgar][O2] Limite de tamanho do corpo e das imagens ANTES do download completo (`content-length` + corte) (C-4 parcial).

## E. Orçamento e cliente (Q4, Q21, Q22)

37. [F:hugo][O2] Serviço "mockups do cliente": consulta por `client_id` (Singu) para o módulo de orçamentos consumir (Q4, Q22).
38. [F:complexo][O3] No orçamento: ação "Anexar mockups" no item — lista os mockups salvos do cliente e preenche `quote_items.mockup_urls`; aparece na proposta (Q4). Multi-área: orçamento × mockup × PDF (arquivos de 2+ áreas).
39. [F:hugo][O3] Bloquear exclusão de mockup anexado a orçamento (verificação em `deleteMockupFromDb`) (Q21). Depende da 38.
40. [F:workertestes][O3] Testes do fluxo mockup→orçamento (anexa, aparece, não exclui anexado).

## F. Matheus (Q2, Q2b/c, Q25)

41. [F:edgar][O2] Edge function `mockup-assistant`: DeepSeek Flash (NUNCA Pro), recebe contexto (produto, técnica, dimensões, logo), `verify_jwt` fixado no config, rate-limit 20 msg/min/usuário, sem log do conteúdo do cliente (Q2c, Q25).
42. [F:iris][O3] `AIMockupAssistant` ligado à edge real: fim do `Math.random`; botões rápidos funcionais ("limites desta técnica", "tamanho ideal da logo"); estado de erro honesto. Depende da 41.
43. [F:iris][O2] Remover rótulos "IA" da GERAÇÃO (botões/textos) — a geração é composição; só o Matheus é IA (Q2).
44. [F:workertestes][O3] Testes do assistente: contrato da edge (real), rate-limit, fallback quando o provedor falha.

## G. Qualidade, testes e faxina (Q15, Q17)

45. [F:workertestes][O1] `tests/hooks/useMockupGenerator.test.ts`: corrigir os `vi.mock` com caminhos errados e substituir asserções tautológicas por testes que falham sem o código (B F-25).
46. [F:workertestes][O2] Aposentar `mockup-audit.test.ts` (2.295 linhas de `readFileSync`+`toContain`): substituir por testes de comportamento; remoção em fatias ≤400 linhas por cartão (B F-26).
47. [F:iris][O2] Código morto em fatias: `TemplateSelector`, `TemplatePreview`, `SaveTemplateDialog`, `GenerateButton`, `simulator/MockupPreview.tsx` (um cartão por arquivo, Q15).
48. [F:vera][O2] Corrigir docs: EDGE_FUNCTIONS.md (sem Gemini/nanobanana no mockup), FUNCIONALIDADES (caminhos reais), BUG-016 baixado, MATRIZ (bucket `mockup-art-files`), rotas atualizadas (D-6/9/10).
49. [F:vera][O2] ADR da fronteira Mockup × Magic Up (`docs/ADR_FRONTEIRA_MOCKUP_MAGICUP.md`): o que pertence a cada módulo (tabelas, edges, telas), geração sem IA, Matheus = chat DeepSeek Flash; corrigir lifecycle/readiness e a descrição da flag `magic_up` (Q17; G-3).
50. [J][O3] CI: incluir os e2e de fluxo do mockup num workflow (a fábrica não toca `.github/workflows`); revisar e mergear as branches `v2/*` deste plano (squash, método do lote).

## Fora do plano (registrado no roadmap)
Link público de aprovação do cliente (Q5-futuro) · Kit Builder/Simulador convergindo ao gerador (Q26) · Matheus treinado na área (evolução) · Plano próprio do Magic Up (entrevista a fazer).
