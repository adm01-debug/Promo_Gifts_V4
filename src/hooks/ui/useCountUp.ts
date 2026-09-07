/**
 * useCountUp — hook compartilhado de animação numérica.
 *
 * ISSUE-28 FIX: a animação parte do valor ATUAL exibido (não de 0)
 * quando `end` muda. Isso evita reiniciar do zero durante re-renders
 * causados por refresh automático de stats (ex: cache SWR revalidation
 * após 5 min — fenômeno observado em NoveltyStatsCards antes da correção).
 *
 * Consumidores atuais:
 *   - src/components/novelties/NoveltyStatsCards.tsx
 *   - src/pages/magazine/components/MagazineStatsCards.tsx
 */

import { useState, useEffect, useRef } from 'react';

/**
 * @param end       Valor final da animação.
 * @param duration  Duração em ms (padrão 800ms, easeOutQuart).
 * @returns         Valor inteiro animado para exibição.
 */
export function useCountUp(end: number, duration = 800): number {
  const [count, setCount] = useState(0);
  // Rastreia o valor atual exibido para usar como ponto de partida
  // da próxima animação sem depender de closure desatualizado.
  const countRef = useRef(0);
  countRef.current = count;

  useEffect(() => {
    const startValue = countRef.current;
    if (startValue === end) return; // sem mudança — não reinicia animação

    let startTime: number | null = null;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutQuart: desacelera suavemente no final
      const eased = 1 - (1 - progress) ** 4;
      setCount(Math.round(startValue + (end - startValue) * eased));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [end, duration]);

  return count;
}
