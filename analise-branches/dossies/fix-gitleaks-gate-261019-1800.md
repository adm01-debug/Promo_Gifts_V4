# Dossiê — `claude/fix-gitleaks-gate-261019-1800`

**Veredito:** FECHAR (regressão)
**Verificado nesta sessão (2026-11-01):** SHA main `d2033d9237`, sessão `claude/chore-analise-branches-revalida-261101-2200`

---

## Evidências desta sessão

**git cherry (run nesta sessão):**
```
cherry+ count: 4  (4 commits únicos nesta branch vs main)
```

**git diff --name-only origin/main...origin/claude/fix-gitleaks-gate-261019-1800 (3-dot, nesta sessão):**
```
.gitleaks.toml
```

**Diff completo lido (nesta sessão):**
- Branch: 67 linhas em `.gitleaks.toml`
- Main: 102 linhas em `.gitleaks.toml`
- Branch **remove** 35 linhas vs main: inclui regexes de segurança e entradas de exclusão de `tests/.*`
- Branch adiciona `paths = ['''dist/''', '''audit/''', '''docs/''']` que excluem diretórios adicionais do scan
- Branch remove `# Variante com typo (d4872 vs d872)` e outras entradas de falso-positivo documentadas
- Branch tem comentários em PT-BR com acentuação vs main tem versão sem acentuação (indicando branch mais nova esteticamente, mas mais permissiva em scan)

---

## Análise (método analise-branches.md)

1. **Intenção:** refinar `.gitleaks.toml` para reduzir falsos-positivos.
2. **JÁ IMPLEMENTADA:** main tem versão mais completa com mais regras de segurança.
3. **Cruzamento Supabase:** nenhuma migration.
4. **Regressão:** **SIM** — branch remove 35 linhas de `.gitleaks.toml` incluindo regexes de segurança presentes em main; aplicar afrouxaria o scan de secrets.
5. **Regra de negócio:** segurança comprometida se aplicado; main está mais restritivo (correto).
6. **Completude:** branch é subconjunto regressivo do main.

**VEREDITO: FECHAR** — branch remove regras de segurança do `.gitleaks.toml` vs main.
