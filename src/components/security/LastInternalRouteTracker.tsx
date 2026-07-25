/**
 * Rastreia a última rota interna "segura" (fora de AAL2 / auth) por usuário.
 * O MfaChallengeDialog usa esse valor como destino preferencial do "Voltar",
 * caindo em `navigate(-1)` e depois "/" apenas se não houver rota lembrada.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { rememberLastInternalRoute, isSafeReturnPath } from '@/lib/security/lastInternalRoute';

export function LastInternalRouteTracker() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (isSafeReturnPath(location.pathname)) {
      rememberLastInternalRoute(user.id, path);
    }
  }, [user?.id, location.pathname, location.search, location.hash]);

  return null;
}
