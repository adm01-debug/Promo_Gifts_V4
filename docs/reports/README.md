# Relatórios de auditoria técnica

Um relatório por round. Cada round re-mede as 20 dimensões com evidência viva (pg_catalog,
advisors, Portainer, Vercel, GitHub API, validação local) e registra as erratas do round anterior.
O mais recente é a referência; os anteriores ficam como histórico da evolução da nota.

| Round | Data | Nota | Arquivo |
|---|---|---|---|
| r3 | 2026-09-05 | 8.1 | [`auditoria-tecnica-2026-09-05-r3.md`](./auditoria-tecnica-2026-09-05-r3.md) |
| r2 | 2026-09-02 | 8.0 | [`auditoria-tecnica-2026-09-02-r2.md`](./auditoria-tecnica-2026-09-02-r2.md) |
| r1 | 2026-09-01 | 7.8 | [`auditoria-tecnica-2026-09-02.html`](./auditoria-tecnica-2026-09-02.html) |

Auditorias temáticas anteriores (2026-05 a 2026-08) estão em `docs/AUDITORIA_*.md`, `docs/AUDIT_*.md`
e `audit/`. Não são atualizadas; valem como contexto histórico.

## Como um round é produzido

1. Inventário (Fase 0) com contagens medidas, nunca herdadas do round anterior.
2. 20 dimensões com nota, evidência (arquivo/linha ou query), gaps e ações.
3. Scorecard ponderado: crítico ×3 (Segurança, Autenticação, Autorização, Data Integrity),
   alto ×2 (Banco, Tipagem, Validação, Testes, Arquitetura), padrão ×1 (demais).
4. Top 10 por ROI e roadmap em 3 ondas.
5. Erratas do round anterior e adendo de execução quando os quick wins são aplicados.
