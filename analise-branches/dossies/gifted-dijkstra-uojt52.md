# Dossiê — `claude/gifted-dijkstra-uojt52`

**Veredito:** FECHAR (G-cat orphan)
**Verificado nesta sessão (2026-11-01):** SHA main `d2033d9237`, sessão `claude/chore-analise-branches-revalida-261101-2200`

---

## Evidências desta sessão

**git cherry (run nesta sessão):**
```
cherry+ count: 15  (15 commits únicos — sem merge-base com main)
Commits cherry+:
+ cf9e25387 fix(ci): E11 — fixtures sentinel-check para check-protection-config (#2245)
+ e5ef522a7 fix(ci): E22 — adiciona scripts e schema ausentes nos paths de workflows (#2249)
+ f5ecec52e fix(ci): boundary gate — lexer string-aware + tabela de cross-domain (#2232)
+ 36017b1a6 ci(e18): remove cache manual redundante — setup-node já gerencia (#2248)
+ 37e57b802 fix(e2e): E2E mock auth para Gate 3 em CI sem credenciais (#2283)
+ 46275a9b2 fix(e2e+scripts+src): F3+F4+F5b de #2228 (#2284)
+ 50f513e76 chore(ci)(deps): bump actions/checkout from 4.4.0 to 7.0.1 (#2264)
+ fdeb0a412 fix(schema): migration espelho para DDL out-of-band pós-baseline 20261015
+ 13c1b436b fix(governance): recibo 20261019000000 + sincroniza package-lock.json
+ 1397665a1 fix(schema): migration espelho DDL out-of-band — frontend_telemetry + v_system_health_dashboard (#2296)
+ d8b7efd45 fix(ci): lockfile resync + validate-supabase-config hardening + injection fix (#2297)
+ 3fd128fb3 fix(deps): uuid override 11.1.1 — CVE-2026-41907 (#2298)
+ 14506e64f chore(ci): bump github/codeql-action/upload-sarif 4.38.3→4.39.0 (#2288)
+ 0f33a30a0 fix(migrations): corrige SET search_path SECURITY DEFINER + cria rollbacks curtos (#2300)
+ 2e45e20f2 fix(ci): atualiza baseline migration-refs — 481 referências legadas em docs arquivadas
- 264a22d30 fix(ci): E064 — lock migration dessincronizado + correções SSOT (#2282)  [cherry- = já em main]
```

**git diff --name-only origin/main...origin/claude/gifted-dijkstra-uojt52 (3-dot, nesta sessão):**
```
fatal: origin/main...origin/claude/gifted-dijkstra-uojt52: no merge base
```
→ Confirma orphan: sem ancestral comum com main.

**Conteúdo dos commits cherry+ (todos já em main por outros commits):**
- fixes CI (E11, E22, boundary gate, E18, e2e mock auth)
- bump actions/checkout, codeql-action
- migration espelhos para DDL out-of-band — conteúdo absorvido por PRs #2282..#2300
- lockfile resync, uuid CVE fix

---

## Análise (método analise-branches.md)

1. **Intenção:** branch G-category orphan criada sem merge-base com main.
2. **JÁ IMPLEMENTADA:** todos os 15 cherry+ correspondem a commits cujo conteúdo já está em main via PRs #2245–#2300.
3. **Cruzamento Supabase:** nenhuma migration nova na branch; migrations espelho já no ledger de prod (2575 entries).
4. **Regressão:** merge impossível — `fatal: no merge base`; impossível de mergear sem resolver histórico completo.
5. **Regra de negócio:** conteúdo útil já em main; branch orphan sem utilidade restante.
6. **Completude:** G-cat orphan — impossível de mergear automaticamente.

**VEREDITO: FECHAR** — orphan sem merge-base; 15 cherry+ com conteúdo já em main.
