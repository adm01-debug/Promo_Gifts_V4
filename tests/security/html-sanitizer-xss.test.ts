/**
 * Sanitização de rich-text — `src/lib/security/validation.ts`.
 *
 * Auditoria r3 (dimensão 19 · Validação): o sanitizador existia sem nenhum
 * teste. Esta suíte fixa o contrato do que `sanitizeHtml`/`createSafeHtml`
 * removem (vetores XSS clássicos e ofuscados) e do que preservam (a
 * allowlist de tags/atributos), além do escape total de `sanitizeString`.
 *
 * Se a allowlist mudar de propósito, ajuste os casos "preserva" e mantenha
 * os casos "remove" — eles são o invariante de segurança.
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeString,
  createSafeHtml,
  safeHtml,
  safeString,
} from '@/lib/security/validation';

const XSS_VECTORS: Array<[string, string]> = [
  ['script inline', '<script>alert(1)</script>'],
  ['script com atributos', '<script src="https://evil.example/x.js"></script>'],
  ['img onerror', '<img src=x onerror="alert(1)">'],
  ['svg onload', '<svg onload="alert(1)"></svg>'],
  ['a href javascript:', '<a href="javascript:alert(1)">x</a>'],
  ['iframe srcdoc', '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
  ['object/embed', '<object data="data:text/html;base64,PHNjcmlwdD4="></object><embed src="x">'],
  ['form action', '<form action="javascript:alert(1)"><input type="submit"></form>'],
  ['event handler em tag permitida', '<p onclick="alert(1)">x</p>'],
  ['event handler com caixa mista', '<span OnMouseOver="alert(1)">x</span>'],
  ['tag fechada dentro de atributo', '<b title="</b><script>alert(1)</script>">x</b>'],
  ['entidade ofuscada', '<a href="&#106;avascript:alert(1)">x</a>'],
  ['math/mglyph', '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>'],
  ['style com expression', '<div style="width: expression(alert(1))">x</div>'],
  ['base href', '<base href="https://evil.example/">'],
  ['meta refresh', '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
];

const DANGEROUS =
  /<\s*(script|iframe|object|embed|form|input|base|meta|svg|math|img)\b|on[a-z]+\s*=|javascript:/i;

describe('sanitizeHtml — remove vetores XSS', () => {
  it.each(XSS_VECTORS)('%s', (_label, payload) => {
    const out = sanitizeHtml(payload);
    expect(out).not.toMatch(DANGEROUS);
    expect(out).not.toContain('alert(1)');
  });

  it('não deixa passar handler on* em nenhuma tag permitida', () => {
    const tags = ['b', 'i', 'u', 'p', 'span', 'ul', 'ol', 'li', 'strong', 'em'];
    for (const t of tags) {
      const out = sanitizeHtml(`<${t} onclick="alert(1)" onmouseover="alert(2)">x</${t}>`);
      expect(out, t).not.toMatch(/on[a-z]+\s*=/i);
      expect(out, t).toContain(`<${t}`);
    }
  });

  it('remove atributos fora da allowlist (href, src, id, data-*)', () => {
    const out = sanitizeHtml(
      '<span id="a" data-x="1" href="https://x" src="y" class="ok" style="color:red">x</span>',
    );
    expect(out).not.toMatch(/\b(id|data-x|href|src)=/);
    expect(out).toContain('class="ok"');
    expect(out).toContain('style="color:red');
  });
});

describe('sanitizeHtml — preserva a allowlist', () => {
  it('mantém tags de formatação e listas', () => {
    const html =
      '<p>Olá <b>mundo</b> <i>it</i> <u>u</u> <strong>s</strong> <em>e</em><br><span class="x">s</span></p><ul><li>a</li></ul><ol><li>b</li></ol>';
    const out = sanitizeHtml(html);
    for (const t of [
      '<p>',
      '<b>',
      '<i>',
      '<u>',
      '<strong>',
      '<em>',
      '<br>',
      '<span class="x">',
      '<ul>',
      '<ol>',
      '<li>',
    ]) {
      expect(out).toContain(t);
    }
  });

  it('remove a tag desconhecida mas mantém o texto interno', () => {
    expect(sanitizeHtml('<div><h1>Título</h1><a href="https://x">link</a></div>')).toBe(
      'Títulolink',
    );
  });

  it('vazio, null-ish e texto puro', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    expect(sanitizeHtml('texto simples')).toBe('texto simples');
  });

  it('é idempotente', () => {
    const once = sanitizeHtml('<p onclick="x">a<script>b</script></p>');
    expect(sanitizeHtml(once)).toBe(once);
  });
});

describe('createSafeHtml / transformers Zod', () => {
  it('createSafeHtml devolve __html já sanitizado', () => {
    expect(createSafeHtml('<b>ok</b><script>alert(1)</script>')).toEqual({ __html: '<b>ok</b>' });
  });

  it('safeHtml aplica trim + sanitizeHtml', () => {
    expect(safeHtml.parse('  <p>a</p><img src=x onerror=alert(1)>  ')).toBe('<p>a</p>');
  });

  it('safeString aplica trim + escape total', () => {
    expect(safeString.parse('  <b>x</b> & "y" \'z\'  ')).toBe(
      '&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot; &#x27;z&#x27;',
    );
  });
});

describe('sanitizeString — escape total para contexto de texto', () => {
  it('escapa os 5 caracteres especiais e nada mais', () => {
    expect(sanitizeString('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#x27;');
    expect(sanitizeString('abc 123 áé')).toBe('abc 123 áé');
  });

  it('não produz HTML interpretável a partir de um payload', () => {
    const out = sanitizeString('<img src=x onerror="alert(1)">');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).toContain('&lt;img');
  });

  it('vazio e null-ish', () => {
    expect(sanitizeString('')).toBe('');
    expect(sanitizeString(undefined as unknown as string)).toBe('');
  });
});
