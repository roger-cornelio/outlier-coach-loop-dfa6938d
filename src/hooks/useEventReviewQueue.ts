/**
 * useEventReviewQueue — Admin hook for managing event review queue
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ReviewQueueItem {
  id: string;
  event_id: string | null;
  discovery_log_id: string | null;
  status_fila: string;
  motivo: string | null;
  sugestoes_busca_json: string[];
  admin_notes: string | null;
  created_at: string;
  // Joined event data
  event?: {
    id: string;
    nome: string;
    tipo_evento: string;
    data_evento: string | null;
    cidade: string | null;
    estado: string | null;
    organizador: string | null;
    origem_principal: string | null;
    url_origem: string | null;
    url_inscricao: string | null;
    grau_confianca: number;
    possivel_duplicata: boolean;
    status_validacao: string;
    admin_notes: string | null;
  } | null;
  // Joined discovery log data
  log?: {
    id: string;
    termo_busca: string | null;
    origem: string | null;
    raw_title: string | null;
    raw_text: string | null;
    raw_url: string | null;
    cidade_detectada: string | null;
    estado_detectado: string | null;
    data_detectada: string | null;
    score: number;
    motivo_pendencia: string[] | null;
  } | null;
}

export function useEventReviewQueue() {
  const { user } = useAuth();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQueue = useCallback(async (statusFilter?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('event_review_queue')
        .select(`
          *,
          discovered_events!event_id (*),
          event_discovery_logs!discovery_log_id (*)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'TODOS') {
        query = query.eq('status_fila', statusFilter);
      }

      const { data, error } = await query;

      if (!error && data) {
        const mapped = (data as any[]).map(item => ({
          ...item,
          sugestoes_busca_json: item.sugestoes_busca_json || [],
          event: item.discovered_events || null,
          log: item.event_discovery_logs || null,
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const approveEvent = useCallback(async (
    queueItemId: string,
    eventId: string,
    updates?: {
      nome?: string;
      data_evento?: string;
      cidade?: string;
      estado?: string;
      tipo_evento?: string;
      url_origem?: string;
      url_inscricao?: string;
      organizador?: string;
      admin_notes?: string;
    }
  ) => {
    if (!user?.id) return false;

    // Update event status and any provided fields
    const { error: eventError } = await supabase
      .from('discovered_events')
      .update({
        status_validacao: 'VALIDADA',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        ...(updates || {}),
      })
      .eq('id', eventId);

    if (eventError) return false;

    // Resolve queue item
    const { error: queueError } = await supabase
      .from('event_review_queue')
      .update({
        status_fila: 'RESOLVIDO',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        admin_notes: updates?.admin_notes || null,
      })
      .eq('id', queueItemId);

    return !queueError;
  }, [user?.id]);

  const rejectEvent = useCallback(async (queueItemId: string, eventId: string, reason?: string) => {
    if (!user?.id) return false;

    const { error: eventError } = await supabase
      .from('discovered_events')
      .update({
        status_validacao: 'REJEITADA',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: reason || null,
      })
      .eq('id', eventId);

    if (eventError) return false;

    const { error: queueError } = await supabase
      .from('event_review_queue')
      .update({
        status_fila: 'RESOLVIDO',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        admin_notes: reason || null,
      })
      .eq('id', queueItemId);

    return !queueError;
  }, [user?.id]);

  const markDuplicate = useCallback(async (queueItemId: string, eventId: string) => {
    if (!user?.id) return false;

    const { error: eventError } = await supabase
      .from('discovered_events')
      .update({
        status_validacao: 'DUPLICADA',
        possivel_duplicata: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (eventError) return false;

    await supabase
      .from('event_review_queue')
      .update({
        status_fila: 'RESOLVIDO',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', queueItemId);

    return true;
  }, [user?.id]);

  const updateEventType = useCallback(async (eventId: string, tipo_evento: string) => {
    const { error } = await supabase
      .from('discovered_events')
      .update({ tipo_evento })
      .eq('id', eventId);
    return !error;
  }, []);

  const updateEvent = useCallback(async (eventId: string, updates: {
    nome?: string;
    data_evento?: string;
    cidade?: string;
    estado?: string;
    organizador?: string;
    tipo_evento?: string;
    url_origem?: string;
    url_inscricao?: string;
    admin_notes?: string;
  }) => {
    const { error } = await supabase
      .from('discovered_events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', eventId);
    return !error;
  }, []);

  const deleteEvent = useCallback(async (queueItemId: string, eventId: string) => {
    // Delete queue item first, then the event
    await supabase.from('event_review_queue').delete().eq('id', queueItemId);
    const { error } = await supabase.from('discovered_events').delete().eq('id', eventId);
    return !error;
  }, []);

  return { items, loading, fetchQueue, approveEvent, rejectEvent, markDuplicate, updateEventType, updateEvent, deleteEvent };
}
