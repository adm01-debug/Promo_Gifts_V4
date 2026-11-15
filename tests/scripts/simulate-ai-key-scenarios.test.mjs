/**
 * Testes para scripts/simulate-ai-key-scenarios.mjs
 *
 * Cobre um bug real encontrado em auditoria adversarial do gate estático:
 *
 * Falso-positivo: a checagem de entrada (`src.includes(SECRET)`) e as regex
 * do gate estático não ignoravam comentários. Uma função que apenas MENCIONA
 * `LOVABLE_API_KEY` num comentário histórico/explicativo (ex.: "removido
 * Deno.env.get('LOVABLE_API_KEY')"), sem de fato ler a credencial, era
 * contabilizada como auditada e reprovada com "lê LOVABLE_API_KEY sem o
 * SSOT" — apesar de não usar a secret em nenhum código real. Isso já
 * ocorria silenciosamente no repo real em `supabase/functions/trends-insights/
 * index.ts` (só tem a secret num comentário) e só não quebrava o CI porque a
 * função está no `ALLOWLIST` por outro motivo.
 *
 * Corrigido removendo comentários de linha (`//...`) do código antes de
 * qualquer checagem do gate (entrada e as 4 regex).
 *
 * Uma segunda função ("sneaky-fn") prova que o fix não introduziu
 * falso-negativo: ela MENCIONA o helper SSOT num comentário mas lê a
 * credencial de verdade via `Deno.env.get` fora do comentário — continua
 * sendo reprovada.
 */
import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REAL_SCRIPT = join(ROOT, 'scripts/simulate-ai-key-scenarios.mjs');

function makeSandbox(prefix) {
  const sandbox = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(sandbox, 'scripts'), { recursive: true });
  mkdirSync(join(sandbox, 'supabase/functions'), { recursive: true });
  // FUNCTIONS_DIR é relativo ao cwd do processo — por isso o cwd do spawn é o sandbox.
  copyFileSync(REAL_SCRIPT, join(sandbox, 'scripts/simulate-ai-key-scenarios.mjs'));
  return sandbox;
}

function run(sandbox) {
  const scriptPath = join(sandbox, 'scripts/simulate-ai-key-scenarios.mjs');
  const result = spawnSync(process.execPath, [scriptPath], { cwd: sandbox, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

test('função que só menciona LOVABLE_API_KEY em comentário (sem uso real) não reprova o gate (falso-positivo)', () => {
  const sandbox = makeSandbox('ai-key-comment-only-');
  try {
    mkdirSync(join(sandbox, 'supabase/functions/comment-only-fn'), { recursive: true });
    writeFileSync(
      join(sandbox, 'supabase/functions/comment-only-fn/index.ts'),
      [
        '// Esta função NÃO usa LOVABLE_API_KEY diretamente.',
        '// Historicamente tentamos usar LOVABLE_API_KEY aqui, mas foi removido.',
        'export default function handler() {',
        "  return new Response('ok');",
        '}',
        '',
      ].join('\n'),
    );

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    // Antes da correção: audited=1 e falhava com "lê LOVABLE_API_KEY sem o
    // SSOT" apesar de a função não usar a secret em código real nenhum.
    expect(code).toBe(0);
    expect(combined).not.toMatch(/comment-only-fn/);
    expect(combined).toMatch(/0 edge functions auditadas/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test('violação real (Deno.env.get direto fora de comentário) continua reprovando o gate', () => {
  const sandbox = makeSandbox('ai-key-real-violation-');
  try {
    mkdirSync(join(sandbox, 'supabase/functions/sneaky-fn'), { recursive: true });
    writeFileSync(
      join(sandbox, 'supabase/functions/sneaky-fn/index.ts'),
      [
        '// _shared/ai-credentials.ts mencionado aqui só em comentário, não é usado de fato',
        "const key = Deno.env.get('LOVABLE_API_KEY');",
        "if (!key) throw new Error('missing');",
        '',
      ].join('\n'),
    );

    const { code, stdout, stderr } = run(sandbox);
    const combined = stdout + stderr;

    expect(code).toBe(1);
    expect(combined).toMatch(/sneaky-fn: lê LOVABLE_API_KEY sem o SSOT/);
    expect(combined).toMatch(/sneaky-fn: leitura direta de Deno\.env\.get\('LOVABLE_API_KEY'\) — use o SSOT/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
