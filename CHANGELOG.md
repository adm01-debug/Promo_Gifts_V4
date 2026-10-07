# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.2](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.0.1...v1.0.2) (2026-10-07)


### Bug Fixes

* **revisão:** retry de is_active=false + deactivated na resposta do anonymize-user ([#2084](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2084)) ([93f7a22](https://github.com/adm01-debug/Promo_Gifts_V4/commit/93f7a2237ab17061c6f3edf24b17034071e68dc3))

## [1.0.1](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.0.0...v1.0.1) (2026-10-07)


### Bug Fixes

* **auditoria:** Onda 5 — lockout à prova de envenenamento (C1), highs da validação e revisões automáticas ([#2061](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2061)) ([bbb8497](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bbb84978209432d355c54232845d4399f6beefae))
* **auditoria:** Onda 6 — cobertura do caminho do gate de login + idempotency-key nos call sites ([#2074](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2074)) ([f5b0075](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f5b007542b6fc99df78c8606ac3e92416c068b0f))
* **revisão:** mockup hasheia key p/ path idempotente + purge exato de login_attempts ([#2075](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2075)) ([44abb13](https://github.com/adm01-debug/Promo_Gifts_V4/commit/44abb13c0f78a2839f7ed724876b1979fc57b2d7))
* **revisão:** purge de login_attempts por keyset + audit gate por advisory ([#2082](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2082)) ([d6182ee](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d6182ee6c73aaf2368a3e89b5d004619fe618c8b))

## 1.0.0 (2026-10-05)


### Features

* **auditoria:** Onda 2 — gates CI, validators BR, idempotency-key e senha forte SSOT ([#2041](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2041)) ([52ffc97](https://github.com/adm01-debug/Promo_Gifts_V4/commit/52ffc972d9bce350d9ebe42ff05b90066ed8b240))
* **auditoria:** Onda 3 — Turnstile no login, baseline de policies e ratchet zod nas edges ([#2056](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2056)) ([5961395](https://github.com/adm01-debug/Promo_Gifts_V4/commit/596139524f2f6f9d8e204f5d58eaa9327df00d84))
* **auditoria:** Onda 4 — version em discount_approval_requests, audit triggers DB-level, edge anonymize-user (LGPD) e release-please ([#2057](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2057)) ([c92c916](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c92c916f74bf9890a6ddfabc2fcc586f5e410332))
* **carts:** optimistic locking por seller_carts.version nas mutações do carrinho ([#1833](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1833)) ([4bb2e54](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4bb2e54b4b0707fe068ddf246984ee094cb3f4a0))
* **ci/e93:** workflow de métricas semanais de CI ([#2011](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2011)) ([cafd102](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cafd102bc9f8e1b1dbc537864623aafb557ef2c2))
* **ci:** check-headers-mirror — garante public/_headers CSP == vercel.json ([8c541a3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8c541a3acc8a4dd10f8a107c2fdab87ab0525d02))
* **ci:** E23 — _secrets-check.yml reusável + check-min-tests-executed.mjs ([#1989](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1989)) ([417ec12](https://github.com/adm01-debug/Promo_Gifts_V4/commit/417ec12d29ec6ba2dec889ff04452cbbc508e8ec))
* **ci:** E23 — reusable secrets-check + min-executed gate ([#2030](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2030)) ([9da4510](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9da4510f6925165a4671bb310e34d5928364e0b0))
* **ci:** E41 ratchet gates — TSC error count + bundle size baselines ([fcc2db3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/fcc2db3f7f98fb0e6a2c2280ff4f781d3f48a592))
* **ci:** E97 — Gate 0.6 dependency-review-action (CVE high bloqueante em PRs) ([b699bd3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b699bd3c7fc2b8d08d22dc74e5612a6dc2eb5a44))
* **ci:** E99 — SBOM SPDX-JSON + build provenance attestation no job build ([adcfcc2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/adcfcc2ab7ec5166f99a5f320b0554c5352a11cf))
* **ci:** workflow de staging smoke para E2E de frete com credenciais reais ([#1948](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1948)) ([ba56cf0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ba56cf0bf9268edc252233b33f9cd74325fe10bb))
* Correção de erros de comunicação com o banco e erros no codigo do projeto tudo documentado ([8bd948e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8bd948eb37043a67e68fdad7bdaa99da03e4822b))
* **docs:** E98 — inventário de segredos docs/ci/SEGREDOS.md ([f7ffc8f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f7ffc8f8b927e739c095c64482f52d34fabd7bc3))
* **e2e:** E21 — warn explícito em CI quando credenciais E2E ausentes ([#1999](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1999)) ([d5b52e2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d5b52e20482555c8a87e8564962d1b0cc60ee127))
* **e2e:** harness público para regressão visual do bloco Frete ([286dec9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/286dec96326f4f1855085ce03ee41f2d2f658c44))
* **graphify:** add .graphifyignore ([ad769ba](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ad769ba373f8f286f8e088aaac3e908467eceef6))
* **graphify:** install --project — PreToolUse hooks + query-first guidance ([dcc8e68](https://github.com/adm01-debug/Promo_Gifts_V4/commit/dcc8e681ee82e4acf70a0dfc124ea81ce36edf9c))
* **kit-ai-builder:** título/descrição reais da IA + erros de negócio (etapas 17+18) ([#1894](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1894)) ([a891b78](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a891b78a380d312f1b84d301473150b63baa59a8))
* **kit-builder:** estoque agregado na projecao do catalogo de itens ([#1889](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1889)) ([228ffc2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/228ffc23bf47e5c68ff9ab80b36188f122b16984))
* **kit-builder:** estoque visível no card do item (4 estados) ([#1892](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1892)) ([5056f17](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5056f174cc165bb249ce6ca5f984a19abf3084d3))
* **kit-builder:** layout de impressão do orçamento do Kit Maker ([#1890](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1890)) ([f21dceb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f21dceb536dcfad12806bf958f2b0284679a51fe))
* **kit-maker:** ativa persistência atômica com revisão ([0b19da4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0b19da4c707d05780a4efa4177f71ce07634ad66))
* **kit-maker:** ativa persistência atômica com revisão ([3e4964c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3e4964c6d75a3988073674f132ad60ef9f638629))
* **kit-maker:** conclui fluxos funcionais e revisão pós-plano ([#1860](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1860)) ([847db84](https://github.com/adm01-debug/Promo_Gifts_V4/commit/847db84577bbd5ba5456a005f777f836a1f636bc))
* **kit-maker:** estrutura briefing do assistente de IA ([62078bf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/62078bf2eddf1bfeb86a9b1c0a4482642059e579))
* **kit-maker:** executa ondas seguras do plano de remediação ([#1924](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1924)) ([506be8e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/506be8ef5c6e89be2ba8e1ecf68fc04bb53652c1))
* **kit-maker:** exibe capas na biblioteca ([aacb286](https://github.com/adm01-debug/Promo_Gifts_V4/commit/aacb286a440366904d3db80c80406c679c3b45df))
* **kit-maker:** fecha 5 gaps autônomos do plano de 100 etapas ([#1884](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1884)) ([c6a7d2d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c6a7d2d36148930b40031a87f44987460cac6328))
* **kit-maker:** fecha etapas 11-16 e 20 do plano de finalização (Bloco B) ([#1891](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1891)) ([999ebf7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/999ebf7ed75582225dcb067e4b158ebb7bb5ebe2))
* **kit-maker:** fortalece fluxos e orçamento idempotente ([660e8d8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/660e8d82b0d50de8cb89b1d2ddde41be0de3ba59))
* **kit-maker:** integra fluxos e validações ([6593adb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6593adb7447da96990bfbac43e5ac942d6dd9f8b))
* **kit-maker:** integra fluxos e validações ([587997d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/587997d4acc99c182bf3ba2089d939e98796157f))
* **kit-maker:** paridade visual com mockups aprovados (Itens, Caixas, Personalização, Revisão, Biblioteca, IA, Landing) ([#1882](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1882)) ([b22c96d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b22c96d79a333d3e5213662aa48652124c1e72da))
* **kit-maker:** reconstrói entrada e corrige catálogo ([902e2d5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/902e2d5e10c1629b35fe20271e7bc522eee0d637))
* **magazine:** adiciona páginas editoriais estruturadas ([5cba72f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5cba72f9b2f058bf32df191ccfe64430320e8e31))
* **magazine:** botões do header do editor mudam por etapa do wizard ([#1844](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1844)) ([313ce12](https://github.com/adm01-debug/Promo_Gifts_V4/commit/313ce12783c7a212ce7c712028de69c4d82b21d7))
* **magazine:** conclui hardening funcional e validação exaustiva ([#1949](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1949)) ([a722dc1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a722dc138c65daddef8e27caef2bf1734c8abe5d))
* **magazine:** endurece edição transacional e publicação ([09d13c4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/09d13c4c80b7625eb83eba1f7c591ec3fd661da9))
* **magazine:** error handling + double-click prevention em create/duplicate/delete ([f3cee1c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f3cee1ca606d798d500316494d6aa76f7aadbf35))
* **magazine:** hardening transacional e paridade operacional ([61e74ba](https://github.com/adm01-debug/Promo_Gifts_V4/commit/61e74ba0de5dbf031f14074fa9597d1f9710485a))
* **magazine:** integra MagazineStatsCards na MagazineListPage ([39f1fc5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/39f1fc51b1ff79669f876d7155ce6348892008c9))
* **magazine:** MagazineStatsCards — KPI strip no padrão Novidades ([50864a3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/50864a37b7576452a77a25192b32d2cc4c424d7b))
* **magazine:** module fixes + E2E header CI workflow ([#1846](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1846)) ([fa237d0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/fa237d087b2eea945e792f21698260f1f3bea30b))
* **magazine:** redesign Blue Premium do módulo Revista ([#1842](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1842)) ([82d8531](https://github.com/adm01-debug/Promo_Gifts_V4/commit/82d853157fd6f9ca1e60f0d17893bf54df4c2343))
* **scripts:** adiciona check:headers-mirror ao package.json ([da0dff4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/da0dff48d5626ccdf2f91ae1321f2efdc6d6ba94))
* **stock:** integra saúde EMA às fontes canônicas ([11e48f8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/11e48f8534a3c94578c932c2387923ccc3105d29))


### Bug Fixes

* **approval:** alinha responsável e correlação de audit ([0035e28](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0035e2859a6a63e916607460d10622b8cdf84b9e))
* **approval:** elimina estado órfão com save atômico ([cdf3ebc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cdf3ebc634019ab846992e33000793c9408dfd63))
* **approval:** executa plano transacional e simulações seguras ([2b87a54](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2b87a54fa96f09610e152db7ed5aff79da158a6a))
* **approval:** executar plano transacional e simulações seguras ([a1be809](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a1be80920168c2d96c7954bdf216887025d2d5ff))
* **approval:** reconcilia status ao reutilizar aprovação ([3db5089](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3db50890804f64d957e5c4d49ee3385914faecb0))
* **auth,ci:** Onda 0 — 2 migrations de emergência + bookkeeping do plano de engenharia ([#1868](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1868)) ([8a45ce6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8a45ce6b02d75663b0ad926a9a3e9c36a39de8a2))
* **auth+ci:** elimina as any em auth.ts + ratchet noUnusedLocals ([#1819](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1819)) ([174b7fb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/174b7fb42bdaa145575eeca6a0aac351eb8e542e))
* **auth:** E96 — elimina 3 alertas CodeQL HIGH (user-bypass + insecure-randomness) ([#2012](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2012)) ([660f08d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/660f08d8634195e981a05376885c78d4d6f54b73))
* **auth:** promove migration de cadastro aprovada pelo PO ([#1873](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1873)) ([e30dfa6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e30dfa6487eb1b1131b698cb9d1c6b2a7c261ea4))
* **build:** restaura toolchain React canônico ([d53dfcd](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d53dfcd8f7e49c6c560ffae0d7cd4eef6a8351fe))
* **catalog:** backfill products.main_category_id nos 489 produtos sem valor ([#1953](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1953)) ([648017b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/648017b1904b825795025f1a36511fb4b7589326))
* **cb3/f04/t22:** CB-3 deprecate circuit-breaker.ts circuitOpenResponse, F-04 stale authz doc, T22 select('*') ([#1821](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1821)) ([b0995d5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b0995d586f183afef459d052089e3b55e4edf468))
* **chunk-load:** corrige loop infinito de reload e stale chunk em deploy ([#1835](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1835)) ([5520068](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5520068b94649f600abdc7a2367030cc3bb21beb))
* **ci/e08:** remove gh-pages write e prune_ghpages job do e2e.yml ([#2024](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2024)) ([c3d7ce0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c3d7ce0f920335ca85ec88948fd1f2387826597c))
* **ci/e28:** remove scope 'administration' inválido do branch-protection-sentinel ([#2000](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2000)) ([88e1412](https://github.com/adm01-debug/Promo_Gifts_V4/commit/88e1412822d928ccaa7450fab757aa01e5775cae))
* **ci/e33:** freight-quality-gates — push só em main, remove coverage.include ([99f01b4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/99f01b480ca17af4f193ea701431aa1d7160c351))
* **ci/e67+e68+e71:** delete-orphan-edges allowlist+env, migration-dry-run path-guard+PGOPTIONS, edge-drift timeout+setup-node ([de7490e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/de7490ec30c679e8719156e666567308545e05e6))
* **ci/e77:** R5 — passa inputs/context/matrix via env: em deploy-edge-functions.yml ([#2006](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2006)) ([84a0db7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/84a0db77eb26b113a6ddd74a6bc64633dc63dd19))
* **ci/e89:** add retention-days em upload-artifact sem política ([38370a9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/38370a9d523195de0e055336c70275e4c67b7f16))
* **ci+e2e+editor:** gaps descobertos em auditoria exaustiva pós-PR [#1846](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1846)/[#1848](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1848) ([#1849](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1849)) ([1878f1d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1878f1dd6160b45bcf1077678b31f49b152e31ec))
* **ci+security+types:** alerta de deploy por SHA, suíte XSS do sanitizador, RPCs tipadas ([#1834](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1834)) ([7dd07a3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7dd07a3382fe9bded18827d9d4e04b45aa7c036e))
* **ci:** aceita índice parcial equivalente ([674d903](https://github.com/adm01-debug/Promo_Gifts_V4/commit/674d903cdb8709587486c4141ea43c425d2f158e))
* **ci:** aceita titulo customizado de merge no sentinel ([e9ebcdf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e9ebcdf38e846ce04b551b8e3d7de421dcc8c3a3))
* **ci:** add administration:read to check-protection-config job ([#1946](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1946)) ([5a8977b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5a8977bfa1a8e5e4a4e06b99c866e88bc868030d))
* **ci:** add mcp-query tombstone to live-coverage gate ([#1838](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1838) follow-up) ([f32acba](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f32acba0cdccda7dd4e7cb839c67b802db75a008))
* **ci:** adiciona basic-ftp/get-uri/pac-proxy-agent/proxy-agent ao allowlist lhci ([#1968](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1968)) ([5cef50f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5cef50fce00a575066e5cda85fb95740c38107a6))
* **ci:** alinha SSOT e guard ao ruleset ativo ([62dff90](https://github.com/adm01-debug/Promo_Gifts_V4/commit/62dff9043098e7a1e16403781c20df563b1b6981))
* **ci:** bloqueia drift com ledger divergente ([#1869](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1869)) ([12c11e5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12c11e5dd73056a30dfa023280a77427400a7d34))
* **ci:** C5 injection em delete-orphan-edges.yml ([#1988](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1988)) ([6c2d463](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6c2d463a3dee3841ca5f3c379b09ba8580fe5ba2))
* **ci:** completa a cauda do PR [#1865](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1865) (squash pegou snapshot anterior ao último push) + 3 gates ([#1866](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1866)) ([44857d5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/44857d549bf99d825557bf5fb3aa5d00fcbd3451))
* **ci:** corrige actionlint P1 — substitui uses: rhysd/actionlint por binário + adiciona package.json ao trigger ([#1958](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1958)) ([67f8cb3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/67f8cb3ba7f30dc0a54c7646b5af16e2430d3e52))
* **ci:** corrige cd relativo quebrado no job list-functions (E63) ([#1902](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1902)) ([a79944b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a79944b53f436d428dab1ce9fb5984b31e79489f))
* **ci:** corrige GH013 nos 3 workflows de snapshot restantes ([#1928](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1928)) ([b811438](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b8114385e4c5ab3a604f36675aea508e0395360f))
* **ci:** corrige jq na required-checks-guard — id vs name + .name do objeto ([666c6c0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/666c6c094405524a83d60e15b6a5052695fad007))
* **ci:** E04 — corrige ledger parity: local_only não bloqueia, allowlist para legacy 20260712 ([#1963](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1963)) ([1b760f5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1b760f5cc3a4a59d603a9b6c01f81ce87541f729))
* **ci:** E18 — node-version-file: .nvmrc em freight-quality-gates (R4) ([d7b78ec](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d7b78ec504a53466f8a89297fc636887debbb6f3))
* **ci:** E19 — jitter de cron, elimina :00/:30 e colisões SAT ([566c826](https://github.com/adm01-debug/Promo_Gifts_V4/commit/566c82650c48b5991b37e722492160a5ad8f9cad))
* **ci:** E26 — replenishment-quality credencial-gate ([#1990](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1990)) ([82679d7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/82679d72e25083ae89e33a661f89a298ec4b29cf))
* **ci:** E27 — guard credenciais condicional em cart-invariants-smoke ([#2033](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2033)) ([aeb30b0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/aeb30b0b275b8e2eddb8ba3e1b36e27944b7abd1))
* **ci:** E34 — ativa thresholds reais de coverage (removia decorativas) ([#1959](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1959)) ([8a17b8f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8a17b8f1ff717df1157621cfbb67c1715beaebf2))
* **ci:** E84 schema-snapshot-export guard + bot/schema-snapshot deduplication ([9e6342b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9e6342b17e22cdf4dbcb5c8e3e587d64f24b9dc4))
* **ci:** limita baselines ao projeto chromium ([f4002bc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f4002bc59f5cb8e62e4c8410f2507b4d15469383))
* **ci:** psql -1 condicional p/ transaction:none + line-continuation edge-integration ([#1922](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1922)) ([8995011](https://github.com/adm01-debug/Promo_Gifts_V4/commit/89950111c0c21abc0d79addd51d5203e48037561))
* **ci:** reconcilia gates do hardening Magazine ([e348fb9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e348fb936b8e73f24f98693529ccb0e0c6b52ff3))
* **ci:** restaura gates após renovação do Actions ([7ea9b58](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7ea9b5870a641042a955f380a1b90fa00f155eac))
* **ci:** restaura gates live após renovação dos runners ([0b37f75](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0b37f7546451056327ac0a1ecd447407fe568fd7))
* **ci:** SLACK_WEBHOOK exposto como arg posicional no curl (E12/R5) ([#1923](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1923)) ([50d3045](https://github.com/adm01-debug/Promo_Gifts_V4/commit/50d30456c27cd1091f6645605a1ecb81b2a15821))
* **ci:** sync package-lock.json — rollup-plugin-visualizer ^5.0.1 (CI estava bloqueado) ([9bb2e3b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9bb2e3bdcc4c10ede7b8f277cb574e5843ba310d))
* **ci:** torna reconciliação Supabase fail-closed ([#1864](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1864)) ([1d2fafc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1d2fafccdfe516cce2d52e527ec5ce964c99207f))
* **ci:** usar vars.CI_SKIP_FREIGHT_E2E para pular testes de frete em CI ([#1947](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1947)) ([9f3fb31](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9f3fb31e42597ad4065a71f3bcb931bf105a74ce))
* **ci:** valida pooler canonico vivo antes de aplicar migration ([#1874](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1874)) ([bffb3d0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bffb3d039a824a128477c45be026d4774c749a5e))
* **ci:** workflow de baselines cria branch+PR em vez de push direto em main ([60f9340](https://github.com/adm01-debug/Promo_Gifts_V4/commit/60f9340947ed202fde3794448a6106ee9c53c456))
* **codeql:** E96 batch3 — remote-property-injection, tainted-format-string, clear-text-storage ([#2015](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2015)) ([8b268ec](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8b268ec147e83b1d289c537c60fbc206038f0ff2))
* **codeql:** E96 batch4 — insecure-randomness, clear-text-logging, incomplete-sanitization ([43862c8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/43862c8828c89bd9b8c8ab7fa73f1354d42825ee))
* **codeql:** E96 batch5 — gate HIGH+CRITICAL via API (severity=high e severity=critical) ([b100b3c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b100b3cda380b027f63d9b5f3550fa92dde5473b))
* **csp:** add inline script hashes + remove onload event handler ([#1827](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1827)) ([ba50ced](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ba50ced862670fc3f76d05611dc8409e2e41fed1))
* **csp:** T32 — remove unsafe-inline from style-src ([#1823](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1823)) ([2e71ca5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2e71ca518df94cb8141dd9737fe78b92d49f5575))
* **db+ci+security:** auditoria 5 agentes r3 — RLS partições, crons, CSP, uptime + P1/P2 secdef/ACL ([#1825](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1825)) ([00f39d1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/00f39d1e265b08cca01223eee055233324124724))
* **deploy:** torna fallback Vercel verificável ([#1817](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1817)) ([9321ed0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9321ed0adfa9af5e5bfde5faa8e9dff5a3f2d49f))
* **deps:** override image-size ^2.0.4 — corrige HIGH CVEs E05 ([9f4ec00](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9f4ec0019c18a7ff62721cf4815cab0875e651ab))
* **deps:** revert react-router 8→6 e react-router-dom 7→6 (destrava npm ci) ([#1797](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1797)) ([473d1e4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/473d1e43eb34d24659779d508f4a2181f5c62a36))
* **e06:** remove capacity_ml from kit-coverage integration test ([f4f9bdf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f4f9bdfae6a67465ddddc6503c88efac4c20ce11))
* **e13:** remove checkout de setup-node-ci, adiciona checkout explícito nos jobs ([#1969](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1969)) ([7e74a87](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7e74a8734b252bb03388af83911212349970142c))
* **e2e/e21:** auth.setup modo estrito em CI — throw em vez de skip silencioso ([#2029](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2029)) ([803fd39](https://github.com/adm01-debug/Promo_Gifts_V4/commit/803fd39a07e9ff0a4fe9a98ed18ebb3b3be7b594))
* **edge:** CB-3/CB-4 circuit breaker, F-04/F-12 auth hardening, T22/T34 credential SSOT ([#1822](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1822)) ([042423e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/042423efb73be9f2a3996f2df710e2ce14fe46b0))
* **edge:** endurece alertas e restaura handlers ([cbf41f4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cbf41f49a612c6a239956ac540926f04fa60065c))
* estabilização auditada e integrações sem falso verde ([#1799](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1799)) ([bf16e5e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bf16e5eb45ec08407f7ecce868f9b860129853ff))
* **gates:** estabiliza Lighthouse e scanner de contratos ([7427180](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7427180ffcc145a6d9a9909371dc570904ef2a92))
* **gates:** restaura validação canônica e contratos transacionais ([26a8f3c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/26a8f3cfcc68316a489fd9f9a6f67d72fef97743))
* **governanca:** reconcilia catálogo de RPCs do Kit Maker ([ff19674](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ff19674cfadfc34b288dda504dfc8c8deebe1185))
* **governanca:** reconcilia RPCs do Kit Maker ([61b3ced](https://github.com/adm01-debug/Promo_Gifts_V4/commit/61b3ced6202016551c5d3601f1b2e42c52276812))
* **intelligence:** declare useQuery data before use in MarketIntelligenceInsightsCard (TS2448 + runtime TDZ) ([5a0bf18](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5a0bf183efac3b0f3dc9ad6db70bd22179e47f24))
* **intelligence:** fix use-before-declaration of useQuery data (TS2448 + runtime TDZ crash) ([d07d370](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d07d3702605dcf1baceb09fa575dade5cc39ac57))
* **kit-builder:** corrige mismatch de timeout IA + fecha gaps de cobertura (auditoria pós-merge [#1891](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1891)) ([#1896](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1896)) ([a63a833](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a63a8337ec6699e7034df6055f3aff9b0f1e45b3))
* **kit-builder:** estoque em erro + overflow do badge (achados pós-merge da [#1892](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1892)) ([#1893](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1893)) ([c264eaf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c264eaf642de55efbb10e35a5ad23eb7e4acf159))
* **kit-builder:** inclui material na busca de caixas do Kit Maker ([#1886](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1886)) ([17edc55](https://github.com/adm01-debug/Promo_Gifts_V4/commit/17edc5594406a95f09ec3da26ab39736393ee75a))
* **kit-builder:** peso desconhecido no frete nunca vira zero silencioso ([#1887](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1887)) ([a613b80](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a613b80649068a0c1f26db52efb346728cbeab1d))
* **kit-builder:** zera retry de IA + documenta armadilha de TZ no vitest ([#1898](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1898)) ([2c70b37](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2c70b3759ef46b2b8ba2042e41556d9aadcf1b22))
* **kit-library:** preserva tipo na duplicação ([5402f7a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5402f7a2a389ecda744d331ab2cb7b823263fc05))
* **kit-maker:** bloqueia caixas incompatíveis ([ede2e02](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ede2e027007e5236cadbd1f5d88bc8db2805d0d4))
* **kit-maker:** bloqueia itens sem preço comercial ([4262d4a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4262d4a6c9d8ffd74f85dabd80034342287dd89d))
* **kit-maker:** harden pricing, stock and persistence ([d449783](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d449783b87a3536549de9bb3b3a9135232f3617a))
* **kit-maker:** reforça integridade de montagem e orçamento ([#1859](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1859)) ([8929214](https://github.com/adm01-debug/Promo_Gifts_V4/commit/892921430a52ad6c997ce9080131290843a7e553))
* **kit-maker:** torna falha de catálogo recuperável ([1f68f1c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1f68f1c95fbacebfa6c392bf295b6be78af0e670))
* **kit-maker:** usa padrão acessível nos cards ([d429d55](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d429d55b31b2f779c15bd7321d6b51d9807ae70b))
* magazine header buttons - h-9 text-xs px-3 padrao catalogo ([eeca350](https://github.com/adm01-debug/Promo_Gifts_V4/commit/eeca35058c85b00e18162f41e78aeeb6e0eec3fb))
* **magazine:** 6 bugs auditoria — create/duplicate API, toast encoding, pgPill h-9, w-44, dead imports ([25d66ac](https://github.com/adm01-debug/Promo_Gifts_V4/commit/25d66ac1d427ea02154db03761abaaebe20060f0))
* **magazine:** confirma publicação pelo trigger canônico ([b3d75a6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b3d75a65572e16f78e6d0800e91b5e18e8dd9da3))
* **magazine:** corrige goToStep, previewSheetOpen e merge raso de branding ([#1845](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1845)) ([937d5f7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/937d5f7ca5a32266c13cf8cc919d72eedb4dc75d))
* **magazine:** corrige regressões da revisão final ([095d4cd](https://github.com/adm01-debug/Promo_Gifts_V4/commit/095d4cdb97fccadaeb53a31bccd448bdff356bb6))
* **magazine:** crashes de template, fail-open em edge pública e teste órfão no CI ([#1899](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1899)) ([e48e660](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e48e660301c8612c7d141ce815ab38fa60eec57c))
* **magazine:** desativa Blue Premium theme — restaura design system original ([d0e02d1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d0e02d1cb3ebae6cba5874767e08551d1154445f))
* **magazine:** favoritos múltiplos e reconciliação do plano ([#1957](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1957)) ([ec53642](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ec53642257c5e4ed227a8d7502215e770430d65b))
* **magazine:** fecha 3 gaps pós-auditoria do PR [#1846](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1846) ([#1848](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1848)) ([905f782](https://github.com/adm01-debug/Promo_Gifts_V4/commit/905f782b39f86a7bb4ae3bad6274dcc090ab38b9))
* **magazine:** fecha auditoria ACL e índices de idempotência ([367ada1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/367ada1eb6d54b9df7fded8272cd4e24507b7be0))
* **magazine:** fecha gaps de escala e duplicação ([55dae04](https://github.com/adm01-debug/Promo_Gifts_V4/commit/55dae04127701cad63b1a2c4876ada0a0930df03))
* **magazine:** fecha publicação atômica e gaps da revisão ([a3e5925](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a3e59259217248df4c7a4707afdbc481181bbde3))
* **magazine:** handleDuplicate null guard — evita crash quando duplicate() retorna null ([bb5f90b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bb5f90b115c3cd0012e55cdc8f0166dfb5a4e070))
* **magazine:** mutações M4-M6 + remoção de glow laranja no sidebar ([#1843](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1843)) ([bf18c18](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bf18c189e58838a9e8da4a9e731225291163f3d9))
* **magazine:** protege autosave e corrige fluxos auditados ([e44377e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e44377ee64b5dd5fd4a83b769496a535375a79b0))
* **magazine:** protege recuperação e catálogo legado ([#1955](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1955)) ([de1c5f9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/de1c5f949145b77d60ed2460a743cd070c925472))
* **migrations:** mantém baseline no CLI explícito ([cda54f3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cda54f39e92cf50234bf16f15fb53ef0e6e7322e))
* **migrations:** preserva snapshots remotos legados ([ee003a2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ee003a2811653247d1bb08fe4e3bafe8806aa0f5))
* **products:** adiciona padronizacao_id back-link em fn_promote_padronizacao e backfill 522 produtos ([92690bd](https://github.com/adm01-debug/Promo_Gifts_V4/commit/92690bd8491d787140d7a61153a4f86506d548cc))
* **quality:** gates de segurança que passavam sem verificar + cobertura do estoque ([#1861](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1861)) ([8fcce47](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8fcce47036868f20f427aa8e6c92fee65234c150))
* **quality:** restaura coleta E2E e gates web ([3957504](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3957504fa106f88dd257370af0d487a4e686e34f))
* **quotes:** conclui contrato transacional e concorrência das RPCs ([#1881](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1881)) ([bce90b1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bce90b134c42062a9a7d42028386f051b145e0c0))
* **quotes:** preserva variantes e associa personalizacoes aos itens validos ([#1878](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1878)) ([796a52f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/796a52f075c532344b02179fcd5aac2cb260d65d))
* **reconciliacao:** integra correcoes e estabiliza gates ([c9cb175](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c9cb175f58ed1edda57aa5f2d89ca6d42fbb053b))
* **reconciliacao:** simula cadastro, prepara alternativa segura e protege E15 ([#1872](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1872)) ([2a5b9f1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2a5b9f135eb0547052e707181d2f9ad51b707407))
* **reconciliacao:** tipos canônicos, advisors e snapshot sem falso verde ([#1870](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1870)) ([bb59efc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bb59efcd7e1a989066f06c87aba542213a258538))
* restaura CLAUDE.md completo sobrescrito por engano (guard graphify mantido no final) ([9c26d33](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9c26d33e05281a10886078ca6a06e16961ae34b5))
* **review:** completa grants e auditoria transacional ([f65b586](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f65b58644a956536dca4c41ec2fabcbdcdc65a39))
* **review:** fecha gaps de integridade e falso verde ([291407f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/291407f198cc1a1d5bdf1a33ef235af5d414eff3))
* **review:** valida payloads e preserva decisões acionáveis ([c62e177](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c62e177adf0f02fe151c6be6bdc7c688fb07c42f))
* router v7 flag + husky heap + eslint baseline ([c453048](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c4530480222494f702c4a66bb78e7a86f85f7504))
* **runtime:** elimina ciclos de chunks e falhas HEAD ([554dcb6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/554dcb62b422503dffaf8d79d359f020ad172c3f))
* **scripts:** corrige imports de existsSync em check-clickable-drift e check-bundle-size ([#2017](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2017)) ([824d087](https://github.com/adm01-debug/Promo_Gifts_V4/commit/824d08739aaf248c3b8aed997a722b91d824b14a))
* **scripts:** E96 — elimina 7 alertas CodeQL HIGH js/file-system-race (TOCTOU batch 2) ([#2014](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2014)) ([f149986](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f149986e041959818b93b6fbc774e83bdca98a65))
* **scripts:** E96 — elimina 8 alertas CodeQL HIGH js/file-system-race (TOCTOU existsSync) ([#2013](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2013)) ([2dd8768](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2dd8768d835e8d86f45c7232cd0263cb0e475d6c))
* **security+db+ci:** auditoria r3 — relatório 8.1/10 + execução dos quick wins ([#1830](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1830)) ([d1056c1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d1056c1ead6701e0fdc7358baedd08c1deff1773))
* **security+db:** auditoria 5 agentes r4 — SEC-001 + GAP-FUNC + BUG-1 ([#1828](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1828)) ([9ef07bf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9ef07bf671507d6802e326e6e01c73889258fbe2))
* **security:** audit R4 — BUG-3 v2, CRIT-1, SEC-006 a SEC-010 ([#1829](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1829)) ([97e1b2c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/97e1b2c2db5d1fd74983428f32792737c4ea75ae))
* **security:** endurece auditoria de dependências ([#1851](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1851)) ([55e598d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/55e598d3e30b49adc218e43c67dfbe64136deae8))
* **security:** public/_headers texto correto + CI headers-mirror + pkg script ([dacecb6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/dacecb64a34d65dcabc46ddd1301a2c5ed363192))
* **security:** revoga EXECUTE de authenticated em zapp_catalog_stats + registra migration órfã ([#1863](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1863)) ([64cc277](https://github.com/adm01-debug/Promo_Gifts_V4/commit/64cc27731c6cc8fecb80ed45791676a192c19d13))
* **security:** sync public/_headers CSP com vercel.json — remove unsafe-inline e corrige sha256 ([fea0824](https://github.com/adm01-debug/Promo_Gifts_V4/commit/fea08249dd7c3947d7062eb8a58e0614e531ee7d))
* **supabase:** registra RPC atômica no catálogo ([a8fd369](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a8fd369fcdea7e8644bcaeffb0f33fc06ee9940b))
* **supabase:** registra RPC atômica no catálogo ([0d0a580](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0d0a58083d29a738d669df4729d6df94d08c5e19))
* **supabase:** restaura tipos do schema canonico ([b032ed7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b032ed73f0f54c7d8b08a405d0c61382b43f574a))
* **supabase:** restaura tipos do schema canônico ([ecd3b78](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ecd3b782f9df0e00d0c145cc891173e7ab7f206a))
* **sw+hooks+security:** fecha os 6 achados restantes da auditoria de 5 agentes ([#1841](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1841)) ([f826ab8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f826ab823f65c24ec068e423964c7cb11ffd0dfd))
* **sw+hooks:** 3 achados de auditoria adversarial (5 agentes) — teste falso-positivo, deadlock de reload, lastStaleAt não durável ([#1838](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1838)) ([4cd69a9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4cd69a98f6ea7545e24e57b8b4bd698dc2207827))
* **sw:** bypass de SW para chunks de bootstrap (cross-world preload mismatch) ([#1836](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1836)) ([c115bcb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c115bcbb95206b7b9f83491b030aee76ee58db66))
* **test:** adiciona QuoteFreightBlockHarness à allowlist do contrato freight-grid ([#1929](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1929)) ([86d9af8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/86d9af83952f583d0e6228f98830603b4c6dc463))
* toolbar pills h-11 -&gt; h-9 para consistencia com catalogo ([f5efa97](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f5efa970a7957c51a18a6283e34349ffd339dd78))
* **types:** corrige category_id de number|null para string|null em product.ts ([#1850](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1850)) ([8d7c33f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8d7c33ffbfca9160d18babb8266b0d36bf4cdb15))
* **types:** detecta perdas de colunas e falha fechado sem evidencia ([#1876](https://github.com/adm01-debug/Promo_Gifts_V4/issues/1876)) ([4469f27](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4469f27a80050dcb0725c10a4ddfab283b5dbe58))
* **vercel:** impede sourcemaps órfãos no deploy ([0afcfa1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0afcfa13924542d6cb568afdd90d838374c5f183))
* **vercel:** remove lookahead negativo de source pattern — bloqueava deploys ao main ([f4c900e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f4c900ef9e5cc94fdcf26d91531b94197aec9f31))
* **wave1:** corrige integrações e prepara migrations forward-only ([5ba8118](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5ba81180bea9f39e7e0c76727623700f04efce48))
* **wave1:** integrações e migrations forward-only auditadas ([7f6690a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7f6690a01d94a5e2496ddfe807e08622885690ea))


### Performance Improvements

* **magazine:** otimiza RLS das partições de analytics ([918cc41](https://github.com/adm01-debug/Promo_Gifts_V4/commit/918cc41e246ca5a0e1448c265e81600cbc949782))

## [Unreleased]

### 🔬 Auditorias técnicas r1→r3 e hardening (2026-09-01 → 2026-09-05)

Relatórios em [`docs/reports/`](./docs/reports/README.md). Nota ponderada 7.8 → 8.0 → 8.1.

- **#1819** ratchet `noUnusedLocals` (`ts-unused-ratchet.yml`), `as any` removido de `auth.ts`.
- **#1820** T38: bypass `X-Simulation-Bypass` removido de `visual-search`/`product-visual-search`; T22 select explícito em `admin_audit_log`.
- **#1822** F-12: client service-role só após `authenticateRequest()`; T17 circuit breakers em edges de HTTP externo.
- **#1824** relatório r2 (20 dimensões, 8.0/10).
- **#1825** RLS nas partições `spr_history` + causa raiz em `fn_purge_spr_history`; crons 32/297 reescritos; CSP sem `data:` em `script-src`; Uptime Monitor a cada 15 min; smokes 31/33/38 alinhados ao hardening.
- **#1826** bump de deps (grupo npm_and_yarn).
- **#1827** CSP: hashes sha256 para os 2 inline scripts e remoção do handler `onload`.
- **#1828** r4: SEC-001, GAP-FUNC, BUG-1; guard da `fn_run_and_persist_smoke_tests` por role.
- **#1830** relatório r3 (8.1/10) + execução: `secret_scanning_push_protection` ligado, `delete_branch_on_merge`, optimistic locking em `seller_carts`, guard de rate limit para INSERT anônimo (6 tabelas de telemetria), REVOKE anon em `analytics.mv_product_compositions`, cron `pgrst-schema-reload` de 15 min → hora, Lighthouse medindo `/` além de `/auth`, alerta de deploy falho, uptime cobrindo `check-login`, `types.ts` regenerado, `STATUS.md` aposentado, `docs/incident-response.md`, `docs/runbooks/` fundido em `docs/RUNBOOKS/`.
- `useSellerCarts`: mutações de notas/status/prazo condicionadas a `seller_carts.version` (optimistic locking; 0 linhas → `CartVersionConflictError` + refetch), com teste de contrato `useSellerCarts.versionGuard.test.tsx`.
- Em aberto: **#1829** (SEC-006..010 — migrations já aplicadas no banco, código da edge `check-login` fail-closed pendente de merge + `CF_ORIGIN_SECRET`); #1823 fechado em favor de #1831 (T32 real via nonce/CSSOM).

### 🔍 Auditoria Exaustiva — Módulo BUSCA GLOBAL (2026-05-27)

**Branch**: `claude/global-search-audit-AsGQa` · **Auditoria**: [`audit/BUSCA_GLOBAL_BUG_AUDIT_2026-05-26.md`](./audit/BUSCA_GLOBAL_BUG_AUDIT_2026-05-26.md)

20 bugs corrigidos no módulo de busca global. Abaixo o resumo agrupado por categoria:

#### 🐛 Stale Closures / Dependency Arrays (BUG-GS-03, 04, 08, 18)
- **BUG-GS-03/18** (`useGlobalSearch.ts`): `handleVoiceAction` useCallback deps corrigidos — adicionados `setQuery` e `setResults`; previne stale closure nos casos `search`, `filter` e `clear`.
- **BUG-GS-04** (`AdvancedSearch.tsx`): mesmo padrão — `setQuery` adicionado às deps do `handleVoiceAction`.
- **BUG-GS-08** (`GlobalSearch.tsx`): `handleResultClick` envolvido em `useCallback` e adicionado ao array de deps do `useEffect` de teclado.

#### 🐛 UI Rendering Conflicts (BUG-GS-02)
- **BUG-GS-02** (`GlobalSearchPalette.tsx`): para `query.length === 2`, `EmptySearchState` + hint "Continue digitando" + typing suggestions renderizavam simultaneamente. Corrigido: threshold do `EmptySearchState` elevado de `>= 2` para `>= 3`, alinhado com o limiar real do `performSemanticSearch`.

#### 🐛 Regex Stateful Bug (BUG-GS-01)
- **BUG-GS-01** (`HighlightMatch.tsx`): regex global (`gi`) reutilizada no `.test()` após `.split()` — `lastIndex` avançava e produzia alternância true/false, fazendo metade dos highlights ser perdida. Corrigido: regex de split (`gi`) separada da regex de teste (sem flag `g`, com `^...$`).

#### 🐛 LocalStorage Unification (BUG-GS-05)
- **BUG-GS-05** (`EmptySearchState.tsx`): chave `'recent_global_searches'` (formato `string[]`) desconectada da chave canônica `'global-search-history-v2'` (formato `HistoryItem[]`) usada por `useSearchHistory`. Histórico divergia em partes diferentes da UI. Corrigido: `EmptySearchState` agora lê/escreve na chave unificada.

#### 🔒 Segurança e Privacidade (BUG-GS-06, 14)
- **BUG-GS-06** (`useGlobalSearch.ts` + `searchCache.ts`): cache LRU de módulo não era limpo no logout. Usuário B podia ver resultados de pesquisa do Usuário A na mesma aba. Corrigido: listener `supabase.auth.onAuthStateChange` chama `searchCache.clear()` no evento `SIGNED_OUT`.
- **BUG-GS-14** (`useGlobalSearch.ts`): queries brutas gravadas em `search_analytics.search_term` podiam conter CPF, CNPJ ou e-mail. Corrigido: função `redactPii()` aplicada antes do insert — substitui padrões sensíveis por `[REDACTED]` (LGPD compliance).

#### 🔒 Error Handling (BUG-GS-07)
- **BUG-GS-07** (`GlobalSearchPalette.tsx` + `useGlobalSearch.ts`): falhas de rede ou timeout da edge function resultavam em "nenhum resultado" sem qualquer feedback. Corrigido: estado `searchError` exposto; banner de erro sutil renderizado na UI.

#### 🧹 Código Morto / Dead Code (BUG-GS-09, 13)
- **BUG-GS-09** (`SmartSuggestions.tsx`): componente nunca importado (o `SmartSuggestions` real vem de `CartUtilComponents.tsx`). Arquivo deletado.
- **BUG-GS-13** (`GlobalSearch.tsx`): export `useGlobalSearch` legado colidiria com o hook real em `useGlobalSearch.ts`. Renomeado para `useLegacyGlobalSearch` com tag `@deprecated`.

#### ♿ Acessibilidade (BUG-GS-12)
- **BUG-GS-12** (`GlobalSearchPalette.tsx`): botão trigger da busca global sem `aria-label` e sem `aria-haspopup`. Adicionados `aria-label="Abrir busca global"` e `aria-haspopup="dialog"`.

#### 🐛 SpeechRecognition Leak (BUG-GS-11)
- **BUG-GS-11** (`SearchWithSuggestions.tsx`): cada clique no botão de voz criava nova instância de `SpeechRecognition` sem cancelar a anterior — instâncias concorrentes disputavam o microfone. Corrigido: `recognitionRef` + `abort()` antes de criar nova instância.

#### 📊 Popular Products Query (BUG-GS-10)
- **BUG-GS-10** (`useGlobalSearch.ts`): query de "produtos populares" buscava apenas os 100 registros mais recentes de `product_views`, o que favorecia produtos recém-vistos, não os mais vistos. Limite aumentado para 1.000 para melhor aproximação de frequência real.

#### 🧪 Novos Testes (T15–T17)
- `src/components/search/__tests__/HighlightMatch.test.tsx` — 10 casos (regex alternância, diacríticos, múltiplos matches)
- `src/components/search/__tests__/searchCache.test.ts` — 18 casos (set/get/TTL/LRU/clear — regressão BUG-GS-06)
- `src/components/search/__tests__/searchStates.test.ts` — 25 casos (condições de render mutuamente exclusivas — regressão BUG-GS-02)

---

### 🚀 Redeploy 2026-05 — Fase 2 (T19–T23) + Fase 3 (T24–T30)

**Fase 2 — Segurança P1 (PR #166)**

- T19: 10 views SECURITY DEFINER refatoradas para `security_invoker=true` + REVOKE de anon
- T20: 7 materialized views movidas de `public` para schema `analytics` com wrapper views (frontend não muda)
- T21: 17 policies `USING(true)` expostas a `public`/`anon` — 2 restritas (suppliers/preços) + 15 documentadas via `COMMENT ON POLICY`
- T22: branch protection + Dependabot + Secret Scanning ⏳ (`docs/redeploy/REDEPLOY-FASE2-CHECKLIST-UI.md` — ação UI manual)
- T23: 2 buckets públicos fechados (`recibos-entrega`, `scripts`); policy `recibos_authenticated_read` ⏳ (limitação técnica documentada: `storage.objects` pertence a `supabase_storage_admin`)
- T3: `docs/DEPLOYMENT.md` reescrito (removida instrução perigosa `supabase db push`); CI guard `check-no-db-push.mjs` instalado
- Reviews endereçadas: 7 CodeRabbit + 1 Codex P1 crítico (sentinel push-only) + 4 Copilot + 2 Codex P2

**Fase 3 — Hardening 10/10**

- T24: 2 dos 5 arquivos de teste skipados re-habilitados (`SidebarFocusVisible`, `SidebarNavGroup.harmony`); 3 restantes (collapse/history/suspense) mantidos com justificativa rastreável atualizada
- T28 piloto: 36 funções SECURITY DEFINER (audit/auto/build/cleanup/purge/enforce/sync) revogadas de `anon` + `authenticated`. Advisor: **651 → 578 WARN entries** (-73). Critério C2 do plano atingido
- T28 guard: `scripts/check-security-definer-hardening.mjs` bloqueia migrations novas adicionando função SECURITY DEFINER sem `search_path` + REVOKE de anon
- T26: inventário formal de observability — Sentry + structured logger + webhook metrics + request_id ponta-a-ponta. Gaps catalogados para Fase 4+
- T29 (este entry) + T30 sign-off: ver `docs/redeploy/REDEPLOY-FASE3-FINAL.md`

### 🚀 Adicionado — Hardening 10/10 (Onda 1)
- ESLint integrado ao pipeline de CI (`.github/workflows/ci.yml`)
- Verificação HIBP (Have I Been Pwned) habilitada para senhas fracas/vazadas
- Hardening de RLS em buckets públicos de Storage (UPDATE/DELETE restrito ao dono)
- Template de Pull Request com checklist obrigatório (`.github/pull_request_template.md`)
- Dependabot configurado para atualizações semanais de npm + GitHub Actions
- Cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) em `public/_headers`
- Coverage threshold elevado de 50% → 60% em `vitest.config.ts`
- Husky pre-push hook executando `npm run test` antes de push para prevenir regressões

### 🔒 Segurança
- CSP restritivo com allow-list de domínios externos (Supabase, Cloudflare Stream, CNPJa, OpenAI, Gemini, ElevenLabs)
- HSTS com `preload` (max-age 2 anos) — preparado para inclusão na lista HSTS Preload do Chromium

---

## [3.4.0] - 2025-04-10

### Adicionado
- Sincronização de orçamentos com SalesPro v3.4 (4 casas decimais em `unit_price`/`total_price`)
- Sistema de assinatura eletrônica de orçamentos (MP 2.200-2/2001)
- Workflow de aprovação de descontos com alçada por vendedor

### Corrigido
- Race condition em `acquire_ai_quota` (lock pessimista adicionado)

---

## [3.3.0] - 2025-03-25

### Adicionado
- Suíte Magic Up de marketing com IA (Gemini 3 Pro / Nano Banana Pro)
- Comparador de produtos com chave composta (productId::variant_id)
- Sistema de coleções privadas

---

## [3.2.0] - 2025-03-10

### Adicionado
- Catálogo com busca semântica (8 níveis + re-rank pg_trgm)
- Sistema de Estoque Futuro com previsões de reposição
- Multi-variant carousel nos cards de produto

---

## [3.0.0] - 2025-02-01

### 💥 Breaking
- Plataforma fechada: sign-up público desabilitado, cadastro apenas via convite admin
- RLS migrado para arquitetura SECURITY DEFINER + has_role()

### Adicionado
- 50 Edge Functions com validação Zod (100% de cobertura)
- Anti-scraping: bot detection + rate limit persistente + anti-hotlinking
- Logger estruturado (`src/lib/logger.ts`) substituindo todos os `console.*`

[Unreleased]: https://github.com/promo-gifts/app/compare/v3.4.0...HEAD
[3.4.0]: https://github.com/promo-gifts/app/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/promo-gifts/app/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/promo-gifts/app/compare/v3.0.0...v3.2.0
[3.0.0]: https://github.com/promo-gifts/app/releases/tag/v3.0.0
