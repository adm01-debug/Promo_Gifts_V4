# Dossiê PR #3220 — fix Sentinel Regra 6 + inventário PENDENCIAS

**Data:** 2026-11-08  
**Veredito:** `DECISAO_HUMANA`  
**Razões:** REGRA#8 (`.github/workflows/sentinel-self-test.yml`), ARQUIVO PROTEGIDO (`scripts/sentinel-check.sh`), conflito de merge (`PENDENCIAS.md`, `RELATORIO_CI.md`)

---

## 1. Arquivos alterados — lista completa

| Arquivo | Tipo | Classificação |
|---|---|---|
| `.github/SENTINEL_SHA_ALLOWLIST.txt` | Modificado | **GOVERNANÇA — `.github/`** |
| `.github/workflows/sentinel-self-test.yml` | Modificado | **GOVERNANÇA — REGRA#8** |
| `PENDENCIAS.md` | Modificado | Conflito de merge |
| `RELATORIO_CI.md` | Modificado | Conflito de merge |
| `scripts/sentinel-check.sh` | Modificado | **ARQUIVO PROTEGIDO** (CLAUDE.md §Arquivos Protegidos) |

---

## 2. Arquivos de governança (REGRA#8 — DECISAO_HUMANA)

### `.github/workflows/sentinel-self-test.yml:18`

```diff
- assert_fail "docs escopo não-allowlist"   "docs(api): nova endpoint"    ...    "alice"
+ assert_pass "allowlist docs(api) genérico"  "docs(api): nova endpoint"  ...    "alice"
```

Muda o teste do sentinel de `assert_fail` para `assert_pass` para o padrão `docs(api):`. Alinha o teste com o novo comportamento da Regra 6 expandida.

### `.github/SENTINEL_SHA_ALLOWLIST.txt`

```
d03ee555dbd55c3dae9e85cfbb37f5f1ae4dd21b  # docs(auditoria): encerra P06 e P15 — migrations obsoletas  [2026-11-08]
```

Adiciona grandfathering do SHA `d03ee555` que teria falhado na Regra 6 antiga.

---

## 3. ARQUIVO PROTEGIDO — `scripts/sentinel-check.sh`

**Evidência:** `diff +88` e `diff +140,+203-204`

### Mudança 1 — Regra 6 (linha 88):

```diff
-if echo "$SUBJECT" | grep -qE '^(docs\(redeploy\)|chore\(workflows\)|ci\(workflows\)|chore\(docs\)):'; then
+if echo "$SUBJECT" | grep -qE '^(docs\([a-z][a-z0-9-]*\)|chore\(workflows\)|ci\(workflows\)|chore\(docs\)):'; then
```

**Antes:** Apenas `docs(redeploy):` era aceito como padrão docs-scopado.  
**Depois:** Qualquer `docs(<scope>):` onde `<scope>` começa com letra minúscula e contém só `[a-z0-9-]` é aceito. Ex.: `docs(auditoria):`, `docs(api):`, `docs(crm):`, `docs(ci):`.  

**Risco:** BAIXO — a regex é mais permissiva mas estruturalmente controlada (lowercase, alfanumérico+hífen). Não abre porta para padrões não-docs.

### Mudança 2 — extração de branch em Regra 8 (linhas 140, 203-204):

```diff
-  BRANCH_A=$(echo "$SUBJECT" | grep -oE "'[^']+'"| head -1 | tr -d "'")
-  BRANCH_B=$(echo "$SUBJECT" | grep -oE "'[^']+'"| tail -1 | tr -d "'")
+  BRANCH_A=$(echo "$SUBJECT" | grep -oE "'[^']+" | head -1 | tr -d "'")
+  BRANCH_B=$(echo "$SUBJECT" | grep -oE "'[^']+" | tail -1 | tr -d "'")
```

**Antes:** Padrão `'[^']+'` capturava o `'` final da branch e o `tr -d "'"` o removia — correto mas redundante.  
**Depois:** Padrão `'[^']+` captura apenas o conteúdo sem o `'` final, `tr -d "'"` remove apenas o `'` inicial — semanticamente equivalente.

**Risco:** ZERO — comportamento idêntico para nomes de branch normais. Bugfix de robustez.

---

## 4. Conflitos de merge

GitHub reporta CONFLICTING. Arquivos confirmados com conflito:

- `PENDENCIAS.md` — versão do PR (P-01 a P-07, formato compacto) vs versão do main (43 itens, formato longo). O PR reescreve ~770 linhas.
- `RELATORIO_CI.md` — versão do PR (formato compacto por sessão) vs versão do main (formato detalhado por sessão anterior). Conflito documentado no diff (linhas 1017-1183).

Ambos os conflitos são em arquivos de documentação, não de lógica. Mas requerem resolução manual para escolher qual versão prevalece.

---

## 5. Regra de negócio — válida?

**Sim.** O sentinel Regra 6 estava bloqueando commits legítimos como `docs(auditoria):`, `docs(api):`, `docs(crm):` que são padrões razoáveis de documentação. A restrição a `docs(redeploy):` era arbitrária. A expansão para qualquer scope lowercase alfanumérico é mais correta semanticamente.

O bugfix na extração de branch (Regra 8) é igualmente válido — remove redundância no regex.

---

## 6. Já implementada em main?

**Não.** A PR está em `CONFLICTING` e nunca foi mergeada. O sentinel Regra 6 ainda usa a regex restrita `docs\(redeploy\)` em main (SHA `9a89d9f0`).

---

## 7. Veredito final

**DECISAO_HUMANA**

Razões em ordem de prioridade:
1. **REGRA#8:** `.github/workflows/sentinel-self-test.yml` — toca workflows de CI
2. **ARQUIVO PROTEGIDO:** `scripts/sentinel-check.sh` — listado explicitamente em CLAUDE.md §Arquivos Protegidos como `scripts/sentinel-check.sh`
3. **Conflito de merge:** `PENDENCIAS.md` e `RELATORIO_CI.md` em conflito — requer resolução manual

A mudança é tecnicamente correta e de baixo risco. O bloqueio é procedimental (proteção de arquivo + REGRA#8), não técnico.
