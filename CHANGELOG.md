# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## 1.0.0 (2026-10-25)


### Features

* **auditoria:** sprint 2 — gate boundary entre pages + painel admin de sessões ativas ([#2172](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2172)) ([34a3a4a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/34a3a4ad849475169af71fbd3230f00c30748244))
* **ci:** drift-check replaya baseline do schema vivo; conserta composite actions ([#2168](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2168)) ([ee0a467](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ee0a46775bc51a27134ced0f408839091ab016e5))
* **ci:** E40 — secrets-inventory-check em cron com ci-issue na violação ([#2206](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2206)) ([4cf0cda](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4cf0cda79a665a3b5d5380100991bd0947fce096))
* **ci:** E72 — CODEOWNERS cobre snapshots visuais + script de cobertura ([#2210](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2210)) ([9640132](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9640132d900cd5cf786407011152230b59379810))
* **ci:** E87 — métricas semanais retention-days 30 + E26 trace.zip exclusion ([#2225](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2225)) ([11773a7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/11773a73787ad9ef71f6219ab90b9f9c96d089b2))
* **ci:** E89 — script de validação de colisão de crons privilegiados ([#2199](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2199)) ([b416294](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b416294a22e379f3f2aaf1e1b6689f6ad2f4f855))
* **ci:** Gate 0/1/1.1/1.2/1.3/1.7/1.9/E2E — fixes SSOT, types drift, TSC ratchet, Turnstile bypass ([4179c01](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4179c01480d4585db07b8087903bac57c21e04c8))
* **db+ef:** FASE B — P02/P08/P19 migrations + send-notification idempotency ([#2441](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2441)) ([90c6492](https://github.com/adm01-debug/Promo_Gifts_V4/commit/90c6492bc5960c0aa4135e1b313eefadad7a9a1d))
* **db:** FASE B — P03 ANALYZE em 5 tabelas com estatísticas obsoletas ([15dd563](https://github.com/adm01-debug/Promo_Gifts_V4/commit/15dd563b83c4c6dbcd53f07db2ad42557e580da6))
* **db:** P01 auth header cron job image-dimensions-backfill ([8eeeca9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8eeeca9b36d2357418b991efab888361818d06cd))
* **domain:** state machines de transição de status para DAR, password reset e magazines (padrão quote-status-config) ([#2187](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2187)) ([54d481f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/54d481fc168c6810ca2f2c6b7763fd5d621ef43e))
* **drift:** baseline replay robusto — keywords, dollar-quote, quotes-templates fix ([#2171](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2171)) ([c41dfe7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c41dfe7e7a56fbbc4c58f9d2d45f218811bcf962))
* **edge-fn:** F8 — 25 arquivos supabase/functions/ ondas 9-19 [APROVADO F8] ([d7cc99a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d7cc99a3ee6171534eaaea3e2a65e38ce76eb616))
* **edge-functions:** F8 de [#2228](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2228) — 25 arquivos supabase/functions/ (ondas 9-19) ([d6f8b8d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d6f8b8d25ab0dd95912ffb7b9c711b91d916a158))
* **edges:** validação zod nas edges de escrita restantes (secure-upload, mcp-server, image-proxy) ([#2185](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2185)) ([17bf2f0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/17bf2f026388d92a5699b4239300cf8071afd261))
* **lgpd:** dialog de anonimização de conta (LGPD) com frase de confirmação ([#2548](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2548)) ([9be832a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9be832a355f0c98fcd22021b4273b16fa0b1aba5))
* **migrations:** F6 — 120 arquivos supabase/migrations + sql-legacy (ondas 4-19) [APROVADO F6] ([334d07c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/334d07c5cc8e7e1df825e3c44d43e7987947cc54))
* **migrations:** F6 de [#2228](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2228) — 120 arquivos supabase/ (ondas 4-19) ([1575b95](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1575b9580edbb54b54aa2f1e1faaf941f5998292))
* **obs:** propagação de x-request-id cliente→edge→log para tracing ponta-a-ponta ([#2188](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2188)) ([14444d2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/14444d23ff0559de01f020ca1fa2a2cca155025d))
* **qa:** script probe_e184_legacy_refs — varredura de refs legadas pqpdolkae ([#2426](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2426)) ([7f5d410](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7f5d410a233246c94ee05bc0be6c10be11a3f126))


### Bug Fixes

* **analise-prs:** remove ID proibido do heading SINGU + corrige veredictos tabela final ([4319780](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4319780d8e9f806712d1c059364ac1f5a2542466))
* **audit:** adiciona ROLLBACK explícito inline à migration P10 fn_cron_guard ([#2500](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2500)) ([f857782](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f857782b38b957e4dedb6f1420131606366cca1c))
* **audit:** corrige cast ::regrole em audit_security_definer_acl — previne HTTP 500 no PostgREST ([dcf7dc7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/dcf7dc70f39eae1d231e9293cd03e79227c05d56))
* **audit:** P10 teste local genuíno + P12 verificação viva jobid=222 ([fb0b3c1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/fb0b3c16c7bdb5245a5f6116f2127727eaf1b58b))
* **auth:** SSOCallbackPage trava login OAuth — callbacks derivados de user fora das deps ([#2196](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2196)) ([73c4c05](https://github.com/adm01-debug/Promo_Gifts_V4/commit/73c4c0531594c79bc160c82402f059d89227c928))
* BI copilot bloqueia dados mock de entrarem como dados reais ([f87c4b1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f87c4b1f45af353c9ad19185eea192a24b8c1327))
* **bi:** remove mock data de BI, usa isMock flag para omitir campos ([#2554](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2554)) ([e653844](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e6538448e6edc639f9131e809ae265976b43f208))
* **cart:** restaura descrição de toast com 'pronto para orçamento' em CartStatusSelect ([ea0fb09](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ea0fb09f15f7b0c092d79bb2c28e614a3ee58237))
* **categories-api:** remove fallback legacy para tabela inexistente product_categories ([3e1adf1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3e1adf1da65c823d850b6e0f8aabc6c3313a9852))
* **ci/db:** causa raiz dos locks (snapshot sem dump em PR), backfill primary_image_url, recibos ([12fda66](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12fda6661e2d6f510c6d16ba657ac34878ae2804))
* **ci/db:** causa raiz dos locks, backfill primary_image_url, recibos ([#2163](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2163)) ([12fda66](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12fda6661e2d6f510c6d16ba657ac34878ae2804))
* **ci/db:** lock_timeout real no apply, push E32 restaurado e migrations separadas ([1a07395](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1a07395613ca8bb6fde5ed7b40c5347ce21801b8))
* **ci/db:** lock_timeout real no apply, push E32 restaurado e migrations separadas ([#2159](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2159)) ([1a07395](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1a07395613ca8bb6fde5ed7b40c5347ce21801b8))
* **ci/E15:** lock_timeout e statement_timeout valem de verdade no apply ([b3e2ce6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b3e2ce6f65fc4d3e5fe9fab9d0508404a41ad84e))
* **ci/E32:** actionlint limpo nos 16 workflows de push ([79af538](https://github.com/adm01-debug/Promo_Gifts_V4/commit/79af538d6f23fa375833c689bdc804f3c6f06ff4))
* **ci/E32:** restaura git push nos 17 jobs que perderam credencial ([aa940e5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/aa940e5982b258cdb1f4850087a33e9fd453ff52))
* **ci/security:** R5 — PGPASSWORD env var em schema-snapshot-export ([#2227](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2227)) ([e839bda](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e839bda28e4fed75490762ad6ab516f81bdba67e))
* **ci+security:** Wave 1 — E011-E020 correções E2E, CI e edge functions ([#2180](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2180)) ([aaca09f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/aaca09f9581f72daf0137ff16917d63c2cc3467b))
* **ci+ui:** corrige 6 workflows falhando — rAF, overflow, tooltip, virtualização, timeout ([#2378](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2378)) ([6844b8f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6844b8f255cbbcfda93b1881eef52ef38bf18aaa))
* **ci:** adiciona 5 repair_only markers na baseline reconciliada (Gate 1.3) ([cfabab2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cfabab26bf5d79b7a012b87b90ab3979bff341c7))
* **ci:** adiciona marcador legado em A5_VALIDATION_REPORT.md linha 20 ([c5a008e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c5a008e588e51e08c3cefb662a803d525b4115fd))
* **ci:** adiciona recibos E15 das migrations REVOKE no MIGRATIONS_SYNC_LOG.md ([305e476](https://github.com/adm01-debug/Promo_Gifts_V4/commit/305e4763dfccbbac7f3c50807df99a5ed146da66))
* **ci:** adiciona refs de inventario/branches.json ao migration-refs-baseline ([#2412](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2412)) ([ad21b02](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ad21b02bdc866bcf2f3798183aff382fe35e8d8e))
* **ci:** adiciona retry para HTTP 521/500/503/504 em check-rpc-get-profile-and-roles ([7fa5c40](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7fa5c405c3435824d92fe4551c2d56d34b1f35f5))
* **ci:** allowlist 634 versões remote_only no ledger de migrations (Gate E40) ([205c568](https://github.com/adm01-debug/Promo_Gifts_V4/commit/205c5688d9d88040b07b1965b8c6fab8c2c6bad0))
* **ci:** allowlist migrations 20261022194* no gitleaks (REVOKE false-positive) ([f27df1b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f27df1bf543da72b5e4aefbacd2975a8fc66fc60))
* **ci:** atualiza PENDENCIAS.md — Quote Builder tooltip confirmado como pré-existente ([55adfac](https://github.com/adm01-debug/Promo_Gifts_V4/commit/55adfac34beec7e39674df08597253240091ff1e))
* **ci:** aumenta retries e timeout no Quote Builder Delivery Quality (E104) ([8346538](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8346538b56288854d6e7885a4be130bd8804e4d4))
* **ci:** aumenta timeout quality-gate de 30→60 min (E24: E2E full/nightly) ([#2517](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2517)) ([3affff6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3affff6d93c6caaa4ed0229c23255ba4e2f7bcc7))
* **ci:** aumenta timeout quality-gate de 60→90 min (P19b: 1265 arquivos vitest) ([#2522](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2522)) ([a29b3a1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a29b3a1983bc48fb508710f4857c2345db78f794))
* **ci:** aumenta timeout quote-number-hardening-verify de 5 para 10 min ([5fe97de](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5fe97ded413fc9fd1fefdfc9f843f7b4468aade6))
* **ci:** boundary gate — lexer string-aware + tabela de cross-domain ([#2232](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2232)) ([f5ecec5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f5ecec52eb76df7825f4bfac64f8dff282be1f20))
* **ci:** bump codeql-action/analyze v3→v3.27.4 ([#2266](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2266)) ([44ee2c8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/44ee2c8c1e4899c568e8d9b862b626fa6ee74c23))
* **ci:** bump codeql-action/init v3→v3.27.4 ([#2265](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2265)) ([c01a78d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c01a78d9fe1220bf5e75c21a104ba3fcc2ec9537))
* **ci:** cart-header-fuzz-report — substitui bunx por npx; documenta P19/P20 e atualiza RELATORIO_CI ([0c7ccaf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0c7ccaf0cf287a77e88265a6f65ab1671c3fdf05))
* **ci:** corrige 5 workflows em failure — actionlint, lint-0011/0029, Gate 1.12, prod-health ([57017ba](https://github.com/adm01-debug/Promo_Gifts_V4/commit/57017ba78eb68c6c72dba336f9c081c4519619c4))
* **ci:** corrige 5 workflows em failure — actionlint, lint-0011/0029, Gate 1.12, prod-health ([cb2706c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cb2706ca6fa03b6295b3ca3f9e423e52ab763f91))
* **ci:** corrige allowlist C24 linha 358→359 após E33 ([#2238](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2238)) ([39cac27](https://github.com/adm01-debug/Promo_Gifts_V4/commit/39cac27cee09cc82dfc7d31011a2e6d0597f9ccf))
* **ci:** corrige Gate 1.3 — baseline com 7 refs de docs de análise ([#2453](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2453)) ([fa62bb7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/fa62bb72b8f0dba68e75c79f38c373005b0798ca))
* **ci:** corrige mensagem de timeout no db-schema-drift-check (9→18 min) ([36f7f29](https://github.com/adm01-debug/Promo_Gifts_V4/commit/36f7f298028d10b656a2bf3afa24c0c14c6a2a78))
* **ci:** corrige registry Docker no drift-check — ghcr.io → public.ecr.aws (CLI 2.101.0) ([a83e1c0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a83e1c0de332315a3afcaa94caba69a06680830b))
* **ci:** corrige SIGPIPE (exit 141) no guard do daily-flows-simulation ([a21f620](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a21f6200b80d5b7ea07b8c53ceaf2ca213b51ef5))
* **ci:** corrige SIGPIPE em daily-flows-simulation + melhora auth validation ([3daebf9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3daebf93d4f1d48992da12590fec02bceba22a65))
* **ci:** E01 — Gate 1.9 exclui arquivos gerados ([#2237](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2237)) ([cb91c2e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cb91c2e3d4ed7d2a5cbe7df95d7308c06d819f38))
* **ci:** E064 — lock migration dessincronizado + correções SSOT ([#2282](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2282)) ([264a22d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/264a22d30c025dfc87680f48fff779924d86bc9d))
* **ci:** E104 override ECR em contract-tests + corrige expectativa audit_http_error_exhausted ([ac0f4e1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ac0f4e10fc9d0197980f1ff3e140578d708f38a9))
* **ci:** E11 — fixtures sentinel-check para check-protection-config ([#2245](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2245)) ([cf9e253](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cf9e25387a24e2975b92404c55526990e00423e2))
* **ci:** E19 — corrige 2 cancel-in-progress com valor invertido ([#2203](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2203)) ([e0acd55](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e0acd552295e66a81c5b18922943445ef0379721))
* **ci:** E22 — adiciona scripts e schema ausentes nos paths de workflows ([#2249](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2249)) ([e5ef522](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e5ef522a7731e84d3bfcbc164eef411fdc1f443e))
* **ci:** E26 — excluir trace.zip de artefatos públicos ([#2242](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2242)) ([66f6ecc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/66f6eccee0cfa5eafd87075b9ad5a0da24e318a9))
* **ci:** E26 — excluir trace.zip de artifacts públicos (credenciais E2E) ([6509810](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6509810564c94d7e5cfb2b8af5496380b7196aff))
* **ci:** e2e-personalization min:1 + supabase-linter timeout não-fatal ([#2489](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2489)) ([6457e24](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6457e24da6558520de5e16589b2d6fdf3ba14f2d))
* **ci:** e2e-quote-view-sticky usa dev server em vez de build+preview ([b5de334](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b5de3342a73abed8f60797c3ad4eada6d2677adb))
* **ci:** E33 — mover credenciais E2E para step-level env ([12af854](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12af85402204de97a2d810dc462ed30de52e5725))
* **ci:** E56 — elimina STATIC_PASS para 429/5xx; retry 3× em supabase-read-only-query ([#2190](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2190)) ([94c405a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/94c405ae4991561f4b4eb207e286032a0e71a54e))
* **ci:** E57 — drift-check retries, consecutive-failure gate, dedupe issue ([#2221](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2221)) ([53d0306](https://github.com/adm01-debug/Promo_Gifts_V4/commit/53d030659b719f5fed55d49b73dd92ba7ff4d97f))
* **ci:** E58 — corrige textos enganosos em required-checks.json e edge-functions-drift-check ([#2213](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2213)) ([b7d63e6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b7d63e6dfdc354bbfb42e9adef5ec4296db09b9b))
* **ci:** E73 — pin Deno v2.1.9 e Bun 1.1.34 em 15 workflows ([#2201](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2201)) ([c3923d1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c3923d1d13570729a5f507c0d50103199e8ffd54))
* **ci:** E89 — corrige 3 colisões de crons privilegiados ([#2202](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2202)) ([d584144](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d5841447713de52fc0216b10b89e03b5a52c237c))
* **ci:** E89/GAP-4 — gate cron spacing em deploy-gates.yml ([2c6a57a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2c6a57ad84665c64f6c734738d3f627e6cedc30e))
* **ci:** fecha evasões reais em 4 gates + destrava Gate 1 da main ([#2197](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2197)) ([8e3eb39](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8e3eb3989c8c41cf24d45b35c8ccb4eed90fb4ec))
* **ci:** Gate 0.5 — adiciona vitest ao allowlist de dependências (E099) ([679b5f4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/679b5f459880a48a45243c1d0810627f3fc54ddd))
* **ci:** Gate 1.3 — baseline refs dossier PR-2449 + progresso.json ([8a92226](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8a92226e1433dd2a7db62ba64e62378cd8447eac))
* **ci:** Gate 1.3 — limpa 7 entradas stale do baseline de refs de migration ([#2454](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2454)) ([eb7a924](https://github.com/adm01-debug/Promo_Gifts_V4/commit/eb7a92479750cec45c7b08ce09bcfe05d407396e))
* **ci:** Gate 1.9 — atualiza baseline de file-size após +4 linhas em useSellerCarts.ts ([489232e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/489232e60a8dbd2e88ebaeac834fbb4a8e37768f))
* **ci:** Gate 5.5 timeout 3→5min — corrige Gate Final cancelled em 1b69cfe7 ([1e07e29](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1e07e298f03d7940d71629f28c5effc72274f940))
* **ci:** Gate 8 — retry HTTP 503 em check-security-definer-acl (E105) ([175a75a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/175a75ad601676ac34f976ab80879dd20881cd8e))
* **ci:** Gate E118f — corrige posição de anotações rls-allow em 11 violações de seller-scope ([3662efb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3662efbcff20fa9ab8ce84e8518c3bbfc8ab75e4))
* **ci:** Gate E118g — adiciona createClientLogger em useSellerCarts.ts ([1af58db](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1af58db2a6b987ea3df087393bfbf82427153f00))
* **ci:** Gate E118h — cria FOTOGRAFIA_PG_CATALOG_2026-08-26.md ausente ([0aac37d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0aac37dabc930527c2b2e37ae42a551212017844))
* **ci:** Gate E23 gitleaks + TS fix + baseline as-assertions + Gate 8 retry 504 ([#2311](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2311)) ([980b078](https://github.com/adm01-debug/Promo_Gifts_V4/commit/980b078395eebea9ba9b7ee149039c8b8335f663))
* **ci:** Gate E89 — corrige 4 colisões de cron entre workflows privilegiados ([ed29091](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ed290910bc89d395e4f4591b74327009769be9f2))
* **ci:** Gate E95 — exclui _shared/ do grep de wildcard CORS (bloqueante) ([2ff7919](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2ff79190a3b7dced784756af6f24c6c09cbcf7fa))
* **ci:** lockfile resync + validate-supabase-config hardening + injection fix ([#2297](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2297)) ([d8b7efd](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d8b7efd4581831ecde10fec4cd680d071e6fa216))
* **ci:** mkdir -p playwright-report antes do touch em e2e-gates (E2E header sticky) ([c58e3a5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c58e3a56db5f3b033897666bcf4d170860f8cd31))
* **ci:** PENDENCIAS.md + retry HTTP 500 em check-security-definer-acl ([6d6ed48](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6d6ed480e62c69bdd46ce9ec0ee1106edf94a385))
* **ci:** policies-baseline abre o PR com o label existente "automated" ([69b500a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/69b500a449fea5f34902bf13398c358fa86b1ff2))
* **ci:** policies-baseline abre o PR com o label existente "automated" ([9c077a5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9c077a5a71cd52b4732330c147cdf5217556d39a))
* **ci:** policies-baseline usa o label "automated" ([#2167](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2167)) ([69b500a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/69b500a449fea5f34902bf13398c358fa86b1ff2))
* **ci:** pre-pull com retry para ghcr.io rate limit no drift check ([f6b1147](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f6b1147745365b868cd09a05896eeb9a552a3e69))
* **ci:** python-package-conda — no-op para eliminar actionlint setup-python@v3 ([#2341](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2341)) ([8e8053b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8e8053b9ed85142e85809783cd3acf9a3077ecde))
* **ci:** recibo 20261019000000 + SEGREDOS PGPORT + allowlist + TS cast ([#2305](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2305)) ([1ac6992](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1ac6992cecf3a604e401e7c311f43b34e4772a4d))
* **ci:** release-please RELEASE_PLEASE_TOKEN + cart-invariants shards 2→3 + diagnóstico E2E ([#2349](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2349)) ([49bb399](https://github.com/adm01-debug/Promo_Gifts_V4/commit/49bb39990489fae21bdc3b584dcfd0d6bca44814))
* **ci:** remove || true desnecessário em daily-flows-simulation (git log -1 sem pipe não gera SIGPIPE) ([6e4cf08](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6e4cf0856072fb69c44c00caf048f9b81bcbc858))
* **ci:** remove E2E_USER_* de workflows chromium-public (sem autenticação) ([5242725](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5242725d1858e2ecec3b20a45e7f700c2b241a33))
* **ci:** remove env: vazio que invalidava 13 workflows no parse (E33/[#2198](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2198)) ([#2214](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2214)) ([dbcc844](https://github.com/adm01-debug/Promo_Gifts_V4/commit/dbcc844ff3084d9bcdd55dd14f11556c794ede46))
* **ci:** remove referência literal a path inexistente em RELATORIO_CI.md ([479c1d8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/479c1d8ffa8ce94610788cdbb9c96fb9d9c50aba))
* **ci:** remove stale baseline entry — Gate 1.3 ([dc2baf6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/dc2baf690f8b8ca00fe8c5620357515af04ccf38))
* **ci:** remove timeout-minutes de jobs com uses: (reusable workflows) ([#2211](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2211)) ([454e637](https://github.com/adm01-debug/Promo_Gifts_V4/commit/454e637dca4ce953083cc7d12b6c2b7d4488cfa0))
* **ci:** remove timeout-minutes de jobs que chamam workflows reutilizáveis ([#2205](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2205)) ([40a2cfc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/40a2cfce29d39404a883dcb43ea34e63645480f4))
* **ci:** retry Management API 544 em verify-quote-number-hardening + documenta 3 novos bloqueios ([070bd2c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/070bd2c7c82747dcb5cf20cca394ae42c0113ddf))
* **ci:** rodada-2 — re-aplica bump upload-artifact v7, respace de crons e boundary gate endurecido ([#2229](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2229)) ([7227b93](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7227b935eadb8a50143942886e3eba86af765604))
* **ci:** schema-snapshot-export só faz dump ao vivo em schedule/dispatch ([f47fefc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f47fefcfbbeb384e15a255eaddcd035ce9d15292))
* **ci:** usa git log -1 para evitar SIGPIPE sem silenciar erros git ([c65aa64](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c65aa646042d8e2bcaa99615bda6fbfeb5252509))
* **ci:** validar auth state antes de regenerar snapshots autenticados ([0aad32d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0aad32d337ed22cc53d4e9851f549221e370708e))
* **ci:** Wave 4 — gates honestos (E41/E43/E46) ([#2186](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2186)) ([594e1f1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/594e1f106b0354bf8bd0225bd6bb8b2d117b4aef))
* **ci:** Zod v4 repair — UUIDs + vitest + gitleaks + drafts README ([#2435](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2435)) ([50f4f59](https://github.com/adm01-debug/Promo_Gifts_V4/commit/50f4f599729da64e9956b5b3c1a231b4749b8b10))
* **cnpj+e2e:** CnpjHarness normaliza digits, spec 13b aceita título RLS, thumb min=5 ([cde5f6d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cde5f6d4dc845541046287a63ccacc7502c6ac3b))
* **cnpj:** corrige E2E — readInitialFromQuery não normaliza + schema rejeita espaços ([d237263](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d23726363bd99cfbed30b99932e1ffce2cf3ef85))
* **contract-smoke:** remove } extra que causava syntax error no webhook-inbound ([4d70775](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4d70775d7178c1811d8f7cdd11b0658670e52db0))
* **contract-tests:** adiciona product_sync_logs e colunas soft-delete ao fixture smoke ([21adfef](https://github.com/adm01-debug/Promo_Gifts_V4/commit/21adfefae6649dad5c3d3d47406be1ea948783a0))
* **contract-tests:** adiciona tabela products ao fixture smoke ([b87510c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b87510ce1e227c663f560e078c02041cb3b22efa))
* **contracts:** add MagazineReaderStateReadSchemaV1 — Gate 1.12 ([e2be31a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e2be31add9a107030d1aeab8462534a6cd798979))
* **cors,contracts:** CORS_WILDCARD_ORIGIN + contrato magazine-reader-state-read ([#2427](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2427)) ([26641b0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/26641b0a0cb8855f45755cd4734af4c53d52ba5d))
* **crons:** análise e propostas de correção para top-10 falhas [A3] ([8eaf201](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8eaf201454b057d0cf346153f3a3e2b6ed2ecae3))
* **db:** backfill de primary_image_url nos 11 produtos com valor da regra antiga ([be60981](https://github.com/adm01-debug/Promo_Gifts_V4/commit/be609810df72df66c6c1d04a34a2f1c37ab4abe6))
* **db:** cabeçalho de rollback na 20261013180000 e veto revisado da 180500 ([82cc69c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/82cc69c3ba82c808f6997a77e0cf5472742f0afc))
* **db:** incidente 2026-10-22 — alívio de carga pg_cron + visibilidade de timeouts ([#2348](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2348)) ([aaae8ef](https://github.com/adm01-debug/Promo_Gifts_V4/commit/aaae8eff2e1f97d270457ef68b48caf7d3ab7d54))
* **db:** rollback da 20261013180000 restaura o ACL exato ([d279ca2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d279ca2b3e6b331ddf94e85630973112046f45f2))
* **db:** rollback files faltantes P10 e P03 — preflight E063 ([edb8432](https://github.com/adm01-debug/Promo_Gifts_V4/commit/edb8432a305dd34f633f638bc7705fd0429df999))
* **db:** rollback na 20261013180000 + veto revisado da 180500 ([8491f62](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8491f623efb9d4aef08092764622dee49966ae65))
* **db:** rollback na 20261013180000 + veto revisado da 180500 ([#2158](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2158)) ([8491f62](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8491f623efb9d4aef08092764622dee49966ae65))
* **db:** separa o DROP da policy de teste e põe lock_timeout nas migrations pendentes ([9775d22](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9775d22481008b1efa0ec4163786a84de886aebd))
* **deps:** uuid override 11.1.1 — CVE-2026-41907 ([#2298](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2298)) ([3fd128f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3fd128fb3d832d02d2afa4c251eda609cb9c34c0))
* **docs+telemetry:** corrige FOTOGRAFIA contagens e cart_create_start log level ([20bafdf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/20bafdf2630baeaf9b9b16dc2c43448f45992c34))
* **docs:** adiciona marcador LEGACY_INFORMATIVO no cabeçalho SINGU — corrige Gate 0 guard-canonical ([#2459](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2459)) ([9ad87ff](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9ad87ff2da84095b6349c64184b1fb637f09c294))
* **docs:** corrige referências de caminho de migration em dossier PR-2360 ([98e588d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/98e588d58a57b1b1062b6761abafc19ed9c28293))
* **docs:** remove migration path refs stale em PR-2449.md — Gate 1.3 ([#2462](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2462)) ([1b69cfe](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1b69cfe79315a64bf1266cd130b62a01cc50990f))
* **docs:** sync AGENTS.md Regra [#9](https://github.com/adm01-debug/Promo_Gifts_V4/issues/9) — PR obrigatório para commits de governança ([#2209](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2209)) ([b6c1a0f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b6c1a0ffd12f2b95468acfd5638258778c7c3a0c))
* **drift-baseline:** filterDiff agrupa DDL multi-linha por statement (E038) ([#2267](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2267)) ([e762e17](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e762e1714c374a43267efae9591909ac4f3e2aaa))
* **drift-check,linter:** corrige loadAllowlist crash e test timeout do retry ([9c2288c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9c2288c468e3307e2a4007258668fb9a3791c399))
* **drift-check:** adiciona set check_function_bodies ao allowlist ([6fcb98b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6fcb98ba55397a22846d2f7b2f42abaf30aa2aae))
* **drift:** replay do baseline descarta ALTER/COMMENT ON EVENT TRIGGER ([#2170](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2170)) ([d6cdb44](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d6cdb442a1b5f2e4d7ff66f5656a126a50c37ecf))
* **e2e,ci:** corrige Gate 3 E2E Smoke e Gate E40 Schema Drift ([07153da](https://github.com/adm01-debug/Promo_Gifts_V4/commit/07153daffc232ae3efb2098ab7c289089fb8b65c))
* **e2e+ci:** corrige 4 skip-silenciosos na spec parity e unblocks Gate 0.5 (advisory 2026-10) ([d977298](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d9772987c4088300057210d3adf0fb8307988083))
* **e2e+scripts+src:** F3+F4+F5b de [#2228](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2228) — e2e specs, scripts/gates/baselines, src restantes ([#2284](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2284)) ([46275a9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/46275a9b2765453b20b6b299491aef790a7e39f8))
* **e2e:** adiciona campo version ao MockCart (confirmado via MCP Supabase) ([c27ee67](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c27ee675cf6316dfdd56c744ab295e311e5d23cf))
* **e2e:** adiciona guard E2E_MOCK_AUTH a testes sem [@smoke](https://github.com/smoke) em quote-view specs ([48f57df](https://github.com/adm01-debug/Promo_Gifts_V4/commit/48f57dff1ff13e5639984a42fe729ff55e493b1f))
* **e2e:** adiciona guard E2E_MOCK_AUTH em todos os specs que falham sem auth real ([c5ad6d6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c5ad6d67b7fdbabc49cf640a7f15a64cf295a49f))
* **e2e:** aguarda animação zoom-in-95 antes de medir largura do ConfirmDialog ([#2391](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2391)) ([432230f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/432230fcfef15b4717e252218311011ffcd65ac2))
* **e2e:** corrige Gate 3 — auth timing em magazine-smoke + elimina networkidle/waitForTimeout em e2e/flows/ ([#2174](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2174)) ([0437ce3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0437ce3cb0f6b36cd817ea24a4116c78c1f80293))
* **e2e:** corrige paridade E2E novidades/reposicao — aria-label estático + test.skip ([4c482cb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4c482cbc3a90509180cd575c7e26d25d3ed02aeb))
* **e2e:** corrige seletor firstRowMenu muito amplo nos specs 13 e 13b ([b1aa0e5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b1aa0e5b51f52d74503f11935d939d1ac90e1587))
* **e2e:** corrige seletores cart-row-menu→cart-row-more em 3 locais (P2/P3/P30) ([9475e6b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9475e6b0ed423c473fcc744c8a818c7e9cc3c598))
* **e2e:** corrige toHaveCount(0) → toBeHidden() e adiciona workflow de snapshots ([e40b23d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e40b23d688d33746693a7ae2dd65347836d82d35))
* **e2e:** E108+E110 — 96 specs skip→fail, stubs unitários (F3 de [#2228](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2228)) ([28fb92b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/28fb92b31750018a31db5aeb7eeb8ba5dc29baa8))
* **e2e:** E2E mock auth para Gate 3 em CI sem credenciais ([#2283](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2283)) ([37e57b8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/37e57b80242ba63322f9f6324ea960240acdf177))
* **e2e:** E33 follow-up — credenciais ausentes em steps mobile ([#2239](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2239)) ([33b1ea5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/33b1ea5dda9d4ea153c0942c02d4a505eea5a4e5))
* **e2e:** substitui route.continue() por route.fallback() em specs 13 e 13b ([47f1792](https://github.com/adm01-debug/Promo_Gifts_V4/commit/47f17929f4fc266106cd0e677c548691dfcc206a))
* **edges:** corrige bugs reais encontrados na validação exaustiva ([#2193](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2193)) ([a25af3f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a25af3fe5e4baf10397f1d8e05af413585d85acd))
* **gate-0.5:** adiciona ip-address/socks/socks-proxy-agent à allowlist LHCI ([856b8db](https://github.com/adm01-debug/Promo_Gifts_V4/commit/856b8db491c163acf0537512c296aea2310cdf33))
* **gate1.3:** remove 2 entradas stale de analise-prs/progresso.json — .migration-refs-baseline.json 485→483 entradas ([7fc2021](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7fc20213c16c207ebd2d7b50ff75bc332e600d98))
* **header:** extrai UserMenuShortcutItems — corrige regressão de tamanho do Header.tsx ([be7d4e3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/be7d4e31235bf4032a2f0dc6c10cc234decb3991))
* **inteligencia:** pagina sales-history e limita .in() em lotes de 200 ([#2222](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2222)) ([9b611ed](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9b611ed00ba0aa849d1a37f2748bcae8d62fc2c1))
* **kit-builder:** weight_g 0 tratado como desconhecido, não 0g ([#2551](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2551)) ([97eed25](https://github.com/adm01-debug/Promo_Gifts_V4/commit/97eed25cb177a318fcf63fb3843f02512511d579))
* **kit:** restaura 13 data-testids removidos pelo Lovable no kit-builder ([6842702](https://github.com/adm01-debug/Promo_Gifts_V4/commit/68427022fc65dbfeb42a6f4fafbc8bac74c7a0e0))
* **layout:** remove data-testid do Suspense fallback do Header ([#2508](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2508)) ([5b36f09](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5b36f0929eff1220ec30a150923cbc8c67b1d766))
* Linter Gate trata 5xx da Management API como falha de infra transitória ([#2524](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2524)) ([d74b33f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d74b33fb0d0af07e448a6b826cc095622ed726bd))
* **linter:** adiciona retry 3x com backoff ao check-supabase-linter (E103) ([1229156](https://github.com/adm01-debug/Promo_Gifts_V4/commit/122915652b59dfffb3635cf80bf38cd7bdd9ab34))
* **manage-users:** SyntaxError || ?? sem parênteses em revoke_sessions ([#2218](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2218)) ([9983ea6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9983ea69c87bab56d316d8cb6a646eca3cd0b544))
* **materials-api:** timeout 20s para banco externo, retorna 504 retryable ([#2552](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2552)) ([35fdb57](https://github.com/adm01-debug/Promo_Gifts_V4/commit/35fdb5793db7461f7fafcdae1effc89ae5cae6b5))
* **migration:** guard realtime.messages DDL com verificação de ownership ([#2376](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2376)) ([b167c9c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b167c9c8095a99be701187758bae66d760e9c94f))
* **migrations:** adiciona BEGIN/COMMIT em cron fixes e entradas Gate 1.3.3 ([f38d5ca](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f38d5caff64f71787220f550fb6e89327f900240))
* **migrations:** adiciona rollback e header para 20261019000000 mirror OOB ([e6a4c55](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e6a4c55217d010e44da85a3bbf097e10d6898eb6))
* **migrations:** adiciona rollback e header para 20261019000000 mirror OOB ([a14d9cd](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a14d9cd83fdb6471155685fb7d2316755a051dae))
* **migrations:** adiciona rollback headers e arquivos de rollback (Qodo High) ([93f61bc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/93f61bcdaacd1d59a1eb830c9e68b605ec7a1e1e))
* **migrations:** cabeçalho -- Rollback: na 20261008230000 ([#2219](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2219)) ([0bf7159](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0bf7159f40c24e5a149d7ad1a5dd540e4db82b59))
* **migrations:** corrige SET search_path SECURITY DEFINER + cria rollbacks curtos ([#2300](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2300)) ([0f33a30](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0f33a30a0c3d75628e47da199455307e4e7cdf65))
* **perf+crons:** migrations RLS wrapper, drop índices mortos e fix crons top-3 [A2+A3] ([d826923](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d82692365babeaf31aca46ca44cddf4a17eb58eb))
* **preflight:** aceita SET search_path TO além de SET search_path = (E99) ([64faa1d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/64faa1df37f61b89520d0c3bec52f27b9519b308))
* **preflight:** rollback header + log sem pendente para migration 20261024163500 ([9079c82](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9079c82e6c3f58ae5d2cdf8c7eb2deef979ee9d8))
* **product-webhook:** resolve NOT NULL — sku_promo=sku + Bitrix ID→UUID para categoria/fornecedor ([#2231](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2231)) ([5289cf2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5289cf2a042c2770c7c2bd2ec4e9768aee373497))
* **products:** checagem de sessão sem crescer o arquivo (Gate 1.9) ([9bca9b5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9bca9b5aa2a257d6f3f0fa2afc07d71be3e9e25b))
* **products:** não chama fn_get_product_customization_options sem sessão ([7f96638](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7f966384f29110152104791d34d82ee7db798323))
* **products:** não chama fn_get_product_customization_options sem sessão (873× 401/dia) ([3e06378](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3e06378a5e4f53e00a2c6826fdf667692b307882))
* **produtos:** remove mock de selos de inteligência e supplier trust ([#2553](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2553)) ([aebd333](https://github.com/adm01-debug/Promo_Gifts_V4/commit/aebd333f3d2d57ee0bb5f1f127bf23f352846cd9))
* **queries:** pagina listagens não paginadas que estourariam o cap de 1000 do PostgREST ([#2189](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2189)) ([c6e389d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c6e389d49ca9dc196712a9a1ad7c63254b714c2d))
* **receipt:** adiciona recibo v194200 em MIGRATIONS_SYNC_LOG.md ([2e8833b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2e8833bd68ea44eb7a88ebb1737a208fcdcba98b))
* **schema:** migration espelho DDL out-of-band — frontend_telemetry + v_system_health_dashboard ([#2296](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2296)) ([1397665](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1397665a12affd3c2f047b0d57dd5b51e3c7a359))
* **scripts+tests:** F4 — scripts/gates/baselines/tests (fatiamento [#2228](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2228)) ([cb96cd5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cb96cd53d814f87e0012ac842272d070fd271346))
* **security+ci:** session guard em 5 callers anônimos + fix Gate 1.3 (path A5) ([8bafc7d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8bafc7d5a0a1f0f6a06d88adc6577098f873dfcb))
* **security+ci:** session guard em 5 callers anônimos + fix path Gate 1.3 ([d95be31](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d95be311c24aa2ea437fb9c9987dfcc7ddfa2907))
* **security+perf+cron:** auditoria P17/P18/P19 — fn_cron_guard CRÍTICO, RLS wrapper, index drops, cron reschedule ([92a4d3b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/92a4d3bce52d0f5ae66ce381ddd15ca555ac0812))
* **security:** adiciona migrations REVOKE para fns SECURITY DEFINER — corrige Gate 1.3 ([8a40f13](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8a40f13bed0df1bf890db276a26d2fb8f61e8e3a))
* **security:** atualiza lint-0011 allowlist — assinaturas OUT completas no PG17 ([5b32ac8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5b32ac8d87d92c4b5c55026aecf96bfffc79f157))
* **security:** corrige 4 falhas de CI — CNPJ maxLength, allowlist memory, spec 13b e reason 0029 ([47c4e91](https://github.com/adm01-debug/Promo_Gifts_V4/commit/47c4e91e62171ac275b777e52e816504f9a9a2e6))
* **security:** corrige allowlist lint-0011 com assinaturas completas pgstattuple (OUT params) ([b442d1e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b442d1edbd4e398477a61ea6fe43e60b36666b58))
* **security:** corrige assinaturas lint-0011-allowlist — remove parâmetros OUT ([3b14ab9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3b14ab933ceed3245cc1e022e0c826c9dcbaea0d))
* **security:** corrige nomes de arquivo das migrations REVOKE no allowlist ([ce7160a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ce7160a80414eb1129a7674d6e01d7df4a942042))
* **security:** corrige rollback files — restaura authenticated/service_role em vez de PUBLIC ([74c20c1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/74c20c1a28fc44185a4878935fbc7915af4551e8))
* **security:** E017/E018/E020/E021/E028/E043/E044/E045 hardening ([#2236](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2236)) ([f0d8b8e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f0d8b8e711fcde4c9e959d347534b0586c292752))
* **security:** E022-E030 — auth em 7 edge functions expostas + gate enforce ([12c2855](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12c285558ddb09b436776a92c0d501070d29e5ac))
* **security:** HTTP 500 exaurido emite INCONCLUSIVE, não pass ([5216cfc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5216cfc78e0d6877eaf436ae4dc378dd0572843a))
* **security:** Onda 0 — E002 E003 E007 E008 E009 E010 ([#2177](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2177)) ([05f9b1d](https://github.com/adm01-debug/Promo_Gifts_V4/commit/05f9b1d457d3e26689061224d331c89f8e532407))
* **security:** remove entrada duplicata de log_user_logout na allowlist lint-0029 ([882e957](https://github.com/adm01-debug/Promo_Gifts_V4/commit/882e957c0292705308e8bf7fc2406a0412d01c59))
* **security:** remove parâmetros OUT da lint-0011-allowlist + documenta gap fn_detect_recurring_errors ([bd851bb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bd851bb445f5d66482591e0d7e3969af0c566f48))
* **security:** restaura log_user_logout na allowlist + valida RETRY_DELAY_MS ([c59b3e6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c59b3e66b94900c43fc14e72c486925cb843ff90))
* **security:** revisão DBA — guard anti-self + auditoria DB em admin_revoke_user_sessions e índice funcional em login_attempts ([#2195](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2195)) ([3bb99b9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3bb99b99162c11ca4ebfc176cb9ca8dc7f57272d))
* **security:** revoke anon EXECUTE em fn_cron_guard [A1 — FUNC-NEW-001 CRÍTICO] ([e7acbcf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/e7acbcf1271d65ff8674e47184fdf2ae0b89ca30))
* semear jobs do pg_cron no replay do drift (E40) ([893d830](https://github.com/adm01-debug/Promo_Gifts_V4/commit/893d830e1d3369688d3ad657611fa6289720e605))
* **src:** F5b de [#2228](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2228) — 13 arquivos src/ restantes (E121-E142) ([78701e8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/78701e8b6698381cf0d34f23ca635160a4989e5c))
* **src:** React hooks, types — Onda 11-13 E121-E139 — F5 de [#2228](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2228) ([#2274](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2274)) ([bcebb3e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bcebb3e7a7de3ac304f1a4a9b4a3740a10549b45))
* **test:** corrige 14 falhas pós-bump Zod v4.6.6 — UUIDs inválidos e timezone UTC ([#2457](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2457)) ([fcd4fb8](https://github.com/adm01-debug/Promo_Gifts_V4/commit/fcd4fb8dd69af22627958322259b0fd7c60e8df1))
* **test:** corrige check-supabase-linter-fallback:51 — alinha com E103 + docs CI ([#2514](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2514)) ([c5bf465](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c5bf465aa85e13133eda8a3fd820e5da5ddc1c5b))
* **test:** corrige expectativas timezone UTC→BRT em date-utils.test.ts ([#2470](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2470)) ([12c9605](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12c9605e6b870fae5ad4370e77d320a373ee2a81))
* **test:** corrige mocks de layout para @tanstack/react-virtual v3 e timeout de replenishment ([#2383](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2383)) ([325b0bd](https://github.com/adm01-debug/Promo_Gifts_V4/commit/325b0bd4e64e4dc532ef3014c2a8a08504739b8a))
* teste do replay espera a semente de cron em B+1 ([#2535](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2535)) ([4cb4feb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/4cb4feb431f47573a2d4aee01774a5db24e11810))
* **tests:** corrige TDZ em vi.mock e mock de CloudStatusBanner ([#2389](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2389)) ([45023c7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/45023c7ff805defbce86a0e9e61b40c72ef3cbf7))
* **ts:** compatibilidade Zod 4 — corrige 4 erros TS em CI-Replenishment ([#2437](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2437)) ([9b23fb6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9b23fb642c787035636d0814f0655341161b5d81))
* Web Animations API await antes da medição para garantir animação concluída. ([432230f](https://github.com/adm01-debug/Promo_Gifts_V4/commit/432230fcfef15b4717e252218311011ffcd65ac2))


### Performance Improvements

* **db:** migrations para RLS auth.uid() wrapper e drop de índices mortos [A2] ([7b7a623](https://github.com/adm01-debug/Promo_Gifts_V4/commit/7b7a62365277fbf6070a06861de836c96cbfdc91))

## [1.2.1](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.2.0...v1.2.1) (2026-10-18)


### Bug Fixes

* **ci:** Wave 4 — gates honestos (E41/E43/E46) ([#2186](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2186)) ([594e1f1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/594e1f106b0354bf8bd0225bd6bb8b2d117b4aef))
* **security:** E022-E030 — auth em 7 edge functions expostas + gate enforce ([12c2855](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12c285558ddb09b436776a92c0d501070d29e5ac))

## [1.2.0](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.1.0...v1.2.0) (2026-10-18)


### Features

* **ci:** drift-check replaya baseline do schema vivo; conserta composite actions ([#2168](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2168)) ([ee0a467](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ee0a46775bc51a27134ced0f408839091ab016e5))
* **drift:** baseline replay robusto — keywords, dollar-quote, quotes-templates fix ([#2171](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2171)) ([c41dfe7](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c41dfe7e7a56fbbc4c58f9d2d45f218811bcf962))
* **E12:** ci-issue composite action + labels hygiene ([3f66fbf](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3f66fbf2255903030f95e91481fc9e6827c78c42))
* **E18:** cache-prune weekly workflow + SHA-pin actions/cache in e2e-setup ([5cef26e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5cef26e1c8c38395a1640552fba8569671e691f9))
* **E42:** check-playwright-min-executed — --max-skipped-ratio e composite action ([cfea89b](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cfea89b068d75adcfa662a1ba868932578623957))


### Bug Fixes

* **ci/db:** causa raiz dos locks (snapshot sem dump em PR), backfill primary_image_url, recibos ([12fda66](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12fda6661e2d6f510c6d16ba657ac34878ae2804))
* **ci/db:** causa raiz dos locks, backfill primary_image_url, recibos ([#2163](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2163)) ([12fda66](https://github.com/adm01-debug/Promo_Gifts_V4/commit/12fda6661e2d6f510c6d16ba657ac34878ae2804))
* **ci/db:** lock_timeout real no apply, push E32 restaurado e migrations separadas ([1a07395](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1a07395613ca8bb6fde5ed7b40c5347ce21801b8))
* **ci/db:** lock_timeout real no apply, push E32 restaurado e migrations separadas ([#2159](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2159)) ([1a07395](https://github.com/adm01-debug/Promo_Gifts_V4/commit/1a07395613ca8bb6fde5ed7b40c5347ce21801b8))
* **ci/E15:** lock_timeout e statement_timeout valem de verdade no apply ([b3e2ce6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b3e2ce6f65fc4d3e5fe9fab9d0508404a41ad84e))
* **ci/E32:** actionlint limpo nos 16 workflows de push ([79af538](https://github.com/adm01-debug/Promo_Gifts_V4/commit/79af538d6f23fa375833c689bdc804f3c6f06ff4))
* **ci/E32:** restaura git push nos 17 jobs que perderam credencial ([aa940e5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/aa940e5982b258cdb1f4850087a33e9fd453ff52))
* **ci:** corrige persist-credentials em 45 workflows — C10 sistemático ([71dac91](https://github.com/adm01-debug/Promo_Gifts_V4/commit/71dac91385dd5e4fe695c27bdf0aa8d819069b77))
* **ci:** corrige persist-credentials nos checkouts de deploy-gates.yml (C10) ([c6a62b0](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c6a62b0198f3c45409f4cfea2ec5b403a393911e))
* **ci:** policies-baseline abre o PR com o label existente "automated" ([69b500a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/69b500a449fea5f34902bf13398c358fa86b1ff2))
* **ci:** policies-baseline abre o PR com o label existente "automated" ([9c077a5](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9c077a5a71cd52b4732330c147cdf5217556d39a))
* **ci:** policies-baseline usa o label "automated" ([#2167](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2167)) ([69b500a](https://github.com/adm01-debug/Promo_Gifts_V4/commit/69b500a449fea5f34902bf13398c358fa86b1ff2))
* **ci:** schema-snapshot-export só faz dump ao vivo em schedule/dispatch ([f47fefc](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f47fefcfbbeb384e15a255eaddcd035ce9d15292))
* **db/B2:** reconcilia ledger × repo das migrations do incidente 2026-10-13 ([0a64ef3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0a64ef316e4fed7a44c0b8791b8058fae2bb43bd))
* **db/B2:** reconcilia ledger × repo das migrations do incidente 2026-10-13 ([#2157](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2157)) ([0a64ef3](https://github.com/adm01-debug/Promo_Gifts_V4/commit/0a64ef316e4fed7a44c0b8791b8058fae2bb43bd))
* **db/B2:** reconcilia ledger x repo das migrations do incidente 2026-10-13 ([ff4997e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ff4997e090e7098ee6249dee981abff575c9ccc2))
* **db:** backfill de primary_image_url nos 11 produtos com valor da regra antiga ([be60981](https://github.com/adm01-debug/Promo_Gifts_V4/commit/be609810df72df66c6c1d04a34a2f1c37ab4abe6))
* **db:** cabeçalho de rollback na 20261013180000 e veto revisado da 180500 ([82cc69c](https://github.com/adm01-debug/Promo_Gifts_V4/commit/82cc69c3ba82c808f6997a77e0cf5472742f0afc))
* **db:** rollback da 20261013180000 restaura o ACL exato ([d279ca2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d279ca2b3e6b331ddf94e85630973112046f45f2))
* **db:** rollback na 20261013180000 + veto revisado da 180500 ([8491f62](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8491f623efb9d4aef08092764622dee49966ae65))
* **db:** rollback na 20261013180000 + veto revisado da 180500 ([#2158](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2158)) ([8491f62](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8491f623efb9d4aef08092764622dee49966ae65))
* **db:** separa o DROP da policy de teste e põe lock_timeout nas migrations pendentes ([9775d22](https://github.com/adm01-debug/Promo_Gifts_V4/commit/9775d22481008b1efa0ec4163786a84de886aebd))
* **deps:** E95 — override tmp &gt;=0.2.6 para fechar GHSA-52f5-9888-hmc6/GHSA-ph9p-34f9-6g65 ([01b58fb](https://github.com/adm01-debug/Promo_Gifts_V4/commit/01b58fb0739628ae6408d506d5bed331b687a61c))
* **drift:** replay do baseline descarta ALTER/COMMENT ON EVENT TRIGGER ([#2170](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2170)) ([d6cdb44](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d6cdb442a1b5f2e4d7ff66f5656a126a50c37ecf))
* **E04:** bundle ratchet só desce — min(atual×1.2, prev) em todos os campos ([62f75f6](https://github.com/adm01-debug/Promo_Gifts_V4/commit/62f75f68317848613fd58d5137eddb3e0b81eacc))
* **E40:** secrets-inventory ignora linhas de comentário YAML ao extrair refs ([6522953](https://github.com/adm01-debug/Promo_Gifts_V4/commit/652295306365dee59d697d2665c00463febcd1d7))
* **E46:** freight-quality-gates — pisos reais, cancelled = falha ([fded800](https://github.com/adm01-debug/Promo_Gifts_V4/commit/fded8007cf2a1ed9b3a80d3661a9522a524896f3))
* **E47:** flakiness medida sem retry; postgres-contracts com setup-node ([cff94e4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/cff94e441485b21fc084cf302b40e5301052a652))
* **E50:** e2e-customization-collapse — 4 defeitos estruturais ([c559221](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c559221fbdbaf531af4031ce489c4f318d194834))
* **E85:** uptime-monitor --max-time 30, prod-health nome honesto ([3f1594e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3f1594e3ee9e86e42864110a0a8d498c875de5ff))
* **E86:** delete-orphan-edges — not found = skip, recibo de deleção ([02785a4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/02785a4fc41b6acf8975dfb39c166f3a2b98f91a))

## [1.1.0](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.0.6...v1.1.0) (2026-10-14)


### Features

* **auditoria:** Onda Quick Wins 22-dim — env E2E em 31 workflows, gate console.*, retenção LGPD e docs ([#2121](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2121)) ([c1b5b15](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c1b5b154c202efdc1ec0a3ef4aeee2fa9b0e74a5))


### Bug Fixes

* **ci:** restaura entrada de allowlist perdida em conflito de merge pós-incidente ([#2148](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2148)) ([f8b2e29](https://github.com/adm01-debug/Promo_Gifts_V4/commit/f8b2e29af3f5a427b6e836c363bedd6811f63750))
* **db:** contenção e segurança — incidente 2026-10-13 (produção) ([#2141](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2141)) ([a63b950](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a63b9507c0a68846b2d8b1653227bfa5e9559333))
* **db:** integridade de dados e storage — incidente 2026-10-13 (Agente 3) ([#2143](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2143)) ([b7f9719](https://github.com/adm01-debug/Promo_Gifts_V4/commit/b7f9719489c5fcda60e5d139769eedacd7cbf428))
* **db:** permissões, auditoria e secrets — incidente 2026-10-13 (Fase 5/9) ([#2142](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2142)) ([38b83fd](https://github.com/adm01-debug/Promo_Gifts_V4/commit/38b83fd93ba03b02523aca0f80a9c431cdddf710))
* **db:** reescreve policies RLS por-linha e corrige timeouts de cron (incidente 2026-10-13) ([#2144](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2144)) ([fe196f4](https://github.com/adm01-debug/Promo_Gifts_V4/commit/fe196f49104ec94adc232fc9e72944c651d8f889))
* **frontend/schema:** alinha frontend ao schema real + nunca cair em produção nos testes ([#2145](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2145)) ([a9c8bd9](https://github.com/adm01-debug/Promo_Gifts_V4/commit/a9c8bd9c4e3f2fa5a4a52fb663ea5d3b44c7e982))

## [1.0.6](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.0.5...v1.0.6) (2026-10-13)


### Bug Fixes

* **test:** contrato a11y do select de ordenação alinhado ao label honesto do [#2100](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2100) ([#2120](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2120)) ([d163b40](https://github.com/adm01-debug/Promo_Gifts_V4/commit/d163b403f6e96a729395ebad45633624281f792d))

## [1.0.5](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.0.4...v1.0.5) (2026-10-11)


### Bug Fixes

* adiciona alt no mock de teste de tokens do timbrado (substitui [#2103](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2103)) ([#2111](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2111)) ([ea132d2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/ea132d2b4bbcb67b49d10d26312f2cd18e7e4cf5))

## [1.0.4](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.0.3...v1.0.4) (2026-10-11)


### Bug Fixes

* corrige perda/contaminação de logo no rascunho de mockup ([#2106](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2106)) ([bae84dd](https://github.com/adm01-debug/Promo_Gifts_V4/commit/bae84dd2424ee352cb1fa081696584039b0c9977))
* **mockup:** grade do seletor de produto usa colunas reais por largura e ordenacao honesta ([#2100](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2100)) ([3c66906](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3c669062ac7590e04e615fdd627913db4caaf5bd))
* **mockup:** monta as secoes do painel uma unica vez por breakpoint ([#2099](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2099)) ([c2d55e1](https://github.com/adm01-debug/Promo_Gifts_V4/commit/c2d55e181ac1165eb044025b1b87c89da7f75c78))

## [1.0.3](https://github.com/adm01-debug/Promo_Gifts_V4/compare/v1.0.2...v1.0.3) (2026-10-11)


### Bug Fixes

* **ci:** repassa E2E_USER_EMAIL/E2E_USER_PASSWORD pro job Playwright E2E do Full CI ([#2113](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2113)) ([0284679](https://github.com/adm01-debug/Promo_Gifts_V4/commit/028467954d70d756ee533363306e003d4d8b6c23))
* confirmação de exclusão e sanitização de busca no histórico de mockups ([#2108](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2108)) ([2a07825](https://github.com/adm01-debug/Promo_Gifts_V4/commit/2a078250342ebdb129dab36ef52b6067ac0dd275))
* corrige lint do fix de busca de cliente (PR [#2095](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2095)) ([#2109](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2109)) ([45e8f10](https://github.com/adm01-debug/Promo_Gifts_V4/commit/45e8f104d8135836325ac171adf6e05341669df0))
* **generate-mockup:** valida cada hop de redirect e exige allowlist de egresso ([#2105](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2105)) ([6a3d076](https://github.com/adm01-debug/Promo_Gifts_V4/commit/6a3d0766d270c02a9ca991611ef7141f7e1d5c81))
* **mockup:** barra de status prioriza o erro atual sobre o Salvo antigo ([#2094](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2094)) ([8a18f05](https://github.com/adm01-debug/Promo_Gifts_V4/commit/8a18f0515bb25ac3c2dafaa52e47b4189e7a5877))
* remove return desnecessário no handler de atalhos (PR [#2096](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2096)) ([#2110](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2110)) ([3ebd35e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/3ebd35e6d379ce27f6d6687e2a5bbc31bb8baae9))
* restringe acesso anon a links de aprovação de mockup e bucket mockup-assets ([#2097](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2097)) ([60d743e](https://github.com/adm01-debug/Promo_Gifts_V4/commit/60d743e925c4b345d085ccd2d3d9112d9a40a484))
* **revisão:** desativa perfil antes do ban + rollback — elimina pendência órfã no anonymize-user ([#2117](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2117)) ([5118dd2](https://github.com/adm01-debug/Promo_Gifts_V4/commit/5118dd26ef876010c14b42efeb48f4d35a4cf9fa))

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
