import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { safeAuthCall, type SafeAuthResult } from '@/lib/auth/safeAuthCall';
type UnknownData = Record<string, unknown> | null;

// E122 — elimina `as unknown as` em safeAuthCall: adapta qualquer resultado
// Supabase para o shape genérico { data: UnknownData; error: unknown }.
// data é opcional pois métodos como signOut retornam apenas { error }.
function adaptAuth(r: { data?: unknown; error: unknown }): { data: UnknownData; error: unknown } {
  return { data: (r.data ?? null) as UnknownData, error: r.error };
}

export const authService = {
  async signIn(email: string, password: string, opts?: { captchaToken?: string }) {
    return supabase.auth.signInWithPassword({
      email,
      password,
      // captchaToken é exigido pelo GoTrue quando CAPTCHA está ativo no
      // projeto (Auth → settings); sem a flag ele é ignorado — dormente.
      ...(opts?.captchaToken ? { options: { captchaToken: opts.captchaToken } } : {}),
    });
  },

  /**
   * Variante resiliente de signIn (Onda 7 — safeAuthCall SSOT).
   * Retorna `SafeAuthResult` classificado + userMessage sanitizada.
   * Novos callers devem preferir esta; `signIn` legado mantido para
   * compat com AuthContext e testes existentes.
   */
  async signInSafe(
    email: string,
    password: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(
      () => supabase.auth.signInWithPassword({ email, password }).then(adaptAuth),
      { op: 'signIn', signal: opts.signal },
    );
  },

  // ==== Onda 8 — família Safe completa ====

  async signUpSafe(
    email: string,
    password: string,
    opts: { signal?: AbortSignal; emailRedirectTo?: string } = {},
  ): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(
      () =>
        supabase.auth
          .signUp({
            email,
            password,
            options: opts.emailRedirectTo ? { emailRedirectTo: opts.emailRedirectTo } : undefined,
          })
          .then(adaptAuth),
      { op: 'signUp', signal: opts.signal },
    );
  },

  async signOutSafe(opts: { signal?: AbortSignal } = {}): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(() => supabase.auth.signOut({ scope: 'global' }).then(adaptAuth), {
      op: 'signOut',
      signal: opts.signal,
    });
  },

  async resetPasswordSafe(
    email: string,
    opts: { signal?: AbortSignal; redirectTo?: string } = {},
  ): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(
      () =>
        supabase.auth
          .resetPasswordForEmail(email, {
            redirectTo: opts.redirectTo,
          })
          .then(adaptAuth),
      { op: 'resetPassword', signal: opts.signal },
    );
  },

  async updatePasswordSafe(
    password: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(() => supabase.auth.updateUser({ password }).then(adaptAuth), {
      op: 'updatePassword',
      signal: opts.signal,
    });
  },

  async verifyOtpSafe(
    params: { email: string; token: string; type: 'email' | 'magiclink' | 'recovery' },
    opts: { signal?: AbortSignal } = {},
  ): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(() => supabase.auth.verifyOtp(params).then(adaptAuth), {
      op: 'verifyOtp',
      signal: opts.signal,
    });
  },

  async refreshSessionSafe(
    opts: { signal?: AbortSignal } = {},
  ): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(() => supabase.auth.refreshSession().then(adaptAuth), {
      op: 'refreshSession',
      signal: opts.signal,
    });
  },

  // ==== Onda 16 — OAuth boot/redirect + PKCE callback ====

  async signInWithOAuthSafe(
    params: { provider: 'apple' | 'google'; redirectTo?: string },
    opts: { signal?: AbortSignal } = {},
  ): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(
      () =>
        supabase.auth
          .signInWithOAuth({
            provider: params.provider,
            options: params.redirectTo ? { redirectTo: params.redirectTo } : undefined,
          })
          .then(adaptAuth),
      { op: 'signInWithOAuth', signal: opts.signal, maxRetries: 1 },
    );
  },

  async exchangeCodeForSessionSafe(
    code: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<SafeAuthResult<UnknownData>> {
    return safeAuthCall(() => supabase.auth.exchangeCodeForSession(code).then(adaptAuth), {
      op: 'exchangeCodeForSession',
      signal: opts.signal,
      maxRetries: 1,
    });
  },

  async signOut() {
    try {
      await Promise.race([
        supabase.rpc('log_user_logout'),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout RPC')), 2000);
        }),
      ]);
    } catch (err) {
      logger.warn('log_user_logout failed', { err: String(err) });
    }
    return supabase.auth.signOut({ scope: 'global' });
  },

  async fetchAAL() {
    const [{ data: aalData }, { data: factorsData }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    return {
      currentAAL: (aalData?.currentLevel ?? null) as 'aal1' | 'aal2' | null,
      nextAAL: (aalData?.nextLevel ?? null) as 'aal1' | 'aal2' | null,
      hasMFA: !!factorsData?.totp?.some((f) => f.status === 'verified'),
    };
  },

  /**
   * @deprecated Prefira getProfileAndRoles() que usa 1 round-trip.
   * Mantido para callers legados fora do useProfileRoles.
   */
  async queryRoles(userId: string) {
    return supabase.from('user_roles').select('role').eq('user_id', userId);
  },

  /** RPC combinada: retorna profile + roles em um único round-trip. */
  async getProfileAndRoles(userId: string) {
    return supabase.rpc('get_profile_and_roles', { _user_id: userId });
  },

  async fetchProfile(userId: string) {
    return supabase.from('profiles').select('*').eq('user_id', userId).single();
  },

  async updateLastLogin(userId: string) {
    return supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', userId);
  },
};
