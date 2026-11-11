import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const script = resolve(root, 'scripts/ssot-report-annotations.mjs');

function run(reportJson) {
  const dir = mkdtempSync(join(tmpdir(), 'ssot-annotations-'));
  try {
    const inPath = join(dir, 'ssot-report.json');
    writeFileSync(inPath, JSON.stringify(reportJson));
    return execFileSync('node', [script, `--in=${inPath}`], { encoding: 'utf8' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('ssot-report-annotations', () => {
  it('não escapa ":" e "," na mensagem do ::error (só título/propriedades)', () => {
    const stdout = run({
      details: [
        {
          ok: false,
          label: 'typecheck',
          stdout: "src/foo.ts:10:5: error TS1005: ';' expected, fix it now",
          stderr: '',
        },
      ],
    });

    const errorLine = stdout.split('\n').find((l) => l.startsWith('::error'));
    expect(errorLine).toBeDefined();
    const message = errorLine.split('::').slice(2).join('::');

    // A mensagem (depois do 2º "::") não é delimitada por ":" / "," — o
    // runner do GitHub Actions não decodifica %3A/%2C ali. Escapá-los faz a
    // mensagem aparecer mutilada ("%3A" literal) na UI de Actions.
    expect(message).toBe("src/foo.ts:10:5: error TS1005: ';' expected, fix it now");
    expect(message).not.toContain('%3A');
    expect(message).not.toContain('%2C');

    // As propriedades (antes do 2º "::") continuam escapadas corretamente.
    const props = errorLine.split('::')[1];
    expect(props).toContain('title=SSOT gate falhou%3A typecheck');
    expect(props).toContain('file=src/foo.ts');
  });
});
