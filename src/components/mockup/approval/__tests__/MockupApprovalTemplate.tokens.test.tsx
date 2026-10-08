/**
 * Guarda do documento timbrado — MockupApprovalTemplate (decisão Q19: o papel
 * impresso preserva a identidade da marca; o app segue o Blue Premium).
 *   1. nenhum hex literal fora de `DOC_TOKENS` (varredura do próprio fonte);
 *   2. renderização idêntica antes/depois da centralização (snapshot);
 *   3. rodapé e aviso de prévia do mockup continuam presentes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CSSProperties } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DOC_TOKENS, MockupApprovalTemplate } from '../MockupApprovalTemplate';
import type { MockupApprovalData } from '@/types/mockup-approval';

vi.mock('@/components/pdf/proposal/LogoWithTransparentBg', () => ({
  LogoWithTransparentBg: (props: { src: string; alt?: string; style?: CSSProperties }) => (
    <img {...props} />
  ),
}));

const SOURCE_PATH = join(
  process.cwd(),
  'src/components/mockup/approval/MockupApprovalTemplate.tsx',
);

const DATA: MockupApprovalData = {
  documentNumber: 'PB-2026-0042',
  date: '08/10/2026 14:20',
  client: {
    name: 'Cliente Exemplo Ltda',
    cnpj: '12345678000199',
    contactName: 'Maria Souza',
    phone: '(11) 98888-7777',
  },
  seller: { name: 'Joaquim Silva', email: 'joaquim@promobrindes.com.br' },
  product: {
    name: 'Garrafa Térmica Inox 500 ml',
    sku: 'GRF-500-INOX',
    color: 'Azul',
    colorHex: '#0b6efd',
    material: 'Aço inox 304',
    heightCm: 26,
    diameterCm: 7.4,
    capacityMl: 500,
    weightG: 320,
  },
  personalization: {
    techniqueName: 'Serigrafia',
    locationName: 'Frente',
    widthCm: 6,
    heightCm: 3,
    areaCm2: 18,
    colorsCount: 2,
  },
  pantoneColors: [
    { name: 'PANTONE 2925 C', hex: '#0b6efd' },
    { name: 'PANTONE 1795 C', hex: '#d22630' },
  ],
  mockupImageUrl: 'https://example.com/mockup.jpg',
  layoutMode: 'ai',
  notes: 'Entrega em até 15 dias úteis.',
};

/** Relógio fixo em horário LOCAL (sem Z) — o snapshot não depende do TZ da máquina. */
function fixClock() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-08T14:20:00'));
}

function renderDocument(data: MockupApprovalData = DATA) {
  return render(<MockupApprovalTemplate data={data} />).container;
}

describe('MockupApprovalTemplate — tokens do documento', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aplica o verde institucional do timbrado nas faixas de marca', () => {
    const fills = Array.from(renderDocument().querySelectorAll('svg [fill]')).map((el) =>
      el.getAttribute('fill'),
    );
    expect(fills).toContain(DOC_TOKENS.green);
  });

  it('não deixou nenhuma cor hex literal fora de DOC_TOKENS', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const start = source.indexOf('export const DOC_TOKENS');
    const end = source.indexOf('} as const;', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const outsideTokens = source.slice(0, start) + source.slice(end);
    expect(outsideTokens.match(/#[0-9a-fA-F]{3,8}/g) ?? []).toEqual([]);
  });

  it('renderiza idêntico antes e depois da centralização (snapshot)', () => {
    fixClock();
    expect(renderDocument().innerHTML).toMatchSnapshot();
  });

  it('mantém o aviso de geração eletrônica no rodapé', () => {
    fixClock();
    expect(renderDocument().textContent).toContain(
      'Documento gerado eletronicamente por Joaquim Silva em 08/10/2026, 14:20',
    );
  });

  it('mantém o aviso de prévia do mockup sob a imagem', () => {
    expect(renderDocument().textContent).toContain('Gerado com IA');
    expect(renderDocument({ ...DATA, layoutMode: 'static' }).textContent).toContain(
      'Composição Estática',
    );
  });
});
