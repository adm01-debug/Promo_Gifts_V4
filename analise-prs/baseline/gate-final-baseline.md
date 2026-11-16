# Gate Final Baseline — Sessão session_011d8gKLZg8BWivR8aQBwxGF

**Data:** 2026-10-27
**main HEAD entrada:** `df18546dfd76d1bea7ea5873257b668d128d8df3` (PR #2603)
**main HEAD atual:** `06c221db520b446eee41ce990c110830be5da13c` (PR #2621 — 9 rollbacks + manifest fix)

## Gate Final baseline (sessão anterior — ref)

| Campo | Valor |
|---|---|
| Run ID | 40223579961 |
| SHA | `7d3bd4ba47eb6e9e6b3d56fe3bfac45a791de84f` |
| Conclusão | **success** |
| Data | 2026-10-25T19:02:42Z |
| Testes | 429 / 0 falhas |

## Gate Final esta sessão

| Campo | Valor |
|---|---|
| main entrada | `df18546dfd76d1bea7ea5873257b668d128d8df3` |
| Nota | Gate Final verde confirmado em PR #2603 antes desta sessão |
| PR #2627 | Gate Final disparado — SHA `ba98475fd81bcff8502c5b5e7dfc0c55d983d15c` — aguardando resultado |

## Mudanças em main durante esta sessão

| SHA | PR | O que mergeou |
|---|---|---|
| `8b7594ad` | #2623 | fix(ci): gitleaks allowlist (sessão `session_01Knr9enFAok62bHihBK1UUP`) |
| `06c221db` | #2621 | fix(migrations): rollback files 9 migrations + manifest `xbz-image-uploader` (sessão `session_01PE8GzVYqxJM25xzvLuLYhW`) |

## Gates críticos verificados (baseline para decisões de merge)

| Gate | Status no baseline |
|---|---|
| Gate 0 — SSOT `doufsxqlfjyuvxuezpln` | ✅ client.ts não alterado |
| Gate 1.12 — edge-authz-manifest.ts | ✅ `xbz-image-uploader` declarado em #2621 |
| Gate E23 — secrets scan | ✅ nenhum segredo exposto nas branches desta sessão |
| E058 — rollback preflight | ⚠️ faltam rollbacks 233000 + 234500 (cobertos por PR #2627) |
