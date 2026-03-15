/**
 * useDiscoveredEvents — CRUD + search for discovered_events
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateConfidence } from '@/utils/eventConfidence';

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
  pais?: string;
  pais_neq?: string;
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
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('discovered_events')
        .select('*')
        .gte('data_evento', today)
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

      if (filters.pais) {
        query = query.eq('pais', filters.pais);
      }

      if (filters.pais_neq) {
        query = query.neq('pais', filters.pais_neq);
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
    // Manual registrations by athletes are always auto-validated (private to creator)
    const statusValidacao = 'VALIDADA';

    const eventId = crypto.randomUUID();

    const eventPayload = {
      id: eventId,
      nome: eventData.nome,
      tipo_evento: 'PARALELA',
      data_evento: eventData.data_evento || null,
      cidade: eventData.cidade || null,
      estado: eventData.estado || null,
      url_origem: eventData.url_origem || null,
      origem_principal: 'MANUAL',
      status_validacao: statusValidacao,
      grau_confianca: confidence.score,
      created_by: user.id,
    };

    const { error: eventError } = await supabase
      .from('discovered_events')
      .insert(eventPayload);

    if (eventError) return null;

    const eventResult: DiscoveredEvent = {
      id: eventId,
      nome: eventData.nome,
      slug: null,
      tipo_evento: 'OFICIAL',
      data_evento: eventData.data_evento || null,
      cidade: eventData.cidade || null,
      estado: eventData.estado || null,
      pais: 'BR',
      venue: null,
      organizador: null,
      origem_principal: 'MANUAL',
      url_origem: eventData.url_origem || null,
      url_inscricao: null,
      url_resultado: null,
      status_validacao: statusValidacao,
      grau_confianca: confidence.score,
      possivel_duplicata: false,
      categoria_hyrox: null,
      admin_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return eventResult;
  }, [user?.id]);

  return { events, loading, searchEvents, requestEventReview };
}
