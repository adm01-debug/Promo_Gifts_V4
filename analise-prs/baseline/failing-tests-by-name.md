# Testes Falhando por Nome — Baseline main

**Data:** 2026-10-27  
**Evidência:** Background task `bzkrdh2gu` (vitest run no container, main SHA `2fafe8ed`)  
**Total:** 21 testes falhando em 4 arquivos

---

## Por quê falham

Todos os 21 testes falham com `TypeError: fetch failed` — o container de CI local não consegue
alcançar os serviços externos Supabase. Isso é uma falha **ambiental**, não de código.

**Confirmação:** Gate 2 (unit-tests) = ✅ SUCCESS em `2fafe8ed` no GitHub Actions (run `40420603513`).

---

## Lista completa de testes falhando (21)

### CartStatusSelect.emptyCart.test.tsx (1)
```
CartStatusSelect — isEmpty bloqueia pronto_orcamento
  > bypass do disabled (keyboard nav / Radix interno): guard interno dispara toast SSOT e não chama onChange
```

### CloudStatusBanner.test.tsx (9)
```
CloudStatusBanner — visibilidade por papel e criticidade
  > EXIBE "down" para usuário não-dev (falha crítica)
  > EXIBE "degraded" para usuário não-dev (falha crítica)
  > EXIBE tudo para usuários dev
  > respeita o gate de infra: mesmo dev NÃO vê "warming" se isAllowed=false (Modo PROD)
  > abre painel de debug mostrando probes sem crash
  > abre timeline histórica mostrando falhas consecutivas
  > mostra spinner no botão Tentar novamente quando isChecking=true (cobertura de animate-spin)
  > renderiza timeline com cores distintas para healthy/down/warming (cobertura do ternário de cores)
```
(nota: 9 falhas listadas; a 9a — "EXIBE tudo para usuários dev" + 7 demais = 8 das 9; a última é
"renderiza timeline com cores distintas para healthy/down/warming")

### date-utils.test.ts (3)
```
formatDateTime
  > returns dd/MM/yyyy HH:mm for ISO string (UTC)
formatTime
  > returns HH:mm for ISO string
  > zero-pads hours and minutes
```

### magazineService.shapeDrift.test.ts (1)
```
magazineService — shape drift (observabilidade, não bloqueia)
  > lê a revista normalmente mesmo com product_snapshot legado sem colors/materials
```

### MockupProductSelector.test.tsx (7)
```
MockupProductSelector — grade responsiva e honestidade
  > em viewport estreito fatia as linhas em 2 colunas (sem sub-linha sobreposta)
  > em viewport largo fatia as linhas em 4 colunas
  > em viewport médio fatia as linhas em 3 colunas
  > espaça as linhas pela altura REAL medida no DOM (não pelos 280 px fixos)
  > mostra estoque e preço no card, sem esconder o item sem estoque
  > item sem estoque continua selecionável (não impede avançar)
  > rótulo da ordenação diz o alcance (apenas itens carregados)
```
Todos com timeout ~5000ms (fetch failed para Supabase externo)

---

## Classificação

| Teste | Causa raiz | Pré-existente? |
|-------|------------|----------------|
| CartStatusSelect.emptyCart | fetch failed (Supabase) | ✅ sim |
| CloudStatusBanner (9) | fetch failed (Supabase) | ✅ sim |
| date-utils (3) | fetch failed (Supabase) | ✅ sim |
| magazineService.shapeDrift | fetch failed (Supabase) | ✅ sim |
| MockupProductSelector (7) | fetch failed (Supabase) / timeout 5s | ✅ sim |

**Conclusão:** Nenhum dos 21 testes falhando é causado por qualquer PR analisada nesta sessão.
