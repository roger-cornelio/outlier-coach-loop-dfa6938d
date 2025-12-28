/**
 * StructuredEditorDebugBar - Barra de debug TEMPORÁRIA (MVP0)
 * 
 * OBJETIVO:
 * Exibir estado do editor estruturado para diagnóstico de bugs.
 * 
 * ⚠️  NÃO É FEATURE - remover após validação do fluxo.
 */

import { useLocation } from 'react-router-dom';

interface DebugBarProps {
  mode: 'edit' | 'preview';
  isStructured: boolean;
  daysCount: number;
  selectedDayId: string | null;
  editorRendered: boolean;
  blocksCount?: number;
}

// Flag para habilitar/desabilitar debug globalmente
const DEBUG_ENABLED = true;

export function StructuredEditorDebugBar({
  mode,
  isStructured,
  daysCount,
  selectedDayId,
  editorRendered,
  blocksCount = 0,
}: DebugBarProps) {
  const location = useLocation();
  
  // Só exibir em /coach/dashboard e se DEBUG ativo
  if (!DEBUG_ENABLED) return null;
  if (!location.pathname.includes('/coach/dashboard')) return null;
  if (!isStructured) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-background/95 backdrop-blur border-t border-amber-500/30 px-4 py-2 text-xs font-mono text-amber-500/80">
      <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
        <span className="font-semibold text-amber-500">DEBUG:</span>
        <span>mode=<strong>{mode}</strong></span>
        <span>structured=<strong>{String(isStructured)}</strong></span>
        <span>days=<strong>{daysCount}</strong></span>
        <span>selectedDay=<strong>{selectedDayId ?? 'null'}</strong></span>
        <span>blocks=<strong>{blocksCount}</strong></span>
        <span>editor=<strong>{String(editorRendered)}</strong></span>
        <span className="ml-auto text-amber-500/50">⚠️ Debug bar temporária</span>
      </div>
    </div>
  );
}
