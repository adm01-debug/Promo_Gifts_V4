// Etapa E42 (docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md)
// — testa scripts/check-edge-verify-jwt-allowlist.mjs, o gate que garante
// que toda edge function ao vivo com `verify_jwt=false` (chamável sem JWT do
// Supabase Auth) esteja documentada em
// `.security/edge-functions-verify-jwt-false-allowlist.json` com um motivo.
//
// Padrão de teste espelha tests/scripts/check-public-views-drift.test.mjs
// (E16): importa as funções puras do script (não só invoca via subprocess)
// e reproduz, via fixtures em memória, os cenários que motivam o gate —
// função nova com verify_jwt=false sem allowlist, entrada sem `reason`,
// entrada obsoleta (não é mais false ao vivo). Nenhum destes testes chama a
// Management API real.
import { describe, expect, it } from 'vitest';
import { diff, loadAllowlist, normalizeFunctions } from '../../scripts/check-edge-verify-jwt-allowlist.mjs';

// ─── normalizeFunctions ─────────────────────────────────────────────────────

describe('normalizeFunctions', () => {
  it('aceita um array direto no shape da Management API', () => {
    const out = normalizeFunctions([
      { slug: 'fn-a', verify_jwt: false, ezbr_sha256: 'abc' },
      { slug: 'fn-b', verify_jwt: true, ezbr_sha256: 'def' },
    ]);
    expect(out).toEqual([
      { slug: 'fn-a', verify_jwt: false, ezbr_sha256: 'abc' },
      { slug: 'fn-b', verify_jwt: true, ezbr_sha256: 'def' },
    ]);
  });

  it('aceita o shape { functions: [...] } (mesmo formato salvo por --out=)', () => {
    const out = normalizeFunctions({ functions: [{ slug: 'fn-a', verify_jwt: false }] });
    expect(out).toEqual([{ slug: 'fn-a', verify_jwt: false, ezbr_sha256: null }]);
  });

  it('exclui _shared e tests explicitamente (não são functions deployadas)', () => {
    const out = normalizeFunctions([
      { slug: '_shared', verify_jwt: false },
      { slug: 'tests', verify_jwt: false },
      { slug: 'real-fn', verify_jwt: false },
    ]);
    expect(out.map((f) => f.slug)).toEqual(['real-fn']);
  });

  it('trata verify_jwt ausente/truthy-estranho como false só quando !== true', () => {
    const out = normalizeFunctions([{ slug: 'fn-a' }, { slug: 'fn-b', verify_jwt: 'true' }]);
    expect(out).toEqual([
      { slug: 'fn-a', verify_jwt: false, ezbr_sha256: null },
      { slug: 'fn-b', verify_jwt: false, ezbr_sha256: null },
    ]);
  });

  it('devolve [] para payload inválido (nem array nem { functions })', () => {
    expect(normalizeFunctions({ foo: 'bar' })).toEqual([]);
    expect(normalizeFunctions(null)).toEqual([]);
  });
});

// ─── loadAllowlist sobre o allowlist real ──────────────────────────────────

describe('allowlist real (.security/edge-functions-verify-jwt-false-allowlist.json)', () => {
  it('carrega e tem >=36 entradas (contagem medida ao vivo em 2026-09-16)', () => {
    const { doc } = loadAllowlist();
    expect(Array.isArray(doc.functions)).toBe(true);
    expect(doc.functions.length).toBeGreaterThanOrEqual(36);
  });

  it('toda entrada tem slug, category e reason não-vazios', () => {
    const { doc } = loadAllowlist();
    for (const e of doc.functions) {
      expect(typeof e.slug).toBe('string');
      expect(e.slug.length).toBeGreaterThan(0);
      expect(typeof e.category).toBe('string');
      expect(e.category.length).toBeGreaterThan(0);
      expect(typeof e.reason).toBe('string');
      expect(e.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it('não tem slugs duplicados', () => {
    const { doc } = loadAllowlist();
    const slugs = doc.functions.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

// ─── diff: reproduz os cenários que o gate precisa pegar ───────────────────

describe('diff (lógica pura de comparação)', () => {
  const baseDoc = {
    functions: [
      { slug: 'known-public', category: 'public', reason: 'endpoint público por design' },
      { slug: 'known-cron', category: 'service', reason: 'cron via x-cron-secret' },
    ],
  };

  it('PASSA (sem findings) quando toda função false-jwt ao vivo está na allowlist', () => {
    const live = [
      { slug: 'known-public', verify_jwt: false, ezbr_sha256: 'a' },
      { slug: 'known-cron', verify_jwt: false, ezbr_sha256: 'b' },
      { slug: 'authenticated-fn', verify_jwt: true, ezbr_sha256: 'c' },
    ];
    const { newFindings, missingReasons, staleAllowlist } = diff(live, baseDoc);
    expect(newFindings).toEqual([]);
    expect(missingReasons).toEqual([]);
    expect(staleAllowlist).toEqual([]);
  });

  it('FALHA (newFindings) quando uma função nova aparece com verify_jwt=false sem allowlist', () => {
    const live = [
      { slug: 'known-public', verify_jwt: false, ezbr_sha256: 'a' },
      { slug: 'known-cron', verify_jwt: false, ezbr_sha256: 'b' },
      { slug: 'surprise-public-fn', verify_jwt: false, ezbr_sha256: 'z' },
    ];
    const { newFindings } = diff(live, baseDoc);
    expect(newFindings).toEqual(['surprise-public-fn']);
  });

  it('FALHA (missingReasons) quando uma entrada da allowlist tem reason vazio', () => {
    const docComReasonVazio = {
      functions: [
        { slug: 'known-public', category: 'public', reason: 'ok' },
        { slug: 'known-cron', category: 'service', reason: '   ' },
      ],
    };
    const live = [
      { slug: 'known-public', verify_jwt: false },
      { slug: 'known-cron', verify_jwt: false },
    ];
    const { missingReasons } = diff(live, docComReasonVazio);
    expect(missingReasons).toEqual(['known-cron']);
  });

  it('sinaliza staleAllowlist quando uma função documentada deixou de ser verify_jwt=false ao vivo', () => {
    const live = [
      { slug: 'known-public', verify_jwt: false },
      { slug: 'known-cron', verify_jwt: true }, // foi corrigida para exigir JWT
    ];
    const { staleAllowlist, newFindings } = diff(live, baseDoc);
    expect(staleAllowlist).toEqual(['known-cron']);
    expect(newFindings).toEqual([]);
  });

  it('função ausente da lista ao vivo (não voltou nesta consulta) não gera newFinding falso', () => {
    // Só o que está EXPLICITAMENTE false-jwt na lista ao vivo entra em
    // newFindings — uma função que simplesmente não apareceu no payload não
    // deve ser tratada como "nova função pública sem allowlist".
    const live = [{ slug: 'known-public', verify_jwt: false }];
    const { newFindings, staleAllowlist } = diff(live, baseDoc);
    expect(newFindings).toEqual([]);
    expect(staleAllowlist).toEqual(['known-cron']);
  });
});
