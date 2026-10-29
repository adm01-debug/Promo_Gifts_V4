# Regras de Negócio — Análise de PRs (2026-10-29)

## SSOT e Projeto Canônico
- `doufsxqlfjyuvxuezpln` é o único projeto Supabase de produção (Gold/Medallion)
- O projeto legado `pqpdolkaeqlyzpdpbizo` [LEGACY_INFORMATIVO] (SINGU) é READ-ONLY e fora do escopo de qualquer PR
- Qualquer PR que referencie o ID legado [LEGACY_INFORMATIVO] em código executável → NAO_MERGEAR

## Gates de Merge Autônomo
Um agente pode mergear autonomamente (squash) apenas quando:
1. PR não é draft
2. Gate Final (`Gate Final - Deploy Ready`) = ✅ success no HEAD atual
3. `mergeable_state` = `clean` (não `blocked`, `dirty`, `behind`)
4. PR não toca `.github/workflows/`, `.github/actions/`, `supabase/migrations/`
5. Branch não é desta sessão (branch própria = NAO_MERGEAR ou AGUARDAR)

## Regras de Escalada (DECISAO_HUMANA)
- Qualquer PR tocando `.github/workflows/**` → DECISAO_HUMANA
- Qualquer PR tocando `.github/actions/**` → DECISAO_HUMANA
- Qualquer PR tocando `supabase/migrations/**` → DECISAO_HUMANA
- DDL fora do fluxo `db-apply-migration.yml` → DECISAO_HUMANA
- Infraestrutura CI/CD, Dockerfile, stack/Swarm, Traefik → DECISAO_HUMANA
- Deleção de dado ou mudança arquitetural → DECISAO_HUMANA

## Conflitos
- Branch com `mergeable_state: dirty` → CONFLITO
- Agente só pode resolver conflito em branch que ele mesmo criou nesta sessão
- Branches de outras sessões/agentes: REGRA #10 — só leitura

## Drafts
- PR em draft → não elegível para merge, veredicto AGUARDA_CI_DRAFT

## Tipo Product
- Campos críticos `price`, `sale_price?`, `shortDescription`, `category_id?`, `category_name?` devem permanecer em `src/types/product-catalog.ts`
- PR que remova qualquer desses campos → rejeitar

## Proteção Gate E40
- Gate E40 (db-schema-drift-check) com falha de rate limit ghcr.io é pré-existente no main `4b4206ab`
- Não é regressão de PR — ignorar ao avaliar CIs de PRs
