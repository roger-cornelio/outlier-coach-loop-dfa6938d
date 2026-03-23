/**
 * WorkoutParseValidationModal - Modal Gatekeeper
 * 
 * Exibido quando blocos de treino não são reconhecidos pela IA.
 * - Modal LARANJA: Texto não reconhecido (culpa do coach)
 * - Modal VERMELHO: Erro de infraestrutura (timeout/API)
 */

import { AlertTriangle, ServerCrash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type GatekeeperErrorType = 'parse_failure' | 'infra_failure';

export interface FailedBlock {
  blockId: string;
  blockTitle: string;
  blockType: string;
  reason: string;
}

interface WorkoutParseValidationModalProps {
  open: boolean;
  errorType: GatekeeperErrorType;
  failedBlocks: FailedBlock[];
  onClose: () => void; // "Corrigir texto" - fecha e volta ao editor
  onForceBypass: () => void; // "Forçar salvamento sem cálculos"
}

export function WorkoutParseValidationModal({
  open,
  errorType,
  failedBlocks,
  onClose,
  onForceBypass,
}: WorkoutParseValidationModalProps) {
  if (!open) return null;

  const isInfraError = errorType === 'infra_failure';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`
        relative w-full max-w-lg mx-4 rounded-xl border-2 p-6 shadow-2xl
        ${isInfraError 
          ? 'bg-background border-destructive/50' 
          : 'bg-background border-orange-500/50'
        }
      `}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`
            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
            ${isInfraError ? 'bg-destructive/10' : 'bg-orange-500/10'}
          `}>
            {isInfraError 
              ? <ServerCrash className="w-6 h-6 text-destructive" />
              : <AlertTriangle className="w-6 h-6 text-orange-500" />
            }
          </div>
          <div>
            <h3 className={`font-display text-lg font-bold ${isInfraError ? 'text-destructive' : 'text-orange-500'}`}>
              {isInfraError 
                ? '⚠️ Motor de cálculo indisponível'
                : '⚡ Alguns blocos usarão estimativa'
              }
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isInfraError 
                ? 'Nosso motor de cálculo está temporariamente indisponível. Você pode tentar salvar novamente ou forçar o salvamento sem as estimativas.'
                : `O motor não reconheceu a estrutura de ${failedBlocks.length} bloco(s). Esses blocos receberão uma estimativa aproximada de tempo e calorias gerada por IA. Para cálculos mais precisos, detalhe os exercícios (Ex: Front Squat 4x8 50kg).`
              }
            </p>
          </div>
        </div>

        {/* Failed blocks list */}
        {failedBlocks.length > 0 && (
          <div className="mb-5 max-h-40 overflow-y-auto space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Blocos com problema:
            </p>
            {failedBlocks.map((block) => (
              <div
                key={block.blockId}
                className={`
                  px-3 py-2 rounded-lg text-sm border
                  ${isInfraError 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : 'bg-orange-500/5 border-orange-500/20'
                  }
                `}
              >
                <span className="font-medium">{block.blockTitle}</span>
                <span className="text-muted-foreground ml-2 text-xs">({block.blockType})</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onClose}
            className={`flex-1 ${isInfraError ? '' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
            variant={isInfraError ? 'default' : undefined}
          >
            {isInfraError ? 'Tentar novamente' : 'Corrigir texto'}
          </Button>
          <Button
            onClick={onForceBypass}
            variant="outline"
            className="flex-1 text-muted-foreground"
          >
            Forçar salvamento sem cálculos
          </Button>
        </div>
      </div>
    </div>
  );
}
