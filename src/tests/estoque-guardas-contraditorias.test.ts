/**
 * Detector de guarda contraditória no /estoque.
 *
 * O repositório tinha, ao mesmo tempo:
 *   - `StockDashboard.header-removed.regression.test.ts:20,24` exigindo que
 *     `health-score-badge` e `critical-alerts-badge` NÃO existam no
 *     StockDashboard;
 *   - `e2e/routes/app/stock-dashboard.spec.ts:20-24` exigindo `toHaveCount(0)`
 *     para os mesmos testids na rota;
 *   - e 4 specs em `e2e/admin/` exigindo que eles estivessem VISÍVEIS.
 *
 * As quatro nunca deram vermelho porque o Gate 3 só roda spec marcada
 * `@smoke`. A contradição ficou latente por semanas.
 *
 * Este teste roda no Vitest (que o Gate 2 executa) e falha se uma spec ATIVA
 * voltar a exigir a presença desses testids. Quem quiser reativá-las tem de
 * reverter a decisão do cabeçalho primeiro — e aí este teste muda junto, de
 * propósito.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Testids que a decisão do dono removeu do /estoque. */
const REMOVIDOS = ['health-score-badge', 'critical-alerts-badge', 'health-score-info-trigger'];

/** Específicos: estes DEVEM citar os testids, porque guardam a ausência deles. */
const GUARDAS_DA_AUSENCIA = ['e2e/routes/app/stock-dashboard.spec.ts'];

function specs(dir: string): string[] {
  const saida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const cheio = join(dir, entrada);
    if (statSync(cheio).isDirectory()) saida.push(...specs(cheio));
    else if (extname(entrada) === '.ts' && entrada.endsWith('.spec.ts')) saida.push(cheio);
  }
  return saida;
}

describe('/estoque — nenhuma spec ativa exige o cabeçalho removido', () => {
  it('toda spec que cita os testids removidos está suspensa ou guarda a ausência', () => {
    const ofensores: string[] = [];

    for (const arquivo of specs('e2e')) {
      const caminho = arquivo.replace(/\\/g, '/');
      if (GUARDAS_DA_AUSENCIA.includes(caminho)) continue;

      const conteudo = readFileSync(arquivo, 'utf8');
      if (!REMOVIDOS.some((t) => conteudo.includes(t))) continue;

      // Citar é permitido; exigir presença numa spec ATIVA não é.
      const suspensa = /test\.describe\.skip\(|^test\.skip\(/m.test(conteudo);
      if (!suspensa) ofensores.push(caminho);
    }

    expect(
      ofensores,
      `Spec ativa exigindo um testid que a decisão do cabeçalho removeu:\n${ofensores.join('\n')}\n` +
        'Ou suspenda a spec com o motivo, ou reverta a decisão do cabeçalho.',
    ).toEqual([]);
  });

  it('o guarda da ausência continua exigindo contagem zero', () => {
    const conteudo = readFileSync('e2e/routes/app/stock-dashboard.spec.ts', 'utf8');
    for (const testid of REMOVIDOS) {
      expect(conteudo).toContain(testid);
    }
    expect(conteudo).toContain('toHaveCount(0)');
  });
});
