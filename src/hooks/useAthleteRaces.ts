/**
 * useAthleteRaces — CRUD for athlete_races table
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AthleteRace {
  id: string;
  user_id: string;
  race_type: 'ALVO' | 'SATELITE';
  nome: string;
  categoria: string;
  race_date: string;
  participation_type: 'INDIVIDUAL' | 'DUPLA';
  partner_name: string | null;
  created_at: string;
}

export function useAthleteRaces() {
  const { user } = useAuth();
  const [races, setRaces] = useState<AthleteRace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRaces = useCallback(async () => {
    if (!user?.id) {
      setRaces([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('athlete_races')
      .select('*')
      .eq('user_id', user.id)
      .order('race_date', { ascending: true });

    if (!error && data) {
      setRaces(data as unknown as AthleteRace[]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchRaces();
  }, [fetchRaces]);

  const addRace = useCallback(async (race: {
    race_type: 'ALVO' | 'SATELITE';
    nome: string;
    categoria: string;
    race_date: string;
    participation_type: 'INDIVIDUAL' | 'DUPLA';
    partner_name?: string;
    partner_phone?: string;
    partner_instagram?: string;
  }) => {
    if (!user?.id) return null;

    // If adding ALVO, remove existing ALVO first
    if (race.race_type === 'ALVO') {
      await supabase
        .from('athlete_races')
        .delete()
        .eq('user_id', user.id)
        .eq('race_type', 'ALVO');
    }

    const { data, error } = await supabase
      .from('athlete_races')
      .insert({
        user_id: user.id,
        ...race,
      })
      .select()
      .single();

    if (!error) {
      await fetchRaces();
      return data;
    }
    return null;
  }, [user?.id, fetchRaces]);

  const deleteRace = useCallback(async (raceId: string) => {
    await supabase
      .from('athlete_races')
      .delete()
      .eq('id', raceId);
    await fetchRaces();
  }, [fetchRaces]);

  const provaAlvo = races.find(r => r.race_type === 'ALVO') || null;
  const provasSatelite = races.filter(r => r.race_type === 'SATELITE');

  return { races, provaAlvo, provasSatelite, loading, addRace, deleteRace, refetch: fetchRaces };
}
