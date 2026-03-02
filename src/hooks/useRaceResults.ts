import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface RaceResult {
  id: string;
  athlete_id: string;
  hyrox_idp: string;
  hyrox_event: string | null;
  source_url: string;
  verified: boolean;
  created_at: string;
}

export function useRaceResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    if (!user?.id) {
      setResults([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('race_results')
      .select('*')
      .eq('athlete_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setResults(data as unknown as RaceResult[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const addResult = useCallback(async (params: {
    hyrox_idp: string;
    hyrox_event: string | null;
    source_url: string;
  }) => {
    if (!user?.id) return { success: false, error: 'Não autenticado' };

    const { data, error } = await supabase
      .from('race_results')
      .insert({
        athlete_id: user.id,
        hyrox_idp: params.hyrox_idp,
        hyrox_event: params.hyrox_event,
        source_url: params.source_url,
      } as any)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Este resultado já foi importado.' };
      }
      return { success: false, error: error.message };
    }

    await fetchResults();
    return { success: true, data };
  }, [user?.id, fetchResults]);

  const deleteResult = useCallback(async (id: string) => {
    await supabase.from('race_results').delete().eq('id', id);
    await fetchResults();
  }, [fetchResults]);

  const latestResult = results.length > 0 ? results[0] : null;

  return { results, latestResult, loading, addResult, deleteResult, refetch: fetchResults };
}
