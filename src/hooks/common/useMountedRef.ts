import { useEffect, useRef } from 'react';

/**
 * `true` enquanto o componente está montado. Usado para não gravar estado
 * quando a resposta assíncrona chega depois do desmonte.
 */
export function useMountedRef() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}
