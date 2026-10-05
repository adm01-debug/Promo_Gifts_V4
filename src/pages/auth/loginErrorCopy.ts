/** Copy pt-BR dos erros de login (extraída de Auth.tsx — ratchet de tamanho). */

export interface LoginErrorCopy {
  title: string;
  description: string;
  hint: string;
  /** Segundos p/ o countdown visual de rate-limit; ausente fora do 429. */
  waitSeconds?: number;
}

export function loginErrorCopy(error: { message: string; status?: number }): LoginErrorCopy {
  const copy: LoginErrorCopy = {
    title: 'Não foi possível entrar',
    description: 'Ocorreu um erro ao validar seu acesso. Por favor, tente novamente.',
    hint: 'Se o erro persistir, tente redefinir sua senha ou use o login social.',
  };

  if (error.message.includes('Invalid login credentials') || error.status === 400) {
    copy.title = 'E-mail ou Senha Incorretos';
    copy.description =
      'Não encontramos uma conta com esses dados. Verifique se digitou corretamente ou use "Esqueci minha senha".';
    copy.hint = 'Dica: Verifique se o Caps Lock está ativado.';
  } else if (error.message.includes('Email not confirmed')) {
    copy.title = 'E-mail não confirmado';
    copy.description =
      'Sua conta ainda não foi ativada. Verifique sua caixa de entrada e spam pelo e-mail de confirmação.';
    copy.hint = 'Ainda não recebeu? Aguarde alguns minutos antes de solicitar um novo envio.';
  } else if (error.status === 403) {
    // Bloqueio do gate server-side (check-login) — error.message já é o
    // texto pt-BR com blocked_until montado em AuthContext.signIn.
    copy.title = 'Acesso Bloqueado';
    copy.description = error.message;
    copy.hint = 'Se você acredita que isto é um engano, contate o administrador.';
  } else if (error.message.includes('rate limit') || error.status === 429) {
    copy.title = 'Acesso Temporariamente Suspenso';
    copy.description =
      'Detectamos muitas tentativas seguidas. Por segurança, sua conta foi bloqueada por alguns minutos.';
    // Extrai o tempo de espera da mensagem do Supabase (ex: "after 47 seconds")
    const secondsMatch = /after (\d+) seconds?/i.exec(error.message);
    copy.waitSeconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 60;
    copy.hint = `Aguarde ${copy.waitSeconds} segundos antes de tentar novamente.`;
  } else if (
    error.status === 0 ||
    error.message.includes('network') ||
    error.message.includes('Fetch')
  ) {
    copy.title = 'Erro de Conexão';
    copy.description =
      'Parece que você está sem internet ou nosso servidor está temporariamente inacessível.';
    copy.hint = 'Verifique sua conexão Wi-Fi ou dados móveis.';
  } else if (error.status === 503) {
    // Turnstile/gate indisponível — error.message já vem pt-BR do gate.
    copy.title = 'Verificação de segurança';
    copy.description = error.message;
    copy.hint = 'Tente novamente em instantes.';
  } else if (
    error.message.includes('Database error') ||
    (error.status !== undefined && error.status >= 500)
  ) {
    copy.title = 'Sistema em Manutenção';
    copy.description =
      'Estamos ajustando os motores das nossas galáxias. O serviço deve voltar ao normal em breve.';
    copy.hint = 'Nossa equipe técnica já foi notificada.';
  }

  return copy;
}
