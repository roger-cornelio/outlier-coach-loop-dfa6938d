/**
 * useCoachDraft - Hook para gerenciar draft único de programação semanal
 * 
 * REGRAS MVP0 - FLUXO DE 2 TELAS (EDIÇÃO → PREVIEW → PROGRAMAÇÕES):
 * 1. Fonte única de verdade: draftProgram
 * 2. Persiste em localStorage para sobreviver a F5/voltar
 * 3. Semana OBRIGATÓRIA antes de ir para preview
 * 4. Preview é 100% read-only
 * 5. "Salvar e ir para Programações" salva como rascunho no banco e navega para aba Programações
 * 6. Publicação acontece SOMENTE na aba Programações (CoachProgramsTab)
 * 7. Draft é limpo após salvar com sucesso
 * 
 * FLUXO:
 * - Tela 1 (EDIÇÃO): mode='edit' → edita tudo, semana obrigatória
 * - Tela 2 (PREVIEW): mode='preview' → 100% read-only, "Voltar" ou "Salvar e ir para Programações"
 * - Tela 3 (PROGRAMAÇÕES): aba separada que gerencia workouts salvos (publicar/excluir)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import type { DayWorkout } from '@/types/outlier';
import type { ParseResult } from '@/utils/structuredTextParser';
import type { WeekPeriod } from '@/components/WeekPeriodSelector';

/**
 * mode: Flag explícito que governa TODA a renderização
 * - 'import': Tela inicial - colar texto bruto (sem parse ainda)
 * - 'edit': Tela de edição - blocos parseados, controles habilitados
 * - 'preview': Tela final - 100% read-only, apenas visualização + salvar
 * 
 * NUNCA INFERIR mode a partir de validação, parsing ou sucesso
 */
export type DraftMode = 'import' | 'edit' | 'preview';

export interface CoachDraft {
  rawText: string;
  weekId: WeekPeriod | null;
  parsedDays: DayWorkout[] | null;
  /** Versão editada manualmente no modo edição (SE existir) */
  editedDays: DayWorkout[] | null;
  parseResult: ParseResult | null;
  restDays: Record<number, boolean>;
  /** Mode explícito: 'edit' ou 'preview' */
  mode: DraftMode;
  updatedAt: string;
  /** Flag que indica se houve edição manual */
  isDirty: boolean;
  /** Nome da programação */
  programName: string;
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
    mode: 'import', // Começa no modo de colagem
    updatedAt: new Date().toISOString(),
    isDirty: false,
    programName: '',
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
        if (parsed && typeof parsed.rawText === 'string') {
          // Garantir que mode antigo 'edit' sem parseResult vá para 'import'
          if (parsed.mode === 'edit' && !parsed.parseResult) {
            parsed.mode = 'import';
          }
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
      // NÃO mudar mode aqui - modo é explícito
      isDirty: true,
    });
  }, [draft, saveDraft]);

  // Atualizar semana selecionada
  const setWeekId = useCallback((week: WeekPeriod | null) => {
    saveDraft({
      ...draft,
      weekId: week,
    });
  }, [draft, saveDraft]);

  // Atualizar resultado do parse (NÃO muda mode automaticamente)
  const setParsedResult = useCallback((result: ParseResult, workouts: DayWorkout[]) => {
    saveDraft({
      ...draft,
      parseResult: result,
      parsedDays: workouts,
      editedDays: null, // Reset edições ao reparsear
      restDays: {},
      // NÃO muda mode aqui - mode é controlado explicitamente
    });
  }, [draft, saveDraft]);

  // Atualizar dias editados (edições manuais - SEMPRE marca isDirty)
  const setEditedDays = useCallback((workouts: DayWorkout[]) => {
    console.debug('[useCoachDraft] setEditedDays → isDirty=true', { count: workouts.length });
    saveDraft({
      ...draft,
      editedDays: workouts,
      isDirty: true,
    });
  }, [draft, saveDraft]);

  // Atualizar parseResult (para toggles de isMainWod, etc)
  // IMPORTANTE: NÃO reconverter para DayWorkout[] aqui.
  // Pós-edição, a fonte para preview/salvar deve ser editedDays (quando existir).
  const updateParseResult = useCallback((result: ParseResult) => {
    console.debug('[useCoachDraft] updateParseResult → isDirty=true');
    saveDraft({
      ...draft,
      parseResult: result,
      isDirty: true,
    });
  }, [draft, saveDraft]);

  // Atualizar restDays
  const setRestDays = useCallback((restDays: Record<number, boolean>) => {
    saveDraft({
      ...draft,
      restDays,
    });
  }, [draft, saveDraft]);

  // Atualizar nome da programação
  const setProgramName = useCallback((name: string) => {
    saveDraft({
      ...draft,
      programName: name,
    });
  }, [draft, saveDraft]);

  // Alternar mode (edit <-> preview)
  const setMode = useCallback((mode: DraftMode) => {
    console.debug('[useCoachDraft] setMode →', mode);
    saveDraft({
      ...draft,
      mode,
    });
  }, [draft, saveDraft]);

  // Ir para edição (Tela 2 - após parse bem sucedido)
  const goToEdit = useCallback(() => {
    console.debug('[useCoachDraft] goToEdit');
    saveDraft({
      ...draft,
      mode: 'edit',
    });
  }, [draft, saveDraft]);

  // Ir para preview (Tela 3)
  const goToPreview = useCallback(() => {
    console.debug('[useCoachDraft] goToPreview');
    saveDraft({
      ...draft,
      mode: 'preview',
    });
  }, [draft, saveDraft]);

  // Voltar para import (limpa parse, volta ao início)
  const goBackToImport = useCallback(() => {
    console.debug('[useCoachDraft] goBackToImport');
    saveDraft({
      ...draft,
      mode: 'import',
      // NÃO limpa rawText para preservar o texto digitado
    });
  }, [draft, saveDraft]);

  // Voltar para edição (NÃO limpa nada)
  const goBackToEditing = useCallback(() => {
    console.debug('[useCoachDraft] goBackToEditing');
    saveDraft({
      ...draft,
      mode: 'edit',
    });
  }, [draft, saveDraft]);

  // Limpar draft completamente (após salvar com sucesso)
  const clearDraft = useCallback(() => {
    if (!coachId) return;
    
    console.debug('[useCoachDraft] clearDraft → resetting to empty state');
    
    try {
      localStorage.removeItem(getStorageKey(coachId));
    } catch (err) {
      console.error('[useCoachDraft] Error clearing draft:', err);
    }
    
    setDraft(getEmptyDraft());
  }, [coachId]);

  // effectiveDays = fonte única para preview/salvar após edição:
  // - Se coach editou: editedDays
  // - Caso contrário: parsedDays (resultado do parse inicial)
  const effectiveDays = useMemo(() => {
    return draft.editedDays || draft.parsedDays;
  }, [draft.editedDays, draft.parsedDays]);

  // Mantém alias para compatibilidade (uso legado no componente)
  const workoutsToSave = effectiveDays;

  // Validação: pode ir para preview? (semana obrigatória + parseResult válido)
  const canGoToPreview = useMemo(() => {
    return draft.weekId !== null && 
           draft.parseResult !== null && 
           draft.parseResult.success === true &&
           draft.parseResult.days.length > 0;
  }, [draft.weekId, draft.parseResult]);

  // ════════════════════════════════════════════════════════════════════════════
  // REGRA DE PUBLICAÇÃO SEMANAL (V2):
  // - Permite 0-7 dias com conteúdo (não exige semana completa)
  // - Dias vazios NÃO bloqueiam publicação
  // - Bloqueia APENAS se:
  //   (A) Semana vazia (0 dias com conteúdo) → anti-acidente
  //   (B) Qualquer dia com conteúdo tem erro real de validação (severity === 'ERROR')
  // ════════════════════════════════════════════════════════════════════════════
  const canSave = useMemo(() => {
    // Verificar se há erros de estrutura bloqueantes
    const structureErrors = draft.parseResult?.structureIssues?.filter(
      issue => issue.severity === 'ERROR'
    ) ?? [];
    const hasBlockingErrors = structureErrors.length > 0;
    
    // Contar dias com conteúdo (pelo menos 1 bloco)
    const daysWithContent = effectiveDays?.filter(d => d.blocks && d.blocks.length > 0) ?? [];
    const daysEmpty = effectiveDays?.filter(d => !d.blocks || d.blocks.length === 0) ?? [];
    
    // Semana precisa ter pelo menos 1 dia com conteúdo
    const hasContentDays = daysWithContent.length >= 1;
    
    // Pode salvar se: semana selecionada + tem conteúdo + sem erros
    const result = draft.weekId !== null && hasContentDays && !hasBlockingErrors;
    
    // Log de diagnóstico
    console.log('[PUBLISH_GUARD] useCoachDraft', {
      daysWithContent: daysWithContent.length,
      daysEmpty: daysEmpty.length,
      hasBlockingErrors,
      canSave: result,
    });
    
    return result;
  }, [draft.weekId, effectiveDays, draft.parseResult?.structureIssues]);

  return {
    // Estado
    draft,
    isHydrated,

    // Dados derivados
    effectiveDays,
    workoutsToSave, // alias
    canGoToPreview,
    canSave,

    // Setters
    setRawText,
    setWeekId,
    setParsedResult,
    setEditedDays,
    updateParseResult,
    setRestDays,
    setProgramName,
    setMode,

    // Navegação entre telas
    goToEdit,
    goToPreview,
    goBackToImport,
    goBackToEditing,
    clearDraft,

    // Acesso direto aos campos
    rawText: draft.rawText,
    weekId: draft.weekId,
    parsedDays: draft.parsedDays,
    editedDays: draft.editedDays,
    parseResult: draft.parseResult,
    restDays: draft.restDays,
    mode: draft.mode,
    isDirty: draft.isDirty,
    programName: draft.programName,
  };
}
