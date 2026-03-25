import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore, type SessionBlockResult } from '@/store/outlierStore';
import { DAY_NAMES, type AthleteLevel } from '@/types/outlier';
import { ArrowLeft, Check, Clock, Play, Flame, Info, Target, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { estimateBlock, formatEstimatedTime, formatEstimatedKcal, getUserBiometrics } from '@/utils/workoutEstimation';
import { getBlockTimeMeta } from '@/utils/timeValidation';
import { computeBlockMetrics } from '@/utils/computeBlockKcalFromParsed';
import { estimateWorkoutTime } from '@/utils/estimateWorkoutTime';
import { getEffectiveTargetRange, getEffectiveNotes, getEffectivePSE, getEffectiveReferencePace, getPSEInfo, formatPace } from '@/utils/benchmarkVariants';
import { toast } from 'sonner';
import { getBlockCompletionLine } from '@/config/coachCopy';
import { getBlockDisplayTitle, getBlockDisplayDataFromParsed } from '@/utils/blockDisplayUtils';
import { CategoryChip, StructureBadge, CommentSubBlock, ExerciseLine } from './DSLBlockRenderer';

const blockTypeColors: Record<string, string> = {
  aquecimento: 'border-l-amber-500',
  conditioning: 'border-l-primary',
  forca: 'border-l-red-500',
  especifico: 'border-l-purple-500',
  core: 'border-l-blue-500',
  corrida: 'border-l-green-500',
  notas: 'border-l-muted-foreground',
};

// Detect block format from structureDescription, block title, and inline struct markers
function detectBlockFormat(
  block: { type: string; title?: string },
  structureDescription: string | null,
  blockTitle?: string,
  exerciseLines?: string[]
): SessionBlockResult['format'] {
  // 1. Check structureDescription first
  const sd = (structureDescription || '').toUpperCase();
  if (sd.includes('AMRAP')) return 'amrap';
  if (sd.includes('EMOM')) return 'emom';
  if (sd.includes('FOR TIME') || sd.includes('RFT') || sd.includes('CHIPPER')) return 'for_time';
  if (/\d+\s*(ROUNDS?|RDS?)/.test(sd)) return 'for_time';
  
  // 2. Check block title (e.g. "15' AMRAP", "EMOM 12'", "3 Rounds For Time")
  const titleUpper = (blockTitle || block.title || '').toUpperCase();
  if (/AMRAP/.test(titleUpper)) return 'amrap';
  if (/EMOM/.test(titleUpper)) return 'emom';
  if (/FOR\s*TIME|RFT|CHIPPER/.test(titleUpper)) return 'for_time';
  if (/\d+\s*(ROUNDS?|RDS?)/.test(titleUpper)) return 'for_time';
  
  // 3. Check inline __STRUCT: markers in exercise lines
  if (exerciseLines) {
    for (const line of exerciseLines) {
      if (line.startsWith('__STRUCT:')) {
        const structText = line.slice('__STRUCT:'.length).toUpperCase();
        if (structText.includes('AMRAP')) return 'amrap';
        if (structText.includes('EMOM')) return 'emom';
        if (/FOR\s*TIME|RFT|CHIPPER/.test(structText)) return 'for_time';
        if (/\d+\s*(ROUNDS?|RDS?)/.test(structText)) return 'for_time';
      }
    }
  }
  
  // 4. Fallback by block type
  if (block.type === 'forca') return 'strength';
  
  return 'other';
}

// Should this block type skip recording entirely?
function isAutoCompleteBlock(blockType: string): boolean {
  return ['aquecimento', 'core', 'notas'].includes(blockType);
}

// Should we ask for time input?
function needsTimeInput(format: SessionBlockResult['format']): boolean {
  return format === 'for_time';
}

// Should we ask for reps input?
function needsRepsInput(format: SessionBlockResult['format']): boolean {
  return format === 'amrap';
}

// Should we ask for confirmation only?
function needsConfirmationOnly(format: SessionBlockResult['format']): boolean {
  return format === 'emom' || format === 'strength';
}

function formatSecondsToMinSec(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function WorkoutExecution() {
  const { selectedWorkout, setCurrentView, athleteConfig, setAthleteConfig, addWorkoutResult, addSessionBlockResult, clearSessionBlockResults, setSessionTotalSeconds, setSessionEstimatedMinutes } = useOutlierStore();
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  
  // Session stopwatch
  const startTimeRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [justCompletedBlock, setJustCompletedBlock] = useState<string | null>(null);
  
  
  // Inline recording state
  const [recordingBlockId, setRecordingBlockId] = useState<string | null>(null);
  const [inputMinutes, setInputMinutes] = useState('');
  const [inputSeconds, setInputSeconds] = useState('');
  const [inputReps, setInputReps] = useState('');
  const [blockFeedbacks, setBlockFeedbacks] = useState<Record<string, string>>({});

  const displayedWorkout = selectedWorkout;

  if (!selectedWorkout || !displayedWorkout) {
    setCurrentView('dashboard');
    return null;
  }

  const getCompletionAnimation = (coachStyle: string | undefined) => {
    switch (coachStyle) {
      case 'IRON':
        return { initial: { scale: 1 }, complete: { scale: [1, 0.98, 1], transition: { duration: 0.2 } } };
      case 'SPARK':
        return { initial: { scale: 1, rotate: 0 }, complete: { scale: [1, 1.05, 0.95, 1.02, 1], rotate: [0, -2, 2, -1, 0], transition: { duration: 0.5 } } };
      case 'PULSE':
      default:
        return { initial: { scale: 1 }, complete: { scale: [1, 1.02, 1], opacity: [1, 0.8, 0.6], transition: { duration: 0.4 } } };
    }
  };

  const getCheckboxAnimation = (coachStyle: string | undefined, isComplete: boolean) => {
    if (!isComplete) return { scale: 1, opacity: 1 };
    switch (coachStyle) {
      case 'IRON':
        return { scale: [0, 1.1, 1], transition: { duration: 0.15 } };
      case 'SPARK':
        return { scale: [0, 1.3, 0.9, 1.1, 1], rotate: [0, 10, -10, 5, 0], transition: { duration: 0.4 } };
      case 'PULSE':
      default:
        return { scale: [0, 1.05, 1], transition: { duration: 0.3 } };
    }
  };

  // Estimate expected rounds for AMRAP blocks
  function estimateExpectedRounds(block: typeof displayedWorkout.blocks[0], totalAmrapSeconds: number): number | undefined {
    if (totalAmrapSeconds <= 0) return undefined;
    
    const estimation = estimateWorkoutTime(block.content || '');
    
    if (estimation.itemsFound === 0 || estimation.totalMinutes <= 0) return undefined;
    
    const baseSecondsForOneRound = estimation.breakdown.reduce((sum: number, item: { seconds: number }) => sum + item.seconds, 0);
    if (baseSecondsForOneRound <= 0) return undefined;
    
    return Math.round(totalAmrapSeconds / baseSecondsForOneRound);
  }

  // Generate local feedback comparing actual vs estimated
  function generateLocalFeedback(format: SessionBlockResult['format'], timeInSeconds?: number, estimatedSeconds?: number, reps?: number, estimatedRounds?: number): string {
    if (format === 'amrap' && reps !== undefined) {
      if (estimatedRounds && estimatedRounds > 0) {
        const diff = reps - estimatedRounds;
        const absDiff = Math.abs(diff);
        if (diff > 0) return `${absDiff} round${absDiff > 1 ? 's' : ''} acima do esperado 💪`;
        if (diff < 0) return `${absDiff} round${absDiff > 1 ? 's' : ''} abaixo do esperado`;
        return `No alvo! (${reps} rounds) 🎯`;
      }
      return `${reps} rounds/reps completados`;
    }
    
    if (format === 'emom') {
      return 'EMOM concluído ✓';
    }
    
    if (format === 'for_time' && timeInSeconds && estimatedSeconds && estimatedSeconds > 0) {
      const diff = timeInSeconds - estimatedSeconds;
      const absDiff = Math.abs(diff);
      const diffFormatted = formatSecondsToMinSec(absDiff);
      
      if (diff < -10) return `${diffFormatted} mais rápido que o estimado 🔥`;
      if (diff > 10) return `${diffFormatted} mais lento que o estimado`;
      return 'Dentro do tempo estimado ✓';
    }
    
    if (format === 'strength') {
      return 'Bloco de força concluído ✓';
    }
    
    return 'Concluído ✓';
  }

  const toggleBlockComplete = (blockId: string, blockType: string, blockIndex: number) => {
    const isCompleting = !completedBlocks.includes(blockId);
    
    if (isCompleting) {
      // Check if this block type auto-completes
      if (isAutoCompleteBlock(blockType)) {
        // Auto-complete without recording
        setCompletedBlocks((prev) => [...prev, blockId]);
        setJustCompletedBlock(blockId);
        setTimeout(() => setJustCompletedBlock(null), 600);
        
        const newCompletedCount = completedBlocks.length + 1;
        const blocksRemaining = displayedWorkout.blocks.length - newCompletedCount;
        const isLastBlock = blocksRemaining === 0;
        const message = getBlockCompletionLine(athleteConfig?.coachStyle, blockType, isLastBlock);
        toast.success(message, { duration: 2000 });
        
        if (blockIndex === currentBlockIndex) {
          setCurrentBlockIndex(Math.min(blockIndex + 1, displayedWorkout.blocks.length - 1));
        }
        return;
      }
      
      // Get block format info
      const block = displayedWorkout.blocks[blockIndex];
      const displayData = getBlockDisplayDataFromParsed(block);
      const blockTitle = getBlockDisplayTitle(block, blockIndex);
      const format = detectBlockFormat(block, displayData.structureDescription, blockTitle, displayData.exerciseLines);
      
      // Check if we need to show inline recording
      if (needsTimeInput(format) || needsRepsInput(format) || needsConfirmationOnly(format)) {
        setRecordingBlockId(blockId);
        setInputMinutes('');
        setInputSeconds('');
        setInputReps('');
        return; // Don't complete yet - wait for recording
      }
      
      // Default: just complete
      setCompletedBlocks((prev) => [...prev, blockId]);
      setJustCompletedBlock(blockId);
      setTimeout(() => setJustCompletedBlock(null), 600);
      if (blockIndex === currentBlockIndex) {
        setCurrentBlockIndex(Math.min(blockIndex + 1, displayedWorkout.blocks.length - 1));
      }
    } else {
      // Uncompleting
      setCompletedBlocks((prev) => prev.filter((id) => id !== blockId));
      setBlockFeedbacks((prev) => {
        const next = { ...prev };
        delete next[blockId];
        return next;
      });
    }
  };

  const handleRecordBlock = (blockIndex: number) => {
    const block = displayedWorkout.blocks[blockIndex];
    const blockId = block.id;
    const displayData = getBlockDisplayDataFromParsed(block);
    const blockTitleText = getBlockDisplayTitle(block, blockIndex);
    const format = detectBlockFormat(block, displayData.structureDescription, blockTitleText, displayData.exerciseLines);
    const timeMeta = getBlockTimeMeta(block);
    const estimatedSeconds = timeMeta.durationSecUsed;
    
    let timeInSeconds: number | undefined;
    let reps: number | undefined;
    
    if (needsTimeInput(format)) {
      const mins = parseInt(inputMinutes || '0');
      const secs = parseInt(inputSeconds || '0');
      timeInSeconds = mins * 60 + secs;
      if (timeInSeconds === 0) timeInSeconds = undefined;
    }
    
    if (needsRepsInput(format)) {
      reps = parseInt(inputReps || '0') || undefined;
    }
    
    // Calculate estimated rounds for AMRAP
    let estRounds: number | undefined;
    if (format === 'amrap' && estimatedSeconds > 0) {
      estRounds = estimateExpectedRounds(block, estimatedSeconds);
    }
    
    // Save to store
    const result: SessionBlockResult = {
      blockId,
      blockTitle: getBlockDisplayTitle(block, blockIndex),
      blockType: block.type,
      format,
      completed: true,
      timeInSeconds,
      estimatedTimeSeconds: estimatedSeconds > 0 ? estimatedSeconds : undefined,
      reps,
      estimatedRounds: estRounds,
      structureDescription: displayData.structureDescription,
    };
    addSessionBlockResult(result);
    
    // Generate local feedback
    const feedback = generateLocalFeedback(format, timeInSeconds, estimatedSeconds, reps, estRounds);
    setBlockFeedbacks((prev) => ({ ...prev, [blockId]: feedback }));
    
    // Complete the block
    setCompletedBlocks((prev) => [...prev, blockId]);
    setJustCompletedBlock(blockId);
    setTimeout(() => setJustCompletedBlock(null), 600);
    setRecordingBlockId(null);
    
    if (blockIndex === currentBlockIndex) {
      setCurrentBlockIndex(Math.min(blockIndex + 1, displayedWorkout.blocks.length - 1));
    }
    
    const newCompletedCount = completedBlocks.length + 1;
    const blocksRemaining = displayedWorkout.blocks.length - newCompletedCount;
    const isLastBlock = blocksRemaining === 0;
    const message = getBlockCompletionLine(athleteConfig?.coachStyle, block.type, isLastBlock);
    toast.success(message, { duration: 2000 });
  };

  const handleCancelRecording = () => {
    setRecordingBlockId(null);
    setInputMinutes('');
    setInputSeconds('');
    setInputReps('');
  };

  const allBlocksComplete = displayedWorkout.blocks.every((b) => completedBlocks.includes(b.id));

  const effectiveLevel: AthleteLevel = 'pro';
  
  // workoutEstimation removido — cálculo agora é por bloco (mesmo motor do WeeklyTrainingView)
  
  const biometrics = useMemo(() => getUserBiometrics(athleteConfig), [athleteConfig]);

  const handleFinishWorkout = () => {
    // Capture elapsed time
    const totalSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setSessionTotalSeconds(totalSeconds);
    setSessionEstimatedMinutes(selectedWorkout.estimatedTime || 0);
    
    const sessionResult = {
      workoutId: selectedWorkout.day,
      blockId: `session-${selectedWorkout.day}-${Date.now()}`,
      completed: true,
      date: new Date().toISOString(),
    };
    addWorkoutResult(sessionResult);
    console.log('[JOURNEY] Training session registered:', sessionResult, 'totalSeconds:', totalSeconds);
    
    // Go directly to feedback (skipping ResultRecording)
    setCurrentView('feedback');
  };
  
  const formatStopwatch = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-2xl">{DAY_NAMES[displayedWorkout.day]}</h1>
              <p className="text-sm text-muted-foreground">{displayedWorkout.stimulus}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Session Stopwatch */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">TEMPO DE SESSÃO</p>
          <p className="font-mono text-4xl md:text-5xl font-bold tracking-wider text-foreground tabular-nums">
            {formatStopwatch(elapsedSeconds)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-secondary h-1">
        <motion.div
          className="bg-primary h-full"
          initial={{ width: 0 }}
          animate={{ width: `${(completedBlocks.length / displayedWorkout.blocks.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Workout Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">

        <div className="space-y-4 mb-8">
          {displayedWorkout.blocks.map((block, index) => {
            const isComplete = completedBlocks.includes(block.id);
            const isCurrent = index === currentBlockIndex;
            const isJustCompleted = justCompletedBlock === block.id;
            const isRecording = recordingBlockId === block.id;
            
            const effectiveNotes = getEffectiveNotes(block, effectiveLevel);
            const effectiveTargetRange = getEffectiveTargetRange(block, effectiveLevel);
            const effectivePSE = getEffectivePSE(block, effectiveLevel);
            const effectivePace = getEffectiveReferencePace(block, effectiveLevel);
            const pseInfo = effectivePSE ? getPSEInfo(effectivePSE) : null;
            
            // Mesma lógica do WeeklyTrainingView: motor físico → fallback estimateBlock
            let estimatedKcal = 0;
            let estimatedMinutes = 0;
            let isEstimated = true;
            
            const hasParsedData = block.parsedExercises && block.parsedExercises.length > 0 && block.parseStatus === 'completed';
            
            if (hasParsedData) {
              const metrics = computeBlockMetrics(
                block.parsedExercises!,
                { pesoKg: biometrics.weightKg && biometrics.weightKg > 0 ? biometrics.weightKg : 75, sexo: biometrics.sex },
                block.content,
                block.title
              );
              estimatedKcal = Math.round(metrics.estimatedKcal || 0);
              estimatedMinutes = Math.round((metrics.estimatedDurationSec || 0) / 60);
              isEstimated = false;
            } else {
              const blockEst = estimateBlock(block, biometrics, effectiveLevel);
              estimatedKcal = Math.round(blockEst.estimatedKcal || 0);
              estimatedMinutes = Math.round((blockEst.estimatedMinutes || 0));
              isEstimated = true;
            }
            
            // timeMeta still needed for inline recording feedback
            const timeMeta = getBlockTimeMeta(block);
            
            const completionAnim = getCompletionAnimation(athleteConfig?.coachStyle);
            
            const displayData = getBlockDisplayDataFromParsed(block);
            const blockFormat = detectBlockFormat(block, displayData.structureDescription, getBlockDisplayTitle(block, index), displayData.exerciseLines);
            const blockFeedback = blockFeedbacks[block.id];

            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isJustCompleted ? completionAnim.complete : { opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  card-elevated p-6 border-l-4 transition-all duration-300
                  ${blockTypeColors[block.type] || 'border-l-border'}
                  ${isComplete && !isRecording ? 'opacity-60' : ''}
                  ${block.isMainWod ? 'ring-2 ring-primary/50' : ''}
                  ${isJustCompleted && athleteConfig?.coachStyle === 'SPARK' ? 'ring-2 ring-yellow-400/50' : ''}
                `}
              >
                <div className="flex items-start gap-4">
                  <motion.button
                    onClick={() => toggleBlockComplete(block.id, block.type, index)}
                    disabled={isRecording}
                    className={`
                      mt-1 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                      ${isComplete
                        ? athleteConfig?.coachStyle === 'SPARK' 
                          ? 'bg-yellow-500 border-yellow-500 text-black'
                          : athleteConfig?.coachStyle === 'IRON'
                            ? 'bg-zinc-700 border-zinc-700 text-white'
                            : 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/30 hover:border-primary'
                      }
                      ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    whileTap={isRecording ? {} : { scale: 0.9 }}
                  >
                    <AnimatePresence mode="wait">
                      {isComplete && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={getCheckboxAnimation(athleteConfig?.coachStyle, true)}
                          exit={{ scale: 0, opacity: 0 }}
                        >
                          <Check className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="flex-1">
                    {/* Header */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className={`font-display text-2xl font-bold tracking-tight uppercase ${isComplete ? 'line-through opacity-60' : ''}`}>
                            {getBlockDisplayTitle(block, index)}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CategoryChip category={block.type} />
                            {block.isMainWod && (
                              <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold tracking-wide uppercase">
                                WOD Principal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Exercise content */}
                    {(() => {
                      const { exerciseLines, coachNotes: commentLines, structureDescription } = displayData;
                      
                      return (
                        <>
                          {structureDescription && (
                            <div className="mb-4">
                              <StructureBadge structure={structureDescription} />
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            {exerciseLines.length > 0 ? (
                              exerciseLines.map((line, idx) => {
                                if (line.startsWith('__STRUCT:')) {
                                  return (
                                    <div key={idx} className="pt-3 pb-1">
                                      <StructureBadge structure={line.slice('__STRUCT:'.length)} />
                                    </div>
                                  );
                                }
                                return <ExerciseLine key={idx} line={line} className="text-foreground/80" />;
                              })
                            ) : (
                              <p className="text-xs text-muted-foreground/30 italic py-1">—</p>
                            )}
                          </div>
                          
                          <CommentSubBlock comments={commentLines} />
                        </>
                      );
                    })()}
                    
                    {effectiveNotes && (
                      <div className="flex items-start gap-2 mt-3 p-2 bg-secondary/50 rounded text-xs text-muted-foreground">
                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{effectiveNotes}</span>
                      </div>
                    )}

                    {/* Block Stats */}
                    {block.type !== 'notas' && (estimatedMinutes > 0 || pseInfo || effectivePace) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-border/50">
                        {estimatedMinutes > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">{isEstimated ? '~' : ''}</span>
                            <span className="font-medium text-foreground">{formatEstimatedTime(estimatedMinutes)}</span>
                            {isEstimated && <span className="text-xs text-muted-foreground/60">(estimado)</span>}
                          </div>
                        )}
                        
                        {biometrics.isValid && estimatedKcal > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="text-orange-500 font-medium">{formatEstimatedKcal(estimatedKcal)}</span>
                          </div>
                        )}
                        
                        {pseInfo && (
                          <div className="flex items-center gap-2 text-sm">
                            <Target className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">PSE:</span>
                            <span className={`font-medium ${pseInfo.colorClass}`}>{effectivePSE}/10</span>
                          </div>
                        )}
                        
                        {effectivePace && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Pace:</span>
                            <span className="font-medium text-foreground">{formatPace(effectivePace)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* ==================== INLINE RECORDING PANEL ==================== */}
                    <AnimatePresence>
                      {isRecording && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-primary/30"
                        >
                          <div className="bg-primary/5 rounded-lg p-4 space-y-4">
                            {/* FOR TIME - Time input */}
                            {needsTimeInput(blockFormat) && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-display text-sm tracking-wide text-foreground">SEU TEMPO</p>
                                  {timeMeta.durationSecUsed > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Estimado: <span className="font-medium text-foreground">{formatSecondsToMinSec(timeMeta.durationSecUsed)}</span>
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="180"
                                      value={inputMinutes}
                                      onChange={(e) => setInputMinutes(e.target.value)}
                                      placeholder="min"
                                      className="w-full px-3 py-3 rounded-lg bg-secondary border border-border text-center font-display text-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                  <span className="font-display text-3xl text-muted-foreground">:</span>
                                  <div className="flex-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="59"
                                      value={inputSeconds}
                                      onChange={(e) => setInputSeconds(e.target.value)}
                                      placeholder="seg"
                                      className="w-full px-3 py-3 rounded-lg bg-secondary border border-border text-center font-display text-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* AMRAP - Reps input */}
                            {needsRepsInput(blockFormat) && (() => {
                              const amrapEstRounds = timeMeta.durationSecUsed > 0 ? estimateExpectedRounds(block, timeMeta.durationSecUsed) : undefined;
                              return (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-display text-sm tracking-wide text-foreground">ROUNDS COMPLETADOS</p>
                                  {amrapEstRounds && amrapEstRounds > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Esperado: <span className="font-medium text-foreground">~{amrapEstRounds} rounds</span>
                                    </p>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  value={inputReps}
                                  onChange={(e) => setInputReps(e.target.value)}
                                  placeholder="Ex: 5"
                                  className="w-full px-3 py-3 rounded-lg bg-secondary border border-border text-center font-display text-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                              );
                            })()}
                            
                            {/* EMOM / Strength - Confirmation only */}
                            {needsConfirmationOnly(blockFormat) && (
                              <div className="text-center">
                                <p className="font-display text-sm tracking-wide text-foreground mb-2">
                                  {blockFormat === 'emom' ? 'CONCLUIU O EMOM?' : 'CONCLUIU O BLOCO?'}
                                </p>
                                {timeMeta.durationSecUsed > 0 && blockFormat !== 'emom' && (
                                  <p className="text-xs text-muted-foreground mb-3">
                                    Tempo estimado: <span className="font-medium">{formatSecondsToMinSec(timeMeta.durationSecUsed)}</span>
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="flex gap-3">
                              <button
                                onClick={handleCancelRecording}
                                className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors font-display text-sm"
                              >
                                CANCELAR
                              </button>
                              <button
                                onClick={() => handleRecordBlock(index)}
                                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-display text-sm"
                              >
                                REGISTRAR
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* ==================== BLOCK FEEDBACK (after recording) ==================== */}
                    {blockFeedback && isComplete && !isRecording && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20"
                      >
                        <p className="text-sm text-primary font-medium">{blockFeedback}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Finish Button */}
        <motion.button
          onClick={handleFinishWorkout}
          disabled={!allBlocksComplete}
          className={`
            w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg transition-all
            flex items-center justify-center gap-3
            ${allBlocksComplete
              ? 'bg-primary text-primary-foreground hover:opacity-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
          whileHover={allBlocksComplete ? { scale: 1.01 } : {}}
          whileTap={allBlocksComplete ? { scale: 0.99 } : {}}
        >
          FINALIZAR TREINO
          <Play className="w-5 h-5" />
        </motion.button>

        {!allBlocksComplete && (
          <p className="text-center text-muted-foreground text-sm mt-4">
            Complete todos os blocos para finalizar o treino
          </p>
        )}
      </main>
    </div>
  );
}
