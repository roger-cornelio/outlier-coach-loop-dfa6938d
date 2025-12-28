/**
 * useCoachDraft - Hook para gerenciar draft único de programação semanal
 * 
 * REGRAS MVP0:
 * 1. Fonte única de verdade: draftProgram
 * 2. Persiste em localStorage para sobreviver a F5/voltar
 * 3. Semana OBRIGATÓRIA antes do preview
 * 4. Publish usa editedDays se existir, senão parsedDays
 * 5. Draft só é limpo após publish com sucesso
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import type { DayWorkout } from '@/types/outlier';
import type { ParseResult } from '@/utils/structuredTextParser';
import type { WeekPeriod } from '@/components/WeekPeriodSelector';

export type DraftView = 'editing' | 'preview';

export interface CoachDraft {
  rawText: string;
  weekId: WeekPeriod | null;
  parsedDays: DayWorkout[] | null;
  editedDays: DayWorkout[] | null;
  parseResult: ParseResult | null;
  restDays: Record<number, boolean>;
  view: DraftView;
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'outlier:coachDraft:';

function getStorageKey(coachId: string): string {
  return `${STORAGE_KEY_PREFIX}${coachId}`;
}

function getEmptyDraft(): CoachDraft {
  return {
    rawText: '',
    weekId: null,
    parsedDays: null,
    editedDays: null,
    parseResult: null,
    restDays: {},
    view: 'editing',
    updatedAt: new Date().toISOString(),
  };
}

export function useCoachDraft() {
  const { profile } = useAuth();
  const coachId = profile?.id || '';
  
  const [draft, setDraft] = useState<CoachDraft>(() => getEmptyDraft());
  const [isHydrated, setIsHydrated] = useState(false);

  // Carregar draft do localStorage na inicialização
  useEffect(() => {
    if (!coachId) {
      setIsHydrated(true);
      return;
    }

    try {
      const stored = localStorage.getItem(getStorageKey(coachId));
      if (stored) {
        const parsed = JSON.parse(stored) as CoachDraft;
        // Validar estrutura básica
        if (parsed && typeof parsed.rawText === 'string') {
          console.log('[useCoachDraft] Rehydrated draft from localStorage');
          setDraft(parsed);
        }
      }
    } catch (err) {
      console.error('[useCoachDraft] Error loading draft:', err);
    }
    
    setIsHydrated(true);
  }, [coachId]);

  // Persistir draft no localStorage sempre que mudar
  const saveDraft = useCallback((newDraft: CoachDraft) => {
    if (!coachId) return;
    
    const toSave = {
      ...newDraft,
      updatedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(getStorageKey(coachId), JSON.stringify(toSave));
      setDraft(toSave);
    } catch (err) {
      console.error('[useCoachDraft] Error saving draft:', err);
      setDraft(toSave);
    }
  }, [coachId]);

  // Atualizar texto bruto
  const setRawText = useCallback((text: string) => {
    saveDraft({
      ...draft,
      rawText: text,
      // NÃO limpar parseResult ao editar texto - preservar draft
      view: 'editing',
    });
  }, [draft, saveDraft]);

  // Atualizar semana selecionada
  const setWeekId = useCallback((week: WeekPeriod | null) => {
    saveDraft({
      ...draft,
      weekId: week,
    });
  }, [draft, saveDraft]);

  // Atualizar resultado do parse e ir para preview
  const setParsedResult = useCallback((result: ParseResult, workouts: DayWorkout[]) => {
    saveDraft({
      ...draft,
      parseResult: result,
      parsedDays: workouts,
      editedDays: null, // Reset edições ao reparsear
      restDays: {},
      view: 'preview',
    });
  }, [draft, saveDraft]);

  // Atualizar dias editados (edições manuais no preview)
  const setEditedDays = useCallback((workouts: DayWorkout[]) => {
    saveDraft({
      ...draft,
      editedDays: workouts,
    });
  }, [draft, saveDraft]);

  // Atualizar parseResult (para toggles de isMainWod, etc)
  const updateParseResult = useCallback((result: ParseResult) => {
    saveDraft({
      ...draft,
      parseResult: result,
    });
  }, [draft, saveDraft]);

  // Atualizar restDays
  const setRestDays = useCallback((restDays: Record<number, boolean>) => {
    saveDraft({
      ...draft,
      restDays,
    });
  }, [draft, saveDraft]);

  // Alternar view (editing <-> preview)
  const setView = useCallback((view: DraftView) => {
    saveDraft({
      ...draft,
      view,
    });
  }, [draft, saveDraft]);

  // Voltar para edição (NÃO limpa nada)
  const goBackToEditing = useCallback(() => {
    saveDraft({
      ...draft,
      view: 'editing',
    });
  }, [draft, saveDraft]);

  // Limpar draft completamente (após publish com sucesso)
  const clearDraft = useCallback(() => {
    if (!coachId) return;
    
    try {
      localStorage.removeItem(getStorageKey(coachId));
    } catch (err) {
      console.error('[useCoachDraft] Error clearing draft:', err);
    }
    
    setDraft(getEmptyDraft());
  }, [coachId]);

  // Dados finais para publicar: editedDays se existir, senão parsedDays
  const workoutsToPublish = useMemo(() => {
    return draft.editedDays || draft.parsedDays;
  }, [draft.editedDays, draft.parsedDays]);

  // Validação: pode ir para preview? (semana obrigatória + texto)
  const canGoToPreview = useMemo(() => {
    return draft.weekId !== null && draft.rawText.trim().length > 0;
  }, [draft.weekId, draft.rawText]);

  // Validação: pode publicar?
  const canPublish = useMemo(() => {
    return draft.weekId !== null && workoutsToPublish !== null && workoutsToPublish.length > 0;
  }, [draft.weekId, workoutsToPublish]);

  return {
    // Estado
    draft,
    isHydrated,
    
    // Dados derivados
    workoutsToPublish,
    canGoToPreview,
    canPublish,
    
    // Setters
    setRawText,
    setWeekId,
    setParsedResult,
    setEditedDays,
    updateParseResult,
    setRestDays,
    setView,
    goBackToEditing,
    clearDraft,
    
    // Acesso direto aos campos
    rawText: draft.rawText,
    weekId: draft.weekId,
    parsedDays: draft.parsedDays,
    editedDays: draft.editedDays,
    parseResult: draft.parseResult,
    restDays: draft.restDays,
    view: draft.view,
  };
}
