import { useState, useEffect, useCallback } from 'react';
import type { AthleteStatus } from '@/types/outlier';

/**
 * useLevelUpDetection - Detecta quando atleta sobe de nível
 * 
 * REGRAS:
 * - O modal dispara apenas UMA VEZ por nível
 * - Status não regride (identidade não muda)
 * - Armazenado em localStorage para persistência
 */

const STORAGE_KEY = 'outlier_level_up_history';

interface LevelUpHistory {
  lastAcknowledgedLevel: AthleteStatus | null;
  acknowledgedLevels: AthleteStatus[];
}

// Ordem hierárquica dos níveis
const STATUS_ORDER: AthleteStatus[] = [
  'iniciante',
  'intermediario',
  'avancado',
  'hyrox_open',
  'hyrox_pro',
];

function loadHistory(): LevelUpHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[useLevelUpDetection] Failed to load history:', e);
  }
  return { lastAcknowledgedLevel: null, acknowledgedLevels: [] };
}

function saveHistory(history: LevelUpHistory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('[useLevelUpDetection] Failed to save history:', e);
  }
}

export function useLevelUpDetection(currentStatus: AthleteStatus | null) {
  const [showModal, setShowModal] = useState(false);
  const [newLevel, setNewLevel] = useState<AthleteStatus | null>(null);

  // Detectar subida de nível
  useEffect(() => {
    if (!currentStatus) return;

    const history = loadHistory();
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    const lastIndex = history.lastAcknowledgedLevel 
      ? STATUS_ORDER.indexOf(history.lastAcknowledgedLevel) 
      : -1;

    // Se o nível atual é maior que o último reconhecido E não foi reconhecido ainda
    const isNewLevel = currentIndex > lastIndex && !history.acknowledgedLevels.includes(currentStatus);

    if (isNewLevel) {
      console.log(`[LevelUp] Detected new level: ${currentStatus} (previous: ${history.lastAcknowledgedLevel})`);
      setNewLevel(currentStatus);
      setShowModal(true);
    }
  }, [currentStatus]);

  // Confirmar que o usuário viu o modal
  const acknowledgeLevel = useCallback(() => {
    if (!newLevel) return;

    const history = loadHistory();
    history.lastAcknowledgedLevel = newLevel;
    if (!history.acknowledgedLevels.includes(newLevel)) {
      history.acknowledgedLevels.push(newLevel);
    }
    saveHistory(history);

    console.log(`[LevelUp] Acknowledged level: ${newLevel}`);
    setShowModal(false);
    setNewLevel(null);
  }, [newLevel]);

  // Reset para debug/testing
  const resetHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[LevelUp] History reset');
  }, []);

  return {
    showModal,
    newLevel,
    acknowledgeLevel,
    resetHistory,
  };
}
