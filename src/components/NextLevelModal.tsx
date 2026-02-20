import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Trophy, 
  Target, 
  Dumbbell, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Crown,
  Sparkles,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { JourneyPosition, ExtendedLevelKey } from '@/hooks/useJourneyProgress';

interface NextLevelModalProps {
  journeyProgress: JourneyPosition;
}

// Level labels and colors
const LEVEL_LABELS: Record<ExtendedLevelKey, string> = {
  OPEN: 'OPEN',
  PRO: 'PRO',
  ELITE: 'ELITE',
};

const LEVEL_GRADIENTS: Record<ExtendedLevelKey, string> = {
  OPEN: 'from-purple-500 to-fuchsia-500',
  PRO: 'from-amber-400 to-yellow-400',
  ELITE: 'from-yellow-300 to-amber-300',
};

const LEVEL_TEXT_COLORS: Record<ExtendedLevelKey, string> = {
  OPEN: 'text-purple-400',
  PRO: 'text-amber-400',
  ELITE: 'text-yellow-300',
};

const LEVEL_BG: Record<ExtendedLevelKey, string> = {
  OPEN: 'bg-purple-500/10 border-purple-500/20',
  PRO: 'bg-amber-500/10 border-amber-500/20',
  ELITE: 'bg-yellow-500/10 border-yellow-500/20',
};

export function NextLevelModal({ journeyProgress }: NextLevelModalProps) {
  const [open, setOpen] = useState(false);
  
  const { 
    targetLevelKey, 
    targetLevelLabel, 
    targetLevel, 
    isAtTop, 
    hasOfficialRace, 
    isCapped, 
    loading 
  } = journeyProgress;
  
  if (loading) return null;
  
  // Calculate what's missing
  const trainingMissing = Math.max(0, targetLevel.trainingRequired - targetLevel.trainingSessions);
  const benchmarksMissing = Math.max(0, targetLevel.benchmarksRequired - targetLevel.benchmarksCompleted);
  const requiresRace = targetLevel.officialRaceRequired;
  
  // Determine status
  let status: 'close' | 'blocked' | 'working' | 'top';
  let statusText: string;
  let statusColor: string;
  
  if (isAtTop) {
    status = 'top';
    statusText = 'Topo alcançado!';
    statusColor = 'text-yellow-300';
  } else if (requiresRace && !hasOfficialRace) {
    status = 'blocked';
    statusText = 'Bloqueado por prova';
    statusColor = 'text-amber-400';
  } else if (trainingMissing <= 10 && benchmarksMissing <= 2) {
    status = 'close';
    statusText = 'Falta pouco!';
    statusColor = 'text-green-400';
  } else {
    status = 'working';
    statusText = 'Em progresso';
    statusColor = 'text-blue-400';
  }
  
  // Generate summary text
  const summaryParts: string[] = [];
  if (!isAtTop) {
    if (trainingMissing > 0) {
      summaryParts.push(`${trainingMissing} treino${trainingMissing > 1 ? 's' : ''}`);
    }
    if (benchmarksMissing > 0) {
      summaryParts.push(`${benchmarksMissing} benchmark${benchmarksMissing > 1 ? 's' : ''}`);
    }
    if (requiresRace && !hasOfficialRace) {
      summaryParts.push('prova oficial');
    }
  }
  
  const summaryText = summaryParts.length > 0 
    ? `Falta${summaryParts.length > 1 || (trainingMissing + benchmarksMissing) > 1 ? 'm' : ''}: ${summaryParts.join(', ')}`
    : isAtTop ? 'Mantenha a consistência!' : 'Todos os requisitos cumpridos!';
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className={`w-full gap-2 border-2 border-dashed ${
            isAtTop 
              ? 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10' 
              : `${LEVEL_BG[targetLevelKey]} hover:bg-opacity-20`
          }`}
        >
          {isAtTop ? (
            <>
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300">Você está no topo!</span>
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4" />
              <span>Próximo nível</span>
              <Badge variant="outline" className={`ml-auto ${LEVEL_TEXT_COLORS[targetLevelKey]}`}>
                {targetLevelLabel}
              </Badge>
            </>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-3">
            {isAtTop ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-400 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-black" />
                </div>
                <span className="bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent">
                  Topo Alcançado!
                </span>
              </>
            ) : (
              <>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${LEVEL_GRADIENTS[targetLevelKey]} flex items-center justify-center`}>
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Próximo nível</span>
                  <p className={`font-semibold ${LEVEL_TEXT_COLORS[targetLevelKey]}`}>
                    {targetLevelLabel}
                  </p>
                </div>
              </>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-6 space-y-5 overflow-y-auto">
          {isAtTop ? (
            // Elite message
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex justify-center"
              >
                <div className="relative">
                  <Crown className="w-20 h-20 text-yellow-400" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-2 -right-2" />
                    <Sparkles className="w-4 h-4 text-amber-300 absolute -bottom-1 -left-1" />
                  </motion.div>
                </div>
              </motion.div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-300 to-amber-300 bg-clip-text text-transparent">
                  HYROX ELITE
                </h3>
                <p className="text-muted-foreground">
                  Você alcançou o nível máximo. Agora é manter a consistência para sustentar sua posição.
                </p>
              </div>
              
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-300">Mantenha o ritmo</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Continue treinando e completando benchmarks para manter seu status de elite.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Next level requirements
            <div className="space-y-5">
              {/* Status Badge */}
              <div className={`p-4 rounded-xl border ${
                status === 'blocked' 
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : status === 'close'
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-blue-500/10 border-blue-500/20'
              }`}>
                <div className="flex items-center gap-3">
                  {status === 'blocked' ? (
                    <Lock className="w-5 h-5 text-amber-400" />
                  ) : status === 'close' ? (
                    <Sparkles className="w-5 h-5 text-green-400" />
                  ) : (
                    <Target className="w-5 h-5 text-blue-400" />
                  )}
                  <div>
                    <p className={`font-semibold ${statusColor}`}>
                      {statusText}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {summaryText}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Checklist */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Requisitos para {targetLevelLabel}
                </h4>
                
                {/* Training */}
                <div className="p-4 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Dumbbell className="w-4 h-4" />
                      Treinos
                    </span>
                    <span className={`text-sm font-bold ${
                      trainingMissing === 0 ? 'text-green-400' : ''
                    }`}>
                      {targetLevel.trainingSessions} / {targetLevel.trainingRequired}
                    </span>
                  </div>
                  <Progress value={targetLevel.trainingProgress * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    nos últimos {targetLevel.trainingWindowDays} dias
                    {trainingMissing > 0 && (
                      <span className="text-amber-400 ml-2">
                        (faltam {trainingMissing})
                      </span>
                    )}
                  </p>
                </div>
                
                {/* Benchmarks */}
                <div className="p-4 bg-secondary/30 rounded-xl border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Target className="w-4 h-4" />
                      Benchmarks OUTLIER
                    </span>
                    <span className={`text-sm font-bold ${
                      benchmarksMissing === 0 ? 'text-green-400' : ''
                    }`}>
                      {targetLevel.benchmarksCompleted} / {targetLevel.benchmarksRequired}
                    </span>
                  </div>
                  <Progress value={targetLevel.benchmarkProgress * 100} className="h-2" />
                  {benchmarksMissing > 0 && (
                    <p className="text-xs text-amber-400 mt-2">
                      faltam {benchmarksMissing}
                    </p>
                  )}
                </div>
                
                {/* Official Race */}
                <div className={`p-4 rounded-xl border ${
                  !requiresRace
                    ? 'bg-secondary/30 border-border/50'
                    : hasOfficialRace
                      ? 'bg-green-500/10 border-green-500/20'
                      : 'bg-amber-500/10 border-amber-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Trophy className="w-4 h-4" />
                      Prova oficial
                    </span>
                    {!requiresRace ? (
                      <span className="text-sm text-muted-foreground">
                        Não obrigatória
                      </span>
                    ) : hasOfficialRace ? (
                      <span className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 text-sm font-semibold">
                        <XCircle className="w-4 h-4" />
                        Obrigatória
                      </span>
                    )}
                  </div>
                  {requiresRace && !hasOfficialRace && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Para atingir {targetLevelLabel}, você precisa de uma prova oficial válida.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Contextual tip */}
              {status === 'blocked' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                    <p className="text-sm text-amber-300">
                      <strong>Prova oficial é obrigatória</strong> para atingir níveis HYROX (OPEN, PRO, ELITE).
                    </p>
                  </div>
                </div>
              )}
              
              {status === 'close' && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-green-400 mt-0.5" />
                    <p className="text-sm text-green-300">
                      <strong>Você está quase lá!</strong> Continue treinando para subir de nível.
                    </p>
                  </div>
                </div>
              )}
              
              {isCapped && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-400 mt-0.5" />
                    <p className="text-sm text-amber-300">
                      <strong>Progresso limitado</strong> a {journeyProgress.capPercent}% sem prova oficial.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
