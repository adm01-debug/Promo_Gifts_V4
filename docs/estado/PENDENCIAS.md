# Pendências da meta Produção (docs/estado)

Dono: frente 5. Pendências de CI anteriores continuam em `/PENDENCIAS.md` (raiz, P1..P68) e `/RELATORIO_CI.md`; serão incorporadas na consolidação final.
Atualizado: 2026-10-25 · main `193ae5a` (21:01Z)

| ID | Bloqueio exato | Efeito | Depende de |
|---|---|---|---|
| PEND-E01 | `deploy-edge-functions.yml`: run #331 (sha `0773535`) está `waiting` e #333 `pending` (consulta API 21:01Z); #326–#330 e #332 `cancelled`. Estado `waiting` = aguarda aprovação do environment **Production** (causa provável, não confirmada no log do run). | Fix da #2552 (`materials-api`) e o da `categories-api` estão no main e NÃO em produção. Único caminho de deploy de edge (CLAUDE.md REGRA #8). | PO: aprovar o deploy no environment Production |
| PEND-B01 | Medição local da baseline impossível: `npm ci` → `E403 403 Forbidden - GET https://europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/pngjs/-/pngjs-7.0.0.tgz` (`package-lock.json:13781`, única entrada fora de registry.npmjs.org). Contorno (reescrever a URL localmente) foi negado pelo classificador de segurança. | `BASELINE.md` usa logs do CI, sem suíte completa e sem testes por nome fora do Gate 2. | PO: liberar a reescrita local ou aceitar baseline por CI |
| PEND-F01 | `docs/resgate/MAPA_2026-10-24.md`, `resgate-online/` e clusters C007..C011 não existem no main | Itens do MAPA não entram no backlog O5 | PO: apontar a branch/local |
| PEND-C01 | CI-002/003/005/006: E2E vermelhos por provável falta de dados/papel do usuário E2E no banco de teste (hipótese NÃO VERIFICADA; artifacts Playwright bloqueados pelo proxy) | CI do main não fica 100% verde | PO: seed/papel do usuário E2E (escrita em banco) ou acesso aos traces |
| PEND-S01 | SB-002/SB-003: crons `xbz-image-uploader` e `image-dimensions-backfill` apontam para edges inexistentes | Falham 100% das execuções | PO: recriar a edge ou desagendar |
| PEND-S02 | SB-017: config de Auth e lista de segredos de edge não são expostas pelo MCP | O4 não fecha sem conferência manual | PO: exportar config/segredos ou liberar acesso |
| PEND-A01 | Lista AGUARDANDO APROVAÇÃO: #2537, #2520, #2443, #2415, #2428, #2449, #2469, DB-001a/b, DB-007, SB-001/004/005/008/013 | Ver `backlog/ci.md` §3, `banco.md`, `supabase.md` | PO |

## Revalidação independente — 2026-10-29

Esta seção registra evidência nova consultada após o snapshot de 2026-10-25; não substitui nem declara resolvidos os itens anteriores. Branch de auditoria baseada em `main@c3445087`.

| ID | Bloqueio exato verificado | Efeito | Próximo passo |
|---|---|---|---|
| PEND-D02 | Supabase canônico `doufsxqlfjyuvxuezpln` ativo/saudável; ledger remoto tem 2.552 versões. Comparação read-only com `supabase/migrations` encontrou 463 versões locais ausentes do ledger, 11 versões remotas sem arquivo local e 5 colisões de versão entre arquivos locais. | Migrações não estão reconciliadas; não aplicar nem reparar ledger sem classificar cada divergência e seguir o workflow E15. PR #2714 continua bloqueada pelo Gate E40. | Classificar versões e arquivos em PRs; qualquer DDL/repair requer aprovação e o fluxo oficial. |
| PEND-C02 | PR #2721 (`a172c252`) ainda aberta/bloqueada. Na consulta, 44 checks success, 3 failure, 15 in progress, 6 skipped e 1 neutral. `LocationPanel collapse (authed)` falha porque faltam seis baselines (expanded/collapsed × mobile/tablet/desktop). `E2E · view-no-presentation-mode` e Copilot reviewer também falharam; causas ainda sem evidência conclusiva. | Não mesclar a correção nem considerar validação remota concluída. | Aguardar credenciais locais de E2E para gerar e revisar os baselines; obter o trecho de falha dos outros dois checks e corrigir só após reproduzir. |
| PEND-D03 | `npm audit --audit-level=high`: 12 high e 1 moderate, restritos às dependências de desenvolvimento no snapshot atual; `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades de produção. `@lhci/cli@0.15.1` é a versão publicada mais recente consultada. `npm audit fix --dry-run` não remove os high; teste isolado com downgrade para `@lhci/cli@0.13.0` manteve 11 high e elevou o total a 18. | Downgrade não resolve o achado e pode regredir o Lighthouse CI. | Acompanhar correção upstream ou preparar overrides específicos somente quando houver versões compatíveis e teste de `lhci autorun`; não afrouxar o gate. |
| PEND-S03 | Gitleaks 8.30.1 varreu o histórico completo (17.505 commits, 471 MB) com a configuração versionada e encontrou 0 achados. | Não reproduz o alerta histórico de segredo versionado sob as regras atuais; isso não comprova rotação de credenciais anteriormente expostas em serviços externos. | Confirmar rotação no provedor/painéis e revisar a allowlist do scanner antes de encerrar o incidente. |

Validações locais associadas ao PR #2721: `npm test` — 1.210 arquivos passaram; 25.658 testes passaram, 1.134 skipped, 24 TODO; `npm run build:verify` passou (typecheck, lint baseline e build). O branch do PR #2721 está publicado; a `main` e o banco não foram alterados nesta revalidação.
