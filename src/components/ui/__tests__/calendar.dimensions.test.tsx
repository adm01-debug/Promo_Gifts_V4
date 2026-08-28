/**
 * Quality Gate — Calendar dimensions contract.
 * Blinda o layout atual: mobile confortável (p-3, nav 44px, dia 13px)
 * com densidade compacta em md (md:p-1.5, nav 20px, dia 10px).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Calendar } from '../calendar';

const REF = new Date(2026, 6, 2);

afterEach(() => cleanup());

const classes = (el: Element | null | undefined) =>
  (el?.getAttribute('class') ?? '').toLowerCase();

describe('Calendar — dimensions contract', () => {
  it('container root mantém padding confortável no mobile e compacto em md', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);
    const root = container.querySelector('.rdp') ?? container.firstElementChild;
    const c = classes(root);
    expect(c).toMatch(/(^|\s)p-3(\s|$)/);
    expect(c).toMatch(/md:p-1\.5/);
    expect(c).not.toMatch(/(^|\s)p-4(\s|$)/);
  });


  it('caption_label é text-[15px] (não text-2xl)', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);
    const cap = container.querySelector('.capitalize');
    const c = classes(cap);
    expect(c).toMatch(/text-\[15px\]/);
    expect(c).not.toMatch(/text-2xl/);
  });

  it('nav_button mantém alvo amplo no mobile e tamanho compacto em md', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);
    const nav = Array.from(container.querySelectorAll<HTMLElement>('button')).find((b) =>
      /h-11\s+w-11/.test(b.getAttribute('class') ?? ''),
    );
    expect(nav).toBeTruthy();
    expect(classes(nav)).toMatch(/md:h-5/);
    expect(classes(nav)).toMatch(/md:w-5/);
  });

  it('cell usa distribuição fluida com aspect-square sem alturas fixas grandes', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);
    const cells = Array.from(
      container.querySelectorAll<HTMLElement>('[class*="flex-1"][class*="aspect-square"]'),
    );
    expect(cells.length).toBeGreaterThanOrEqual(20);
    for (const c of cells) {
      const cls = classes(c);
      expect(cls).toMatch(/flex-1/);
      expect(cls).toMatch(/aspect-square/);
      expect(cls).not.toMatch(/(?:^|\s)h-9(?:\s|$)/);
      expect(cls).not.toMatch(/(?:^|\s)h-10(?:\s|$)|(?:^|\s)w-10(?:\s|$)/);
    }
  });


  it('ícones nav seguem escala mobile/md atual', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);
    const svgs = Array.from(container.querySelectorAll<SVGElement>('svg'));
    const small = svgs.filter((s) => /h-5\s+w-5/.test(s.getAttribute('class') ?? ''));
    expect(small.length).toBeGreaterThanOrEqual(2);
    for (const icon of small.slice(0, 2)) {
      expect(icon.getAttribute('class') ?? '').toMatch(/md:h-3/);
      expect(icon.getAttribute('class') ?? '').toMatch(/md:w-3/);
    }
  });

  it('mantém a11y: role grid, focus-visible:ring nos nav, aria-selected em selected', () => {
    const { container } = render(
      <Calendar mode="single" selected={REF} defaultMonth={REF} />,
    );
    expect(container.querySelector('[role="grid"]')).toBeTruthy();
    const sel = container.querySelector('button[aria-selected="true"]');
    expect(sel).toBeTruthy();
    const navBtn = Array.from(container.querySelectorAll<HTMLElement>('button')).find((b) =>
      /h-11\s+w-11/.test(b.getAttribute('class') ?? ''),
    );
    expect(classes(navBtn)).toMatch(/focus-visible:ring-2/);
  });

  it('mantém classes atuais de month, rows, weekdays e days', () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);
    const month = Array.from(container.querySelectorAll<HTMLElement>('[class]')).find((el) =>
      classes(el).includes('space-y-2'),
    );
    expect(month, 'month container flex flex-col').toBeTruthy();
    expect(classes(month)).toMatch(/space-y-2/);
    expect(classes(month)).toMatch(/md:space-y-1/);

    const rows = Array.from(container.querySelectorAll<HTMLElement>('[class*="w-full"]'))
      .map((el) => classes(el))
      .filter((c) => /(^|\s)flex(\s|$)/.test(c) && c.includes('w-full'));
    const hasGap0Row = rows.some((c) => /(^|\s)gap-0(\s|$)/.test(c));
    expect(hasGap0Row, 'ao menos uma row com gap-0').toBe(true);

    const heads = Array.from(container.querySelectorAll<HTMLElement>('th, [role="columnheader"]'))
      .filter((h) => (h.textContent ?? '').trim().length > 0);
    expect(heads.length).toBeGreaterThanOrEqual(7);
    for (const h of heads.slice(0, 7)) {
      expect(classes(h)).toMatch(/text-\[10px\]/);
      expect(classes(h)).toMatch(/flex-1/);
      expect(classes(h)).toMatch(/md:text-\[7px\]/);
    }

    const dayBtns = Array.from(container.querySelectorAll<HTMLElement>('button[name="day"]'));
    expect(dayBtns.length).toBeGreaterThan(20);
    for (const b of dayBtns.slice(0, 10)) {
      expect(classes(b)).toMatch(/text-\[13px\]/);
      expect(classes(b)).toMatch(/md:text-\[10px\]/);
    }
  });
});
