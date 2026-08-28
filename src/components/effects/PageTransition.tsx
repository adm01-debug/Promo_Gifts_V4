import { type ReactNode, useEffect, useRef, useState } from 'react';
import { m as motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { performanceTracker } from '@/utils/performance';

type TransitionVariant =
  | 'fade-slide'
  | 'fade'
  | 'scale'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up';

interface PageTransitionProps {
  children: ReactNode;
  variant?: TransitionVariant;
  duration?: number;
  className?: string;
}

/**
 * PageTransition (simples): DIV com key da pathname + classe CSS de fade.
 *
 * HISTÓRICO: usava framer-motion `AnimatePresence` + `motion.div` com
 * `initial={{opacity:0}} animate={{opacity:1}}`. Isso quebrou em algumas
 * navegações SPA (motion.div ficava invisível mesmo após `onAnimationComplete`
 * — problema de reconciliação entre AnimatePresence e Suspense). Substituí
 * por transição CSS pura que sempre respeita opacity:1 ao final.
 */
export function PageTransition({
  children,
  variant: _variant = 'fade',
  duration: _duration = 0.3,
  className,
}: PageTransitionProps) {
  const location = useLocation();
  const [mountedKey, setMountedKey] = useState(location.pathname);
  // opacity inicia em 1 para que o conteudo apareca imediatamente no
  // primeiro render (hard reload / abrir URL direto). Animacao fade acontece
  // apenas em navegacoes SPA subsequentes.
  const [opacity, setOpacity] = useState(1);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const pathnameChanged = prevPathRef.current !== location.pathname;

    if (!pathnameChanged) {
      // First render OU mesma pathname: nada a fazer.
      return;
    }

    // Pathname mudou (navegacao SPA): fade-out/fade-in.
    prevPathRef.current = location.pathname;
    setMountedKey(location.pathname);
    setOpacity(0);
    performanceTracker.mark(`page-transition-start:${location.pathname}`);

    // requestAnimationFrame garante que o CSS pegue opacity:0 antes da
    // transicao animar para 1.
    requestAnimationFrame(() => {
      setOpacity(1);
    });
  }, [location.pathname]);

  useEffect(() => {
    performanceTracker.mark(`page-transition-end:${location.pathname}`);
    performanceTracker.measure(
      `Page Animation: ${location.pathname}`,
      `page-transition-start:${location.pathname}`,
      `page-transition-end:${location.pathname}`,
    );
  }, [location.pathname]);

  return (
    <div
      key={mountedKey}
      data-pathname={location.pathname}
      style={{
        opacity,
        transition: 'opacity 300ms ease-out',
      }}
      className={className}
    >
      {children}
    </div>
  );
}

// Staggered container for child animations
interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className,
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={{
        ...containerVariants,
        visible: {
          ...containerVariants.visible,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// Fade in on scroll
interface FadeInViewProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function FadeInView({ children, className, delay = 0 }: FadeInViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
