/**
 * useBluePremiumTheme — liga a família visual Blue Premium enquanto uma rota
 * do módulo Magazine está montada.
 *
 * Mecânica: `data-pg-theme="blue-premium"` no <html>. O CSS em
 * `../blue-premium.css` sobrescreve os tokens semânticos (background, card,
 * border, primary, radius, sombras…) só sob esse atributo — nenhuma outra
 * página do produto é afetada.
 *
 * Contador de referência: ao navegar entre páginas do módulo, o cleanup da
 * página anterior e o efeito da nova rodam no mesmo commit; sem o contador
 * o atributo seria removido e recolocado, piscando o tema.
 */

import { useLayoutEffect } from 'react';
import '../blue-premium.css';

export const PG_THEME_ATTR = 'data-pg-theme';
export const PG_THEME_VALUE = 'blue-premium';

let mounted = 0;

export function useBluePremiumTheme(): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    mounted += 1;
    root.setAttribute(PG_THEME_ATTR, PG_THEME_VALUE);
    return () => {
      mounted = Math.max(0, mounted - 1);
      if (mounted === 0) root.removeAttribute(PG_THEME_ATTR);
    };
  }, []);
}
