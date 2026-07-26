import { type ReactNode, Suspense, useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedErrorBoundary } from '@/components/errors/EnhancedErrorBoundary';
import { EmptyState } from '@/components/common/EmptyState';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { isDismissed, clearIfElevated } from '@/lib/security/mfaChallengeDismissal';
import { resolveSafeReturnPath, getLastInternalRoute } from '@/lib/security/lastInternalRoute';
import { trackMfaGuardDismissedRedirect } from '@/lib/analytics/mfaNavigationAnalytics';

const MfaEnrollmentDialog = lazyWithRetry(() =>
  import('@/components/security/MfaEnrollmentDialog').then((m) => ({
    default: m.MfaEnrollmentDialog,
  })),
);
const MfaChallengeDialog = lazyWithRetry(() =>
  import('@/components/security/MfaChallengeDialog').then((m) => ({
    default: m.MfaChallengeDialog,
  })),
);

function DialogFallback() {
  return null;
}

interface AdminRouteProps {
  children?: ReactNode;
}

/**
 * Wrapper para rotas administrativas.
 * Suporta Layout Routes (Outlet) e children diretos.
 * Redireciona para / se o usuário não for admin ou manager.
 *
 * Hardening: exige sessão em AAL2 (MFA verificado).
 *  - Sem MFA cadastrado → abre fluxo de enrollment obrigatório
 *  - Com MFA mas sessão em aal1 → abre challenge para elevar sessão
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, canManage, isLoading, currentAAL, hasMFA, mfaRequired } = useAuth();
  const location = useLocation();
  const [enrollOpen, setEnrollOpen] = useState(false);

  useEffect(() => {
    if (canManage && !hasMFA && !isLoading) setEnrollOpen(true);
  }, [canManage, hasMFA, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!canManage) {
    return (
      <div data-testid="app-access-denied" data-status="forbidden">
        <EmptyState
          variant="security"
          title="Área Administrativa"
          description="Acesso restrito a gestores e administradores."
          action={{ label: 'Voltar ao início', onClick: () => (window.location.href = '/') }}
        />
      </div>
    );
  }

  // Admin/manager sem MFA → mostra dialog de enrollment obrigatório (não renderiza filhos)
  if (!hasMFA) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Suspense fallback={<DialogFallback />}>
          <MfaEnrollmentDialog open={enrollOpen} onOpenChange={setEnrollOpen} enforce />
        </Suspense>
      </>
    );
  }

  // Admin/manager com MFA mas sessão ainda não está em AAL2 → exige challenge
  // antes de renderizar filhos. `currentAAL` pode ser `null` enquanto a consulta
  // de AAL hidrata; tratar apenas `aal1` liberava painel admin por uma janela
  // curta em rotas críticas.
  if (hasMFA && mfaRequired && currentAAL !== 'aal2') {
    // Quebra de loop: se o usuário já clicou em "Voltar" no dialog nesta
    // sessão, a reavaliação do guard (mount de outra rota admin, hidratação
    // tardia de AAL, etc.) NÃO deve reabrir o challenge — redireciona para
    // "/" e mantém o flag até que o próprio usuário volte para admin
    // conscientemente (a rota `/` limpa o flag ao remontar via
    // `clearIfElevated`; navegação subsequente para /admin reinicia o fluxo
    // apenas se o usuário chegar em AAL2).
    if (isDismissed(user.id)) {
      // Retorna exatamente para a última rota interna segura (sessionStorage
      // por userId) em vez de sempre "/": cobre histórico curto, deep link e
      // nova aba, onde `navigate(-1)` não teria destino interno confiável.
      const dismissedTarget = resolveSafeReturnPath(user.id, location.pathname);
      trackMfaGuardDismissedRedirect({
        guard: 'admin',
        fromPath: location.pathname,
        toPath: dismissedTarget,
        rememberedRoute: getLastInternalRoute(user.id),
      });
      return <Navigate to={dismissedTarget} replace />;
    }
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Suspense fallback={<DialogFallback />}>
          <MfaChallengeDialog open />
        </Suspense>
      </>
    );
  }

  // Sessão elevada → limpa flag remanescente de sessões passadas.
  clearIfElevated(user.id, currentAAL);


  return (
    <EnhancedErrorBoundary
      fallback={
        <div className="p-8">
          <EmptyState
            variant="error"
            title="Erro Administrativo"
            description="Não foi possível carregar o painel administrativo. Tente novamente."
            action={{ label: 'Recarregar', onClick: () => window.location.reload() }}
          />
        </div>
      }
    >
      {children ? <>{children}</> : <Outlet />}
    </EnhancedErrorBoundary>
  );
}
