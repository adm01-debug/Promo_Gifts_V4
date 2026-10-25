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
