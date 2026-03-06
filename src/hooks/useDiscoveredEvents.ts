/**
 * useDiscoveredEvents — CRUD + search for discovered_events
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateConfidence, generateSearchSuggestions } from '@/utils/eventConfidence';

export interface DiscoveredEvent {
  id: string;
  nome: string;
  slug: string | null;
  tipo_evento: string;
  data_evento: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  venue: string | null;
  organizador: string | null;
  origem_principal: string | null;
  url_origem: string | null;
  url_inscricao: string | null;
  url_resultado: string | null;
  status_validacao: string;
  grau_confianca: number;
  possivel_duplicata: boolean;
  categoria_hyrox: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface SearchFilters {
  query?: string;
  tipo_evento?: string;
  cidade?: string;
  estado?: string;
  status_validacao?: string;
  origem_principal?: string;
}

export function useDiscoveredEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<DiscoveredEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const searchEvents = useCallback(async (filters: SearchFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('discovered_events')
        .select('*')
        .order('data_evento', { ascending: true });

      // For non-admin, only show validated events by default
      if (filters.status_validacao) {
        query = query.eq('status_validacao', filters.status_validacao);
      }

      if (filters.tipo_evento && filters.tipo_evento !== 'TODAS') {
        query = query.eq('tipo_evento', filters.tipo_evento);
      }

      if (filters.cidade) {
        query = query.ilike('cidade', `%${filters.cidade}%`);
      }

      if (filters.estado) {
        query = query.eq('estado', filters.estado);
      }

      if (filters.origem_principal) {
        query = query.eq('origem_principal', filters.origem_principal);
      }

      if (filters.query) {
        query = query.or(`nome.ilike.%${filters.query}%,cidade.ilike.%${filters.query}%,organizador.ilike.%${filters.query}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setEvents(data as unknown as DiscoveredEvent[]);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestEventReview = useCallback(async (eventData: {
    nome: string;
    data_evento?: string;
    cidade?: string;
    estado?: string;
    url_origem?: string;
    observacao?: string;
    termo_busca?: string;
  }) => {
    if (!user?.id) return null;

    const confidence = calculateConfidence(eventData);

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from('discovered_events')
      .insert({
        nome: eventData.nome,
        data_evento: eventData.data_evento || null,
        cidade: eventData.cidade || null,
        estado: eventData.estado || null,
        url_origem: eventData.url_origem || null,
        origem_principal: 'MANUAL',
        status_validacao: confidence.meetsMinimum && confidence.score >= 70
          ? 'VALIDADA' : 'AGUARDANDO_AUTORIZACAO_ADMIN',
        grau_confianca: confidence.score,
        created_by: user.id,
      })
      .select()
      .single();

    if (eventError || !event) return null;

    // Create discovery log
    const { data: log } = await supabase
      .from('event_discovery_logs')
      .insert({
        event_id: (event as any).id,
        termo_busca: eventData.termo_busca || eventData.nome,
        origem: 'MANUAL',
        raw_title: eventData.nome,
        raw_text: eventData.observacao || null,
        raw_url: eventData.url_origem || null,
        cidade_detectada: eventData.cidade || null,
        estado_detectado: eventData.estado || null,
        data_detectada: eventData.data_evento || null,
        score: confidence.score,
        motivo_pendencia: confidence.pendencias,
        requested_by: user.id,
      })
      .select()
      .single();

    // If needs admin review, create queue entry
    if ((event as any).status_validacao === 'AGUARDANDO_AUTORIZACAO_ADMIN') {
      const suggestions = generateSearchSuggestions(eventData.nome, eventData.cidade);

      await supabase
        .from('event_review_queue')
        .insert({
          event_id: (event as any).id,
          discovery_log_id: log ? (log as any).id : null,
          status_fila: 'PENDENTE',
          motivo: confidence.pendencias.join(', '),
          sugestoes_busca_json: suggestions,
        });
    }

    return event as unknown as DiscoveredEvent;
  }, [user?.id]);

  return { events, loading, searchEvents, requestEventReview };
}
