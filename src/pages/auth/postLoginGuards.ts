import type { NavigateFunction } from 'react-router-dom';
import type { useToast } from '@/hooks/ui/use-toast';
import type { IPValidationResult } from '@/hooks/admin/useIPValidation';
import { logger } from '@/lib/logger';

interface PostLoginGuardDeps {
  validateIPForAuthenticatedUser: (userId: string) => Promise<IPValidationResult>;
  logLoginAttempt: (
    email: string,
    userId: string | null,
    success: boolean,
    failureReason?: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  toast: ReturnType<typeof useToast>['toast'];
  navigate: NavigateFunction;
  resolveRedirectTarget: () => string;
  setIpBlocked: (blocked: boolean) => void;
  setBlockedIP: (ip: string | null) => void;
  setLoginStatus: (status: 'idle' | 'success') => void;
}

// Guards pós-login extraídos de Auth.tsx (file-size ratchet).
// `ensureIPAllowed` precisa rodar antes de QUALQUER redirect com sessão ativa
// (inclusive o fluxo de senha fraca → /reset-password): um IP bloqueado deve
// encerrar a sessão sem navegar.
export function createPostLoginGuards(deps: PostLoginGuardDeps) {
  const {
    validateIPForAuthenticatedUser,
    logLoginAttempt,
    signOut,
    toast,
    navigate,
    resolveRedirectTarget,
    setIpBlocked,
    setBlockedIP,
    setLoginStatus,
  } = deps;

  const ensureIPAllowed = async (userId: string, email: string): Promise<boolean> => {
    const ipValidation = await validateIPForAuthenticatedUser(userId);

    if (!ipValidation.isAllowed && ipValidation.hasRestrictions) {
      await signOut();
      const reason = ipValidation.reason || 'access_blocked';
      await logLoginAttempt(email, userId, false, `${reason}: ${ipValidation.error}`);

      setIpBlocked(true);
      setBlockedIP(ipValidation.currentIP);

      toast({
        variant: 'destructive',
        title: 'Acesso Bloqueado',
        description:
          ipValidation.error || `Seu IP (${ipValidation.currentIP}) não está autorizado.`,
        duration: 10000,
      });
      return false;
    }
    return true;
  };

  const validateAndRedirect = async (userId: string, email: string, ipChecked = false) => {
    try {
      if (!ipChecked && !(await ensureIPAllowed(userId, email))) return false;

      // A linha success em login_attempts é escrita por AuthContext.signIn
      // (fonte única, com prova de sessão → verified=true). Escrever aqui
      // gerava linha duplicada por login.

      setLoginStatus('success');
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });

      // Aguarda o feedback visual de sucesso antes de navegar
      setTimeout(() => {
        navigate(resolveRedirectTarget(), { replace: true });
      }, 600);
      return true;
    } catch {
      logger.warn('[AUTH_POST_LOGIN_VALIDATION] continuing with fail-open redirect');
      navigate(resolveRedirectTarget(), { replace: true }); // Fail-open
      return true;
    }
  };

  return { ensureIPAllowed, validateAndRedirect };
}
