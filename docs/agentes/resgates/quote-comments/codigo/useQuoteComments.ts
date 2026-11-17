import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { fetchAllPages } from '@/lib/db/fetch-all-pages';
import type { Tables } from '@/integrations/supabase/types';

export const QUOTE_COMMENT_MAX_LENGTH = 5000;
type QuoteCommentRow = Tables<'quote_comments'>;

export interface QuoteComment extends QuoteCommentRow {
  author_name: string | null;
  author_avatar: string | null;
  replies?: QuoteComment[];
}

function commentError(error: unknown, fallback: string, deleting = false): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  if (code === '23503') {
    return deleting
      ? 'Comentários com respostas não podem ser excluídos. Remova as respostas primeiro.'
      : 'O comentário ou orçamento não está mais disponível. Atualize a página e tente novamente.';
  }
  if (code === '42501') return 'Você não tem permissão para alterar este comentário.';
  return fallback;
}

export function useQuoteComments(quoteId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const contextKey = userId && quoteId ? `${userId}:${quoteId}` : null;
  const currentContext = useRef(contextKey);
  currentContext.current = contextKey;
  const requestId = useRef(0);
  const mounted = useRef(false);
  const [comments, setComments] = useState<QuoteComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!quoteId || !userId || !mounted.current) return;
    const context = `${userId}:${quoteId}`;
    const request = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchAllPages<QuoteCommentRow>((from, to) =>
        supabase
          .from('quote_comments')
          .select('*')
          .eq('quote_id', quoteId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      );

      const userIds = [...new Set(rows.map((row) => row.user_id))];
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);
        if (profileError) logger.warn('Could not load comment author profiles', profileError);
        for (const profile of profiles ?? []) {
          if (profile.user_id) profileMap.set(profile.user_id, profile);
        }
      }

      const enriched: QuoteComment[] = rows.map((row) => ({
        ...row,
        author_name: profileMap.get(row.user_id)?.full_name || 'Usuário',
        author_avatar: profileMap.get(row.user_id)?.avatar_url ?? null,
        replies: [],
      }));
      const byId = new Map(enriched.map((comment) => [comment.id, comment]));
      const roots: QuoteComment[] = [];
      for (const comment of enriched) {
        const parent = comment.parent_id ? byId.get(comment.parent_id) : undefined;
        if (parent) parent.replies?.push(comment);
        else roots.push(comment);
      }
      if (mounted.current && request === requestId.current && currentContext.current === context) {
        setComments(roots);
      }
    } catch (failure) {
      if (mounted.current && request === requestId.current && currentContext.current === context) {
        setError('Não foi possível carregar os comentários. Tente novamente.');
        logger.error('Error fetching quote comments', failure);
      }
    } finally {
      if (mounted.current && request === requestId.current && currentContext.current === context)
        setIsLoading(false);
    }
  }, [quoteId, userId]);

  useEffect(() => {
    mounted.current = true;
    setComments([]);
    setError(null);
    setIsLoading(false);
    void fetchComments();
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [fetchComments]);

  const reportFailure = useCallback((failure: unknown, message: string, deleting = false) => {
    const detail = commentError(failure, message, deleting);
    setError(detail);
    toast.error(detail);
    logger.error('Quote comment mutation failed', failure);
    return false;
  }, []);

  const addComment = useCallback(
    async (content: string, parentId?: string): Promise<boolean> => {
      if (!quoteId || !userId) return false;
      const normalized = content.trim();
      if (!normalized || normalized.length > QUOTE_COMMENT_MAX_LENGTH) {
        return reportFailure(
          null,
          `Escreva um comentário de até ${QUOTE_COMMENT_MAX_LENGTH} caracteres.`,
        );
      }
      const context = `${userId}:${quoteId}`;
      try {
        const { data, error: insertError } = await supabase
          .from('quote_comments')
          .insert({
            quote_id: quoteId,
            user_id: userId,
            parent_id: parentId ?? null,
            content: normalized,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;
        if (!data) throw new Error('Comment insert returned no row');
        if (!mounted.current || currentContext.current !== context) return true;
        await createCommentNotification(quoteId, data.id, userId, parentId);
      if (!mounted.current || currentContext.current !== context) return true;
        toast.success('Comentário adicionado');
        await fetchComments();
        return true;
      } catch (failure) {
        if (!mounted.current || currentContext.current !== context) return false;
        return reportFailure(
          failure,
          'Não foi possível adicionar o comentário. Seu texto foi mantido.',
        );
      }
    },
    [quoteId, userId, fetchComments, reportFailure],
  );

  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      if (!quoteId || !userId) return false;
      const normalized = content.trim();
      if (!normalized || normalized.length > QUOTE_COMMENT_MAX_LENGTH) {
        return reportFailure(
          null,
          `Escreva um comentário de até ${QUOTE_COMMENT_MAX_LENGTH} caracteres.`,
        );
      }
      const context = `${userId}:${quoteId}`;
      try {
        const { data, error: updateError } = await supabase
          .from('quote_comments')
          .update({ content: normalized })
          .eq('id', commentId)
          .eq('quote_id', quoteId)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle();
        if (updateError) throw updateError;
        if (!data) throw new Error('Comment not found or update not permitted');
        if (!mounted.current || currentContext.current !== context) return true;
        toast.success('Comentário atualizado');
        await fetchComments();
        return true;
      } catch (failure) {
        if (!mounted.current || currentContext.current !== context) return false;
        return reportFailure(
          failure,
          'Não foi possível atualizar o comentário. Seu texto foi mantido.',
        );
      }
    },
    [quoteId, userId, fetchComments, reportFailure],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!quoteId || !userId) return false;
      const context = `${userId}:${quoteId}`;
      try {
        const { data, error: deleteError } = await supabase
          .from('quote_comments')
          .delete()
          .eq('id', commentId)
          .eq('quote_id', quoteId)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle();
        if (deleteError) throw deleteError;
        if (!data) throw new Error('Comment not found or delete not permitted');
        if (!mounted.current || currentContext.current !== context) return true;
        toast.success('Comentário removido');
        await fetchComments();
        return true;
      } catch (failure) {
        if (!mounted.current || currentContext.current !== context) return false;
        return reportFailure(failure, 'Não foi possível remover o comentário.', true);
      }
    },
    [quoteId, userId, fetchComments, reportFailure],
  );

  return {
    comments: contextKey ? comments : [],
    isLoading,
    error,
    addComment,
    updateComment,
    deleteComment,
    refetch: fetchComments,
  };
}

async function createCommentNotification(
  quoteId: string,
  commentId: string,
  authorId: string,
  parentId?: string,
) {
  try {
    const { data: participants, error: participantError } = await supabase
      .from('quote_comments')
      .select('user_id')
      .eq('quote_id', quoteId);
    if (participantError) throw participantError;
    const recipients = [
      ...new Set((participants ?? []).map((participant) => participant.user_id)),
    ].filter((recipient) => recipient !== authorId);
    if (recipients.length === 0) return;
    const notifications = recipients.map((recipient) => ({
      user_id: recipient,
      title: parentId ? 'Nova resposta em orçamento' : 'Novo comentário em orçamento',
      message: 'Há um novo comentário em um orçamento em que você participou.',
      type: 'quote_comment',
      category: 'quotes',
      action_url: `/orcamentos/${quoteId}`,
      metadata: { quote_id: quoteId, comment_id: commentId },
      idempotency_key: `quote_comment:${commentId}:${recipient}`,
    }));
    const { error: notificationError } = await supabase
      .from('workspace_notifications')
      .insert(notifications);
    if (notificationError) throw notificationError;
  } catch (failure) {
    logger.warn('Comment saved, but participant notifications could not be sent', failure);
  }
}
