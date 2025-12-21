/**
 * AdminSpreadsheetContent - Admin-specific spreadsheet component
 * 
 * This is a clean version of the spreadsheet functionality for the Admin Portal.
 * It does NOT include the coach header or coach-specific navigation.
 * This component is meant to be rendered inside AdminPortal's layout.
 * 
 * CONCEITOS:
 * - WOD Principal: bloco central do treino (para adaptação)
 * - Benchmark: treino repetível (para análise histórica)
 * - São conceitos INDEPENDENTES
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Sparkles, AlertCircle, Trash2, CheckCircle, Trophy, Clock, ChevronDown, ChevronUp, Save, Zap, Dumbbell, Target, Eye, Wand2, Info, HelpCircle } from 'lucide-react';
import { DayOfWeek, DayWorkout, WorkoutBlock, WodType, AthleteLevel, TargetTimeRange, LEVEL_NAMES } from '@/types/outlier';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateBenchmarkTimeRanges, formatTimeRange, describeTimeRange } from '@/utils/benchmarkTimeGenerator';
import { getActiveParams } from '@/config/outlierParams';
import { identifyMainBlock, setAsMainBlock, clearMainBlock } from '@/utils/mainBlockIdentifier';
import { getMainBlockCopy, getBenchmarkCopy, getUIConceptsCopy } from '@/config/workoutConceptsCopy';

const DAY_PATTERNS: { pattern: RegExp; day: DayOfWeek }[] = [
  { pattern: /segunda|seg\b|monday|mon\b/i, day: 'seg' },
  { pattern: /terça|ter[cç]a|ter\b|tuesday|tue\b/i, day: 'ter' },
  { pattern: /quarta|qua\b|wednesday|wed\b/i, day: 'qua' },
  { pattern: /quinta|qui\b|thursday|thu\b/i, day: 'qui' },
  { pattern: /sexta|sex\b|friday|fri\b/i, day: 'sex' },
  { pattern: /s[aá]bado|sab\b|saturday|sat\b/i, day: 'sab' },
  { pattern: /domingo|dom\b|sunday|sun\b/i, day: 'dom' },
];

const BLOCK_PATTERNS: { pattern: RegExp; type: WorkoutBlock['type'] }[] = [
  { pattern: /aquecimento|warm[- ]?up|🔥/i, type: 'aquecimento' },
  { pattern: /conditioning|condicionamento|⚡/i, type: 'conditioning' },
  { pattern: /for[cç]a|strength|💪/i, type: 'forca' },
  { pattern: /espec[ií]fico|specific|hyrox|🛷/i, type: 'especifico' },
  { pattern: /core|abdominal|🎯/i, type: 'core' },
  { pattern: /corrida|running|run|🏃/i, type: 'corrida' },
  { pattern: /notas?|notes?|obs|📝/i, type: 'notas' },
];

const DAY_NAMES: Record<DayOfWeek, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
};

const WOD_TYPES: { value: WodType; label: string; icon: string }[] = [
  { value: 'engine', label: 'Engine', icon: '🔥' },
  { value: 'strength', label: 'Força', icon: '💪' },
  { value: 'skill', label: 'Skill', icon: '🎯' },
  { value: 'mixed', label: 'Misto', icon: '⚡' },
  { value: 'hyrox', label: 'HYROX', icon: '🛷' },
  { value: 'benchmark', label: 'Benchmark', icon: '🏆' },
];

function parseSpreadsheet(text: string): DayWorkout[] {
  const lines = text.split('\n');
  const workouts: DayWorkout[] = [];
  
  let currentDay: DayOfWeek | null = null;
  let currentBlocks: WorkoutBlock[] = [];
  let currentBlockType: WorkoutBlock['type'] | null = null;
  let currentBlockContent: string[] = [];
  let currentBlockTitle = '';

  const saveCurrentBlock = () => {
    if (currentBlockType && currentBlockContent.length > 0) {
      currentBlocks.push({
        id: `${currentDay}-${currentBlockType}-${currentBlocks.length}`,
        type: currentBlockType,
        title: currentBlockTitle || currentBlockType.toUpperCase(),
        content: currentBlockContent.join('\n').trim(),
        isMainWod: currentBlockType === 'conditioning' || currentBlockType === 'especifico',
      });
    }
    currentBlockContent = [];
    currentBlockTitle = '';
  };

  const saveCurrentDay = () => {
    saveCurrentBlock();
    if (currentDay && currentBlocks.length > 0) {
      workouts.push({
        day: currentDay,
        stimulus: '',
        estimatedTime: 60,
        blocks: [...currentBlocks],
      });
    }
    currentBlocks = [];
    currentBlockType = null;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    const dayMatch = DAY_PATTERNS.find(p => p.pattern.test(trimmedLine));
    if (dayMatch && (trimmedLine.length < 50 || /^[📅🗓️]/.test(trimmedLine))) {
      saveCurrentDay();
      currentDay = dayMatch.day;
      continue;
    }

    const blockMatch = BLOCK_PATTERNS.find(p => p.pattern.test(trimmedLine));
    if (blockMatch && trimmedLine.length < 80) {
      saveCurrentBlock();
      currentBlockType = blockMatch.type;
      currentBlockTitle = trimmedLine;
      continue;
    }

    if (currentDay && currentBlockType && trimmedLine) {
      currentBlockContent.push(trimmedLine);
    } else if (currentDay && !currentBlockType && trimmedLine) {
      currentBlockType = 'conditioning';
      currentBlockTitle = 'TREINO';
      currentBlockContent.push(trimmedLine);
    }
  }

  saveCurrentDay();
  return workouts;
}

export function AdminSpreadsheetContent() {
  const { setWeeklyWorkouts, weeklyWorkouts } = useOutlierStore();
  const { user, canManageWorkouts, isAdmin } = useAuth();
  
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [parsedWorkouts, setParsedWorkouts] = useState<DayWorkout[] | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<DayOfWeek>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const [programName, setProgramName] = useState('');
  const [programPeriod, setProgramPeriod] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'specific'>('all');
  const [programStatus, setProgramStatus] = useState<'draft' | 'published'>('draft');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const handleClearWorkouts = () => {
    setWeeklyWorkouts([]);
    setSpreadsheetText('');
    setParsedWorkouts(null);
    setShowPreview(false);
    setShowConfig(false);
    setProgramName('');
    setProgramPeriod('');
    setTargetAudience('all');
    setProgramStatus('draft');
    setSuccess(null);
    setError(null);
  };

  const processSpreadsheet = async () => {
    if (!spreadsheetText.trim()) {
      setError('Cole a planilha semanal no campo de texto.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const parsed = parseSpreadsheet(spreadsheetText);

    if (parsed.length === 0) {
      setError('Não foi possível identificar treinos na planilha. Verifique se os dias da semana estão identificados (Segunda, Terça, etc.).');
      setIsProcessing(false);
      return;
    }

    setParsedWorkouts(parsed);
    setExpandedDays(new Set(parsed.map(w => w.day)));
    setShowPreview(true);
    setIsProcessing(false);
  };

  const toggleDayExpanded = (day: DayOfWeek) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  const toggleBlockBenchmark = (dayIndex: number, blockIndex: number) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    const block = updated[dayIndex].blocks[blockIndex];
    block.isBenchmark = !block.isBenchmark;
    
    if (block.isBenchmark) {
      const suggestedRanges = generateBenchmarkTimeRanges(block);
      block.levelTargetRanges = suggestedRanges;
      
      if (!block.paramsVersionUsed) {
        block.paramsVersionUsed = getActiveParams().version;
        block.createdAt = new Date().toISOString();
      }
      block.updatedAt = new Date().toISOString();
    } else {
      block.targetSeconds = undefined;
      block.targetRange = undefined;
      block.levelTargetRanges = undefined;
    }
    
    setParsedWorkouts(updated);
  };

  const regenerateTimeRanges = (dayIndex: number, blockIndex: number) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    const block = updated[dayIndex].blocks[blockIndex];
    
    if (block.isBenchmark) {
      const suggestedRanges = generateBenchmarkTimeRanges(block);
      block.levelTargetRanges = suggestedRanges;
      setParsedWorkouts(updated);
    }
  };

  // Toggle de bloco principal - GARANTE apenas 1 por dia
  const toggleBlockMainWod = (dayIndex: number, blockIndex: number) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    const day = updated[dayIndex];
    const block = day.blocks[blockIndex];
    
    if (block.isMainWod) {
      // Se já é o principal, remove a marcação (volta para automático)
      day.blocks = clearMainBlock(day.blocks);
    } else {
      // Marca como principal e remove de outros
      day.blocks = setAsMainBlock(day.blocks, blockIndex);
    }
    
    setParsedWorkouts(updated);
  };

  const updateWodType = (dayIndex: number, blockIndex: number, wodType: WodType | undefined) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    updated[dayIndex].blocks[blockIndex].wodType = wodType;
    
    setParsedWorkouts(updated);
  };

  const updateDuration = (dayIndex: number, blockIndex: number, minutes: number) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    updated[dayIndex].blocks[blockIndex].durationMinutes = minutes > 0 ? minutes : undefined;
    
    setParsedWorkouts(updated);
  };

  const updateTargetRange = (dayIndex: number, blockIndex: number, field: 'min' | 'max', minutes: number, seconds: number) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    const block = updated[dayIndex].blocks[blockIndex];
    const totalSeconds = (minutes * 60) + seconds;
    
    if (!block.targetRange) {
      block.targetRange = { min: 0, max: 0 };
    }
    
    block.targetRange[field] = totalSeconds;
    setParsedWorkouts(updated);
  };

  const confirmAndSave = () => {
    if (!parsedWorkouts) return;
    
    setWeeklyWorkouts(parsedWorkouts);
    setSuccess(`${parsedWorkouts.length} dias de treino salvos com sucesso!`);
    setShowSaveConfirmation(false);
    setShowConfig(false);
  };

  const goToReview = () => {
    setShowPreview(false);
    setShowConfig(true);
  };

  const backToInput = () => {
    setShowPreview(false);
    setShowConfig(false);
    setParsedWorkouts(null);
  };

  // Current stored workouts count
  const storedWorkoutsCount = weeklyWorkouts.length;
  const totalBlocks = weeklyWorkouts.reduce((acc, day) => acc + day.blocks.length, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Status Card */}
      {storedWorkoutsCount > 0 && !showPreview && !showConfig && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Programação Ativa</p>
                <p className="text-sm text-muted-foreground">
                  {storedWorkoutsCount} dias · {totalBlocks} blocos de treino
                </p>
              </div>
            </div>
            <button
              onClick={handleClearWorkouts}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Limpar
            </button>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <p className="text-emerald-500">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      {!showPreview && !showConfig ? (
        /* Input Phase */
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="font-display text-xl">PLANILHA SEMANAL</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Cole aqui a programação semanal completa. O sistema identifica automaticamente dias, blocos de treino, tempos e benchmarks.
          </p>
          <textarea
            value={spreadsheetText}
            onChange={(e) => setSpreadsheetText(e.target.value)}
            placeholder={`Exemplo:

📅 SEGUNDA-FEIRA
🔥 AQUECIMENTO
3 Rounds:
- 10 Air Squats
- 10 Push-ups

⚡ CONDITIONING
For Time:
21-15-9
Thrusters (43/30kg)
Pull-ups

📅 TERÇA-FEIRA
...`}
            className="w-full h-64 p-4 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none font-mono text-sm"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={processSpreadsheet}
              disabled={isProcessing || !spreadsheetText.trim()}
              className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Processar Planilha
                </>
              )}
            </button>
          </div>
        </motion.section>
      ) : showPreview && parsedWorkouts ? (
        /* Preview Phase */
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6 text-primary" />
              <h2 className="font-display text-xl">REVISÃO DOS TREINOS</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              {parsedWorkouts.length} dias identificados
            </div>
          </div>

          {/* Legenda de conceitos */}
          <div className="mb-4 p-3 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground font-medium">Conceitos independentes:</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded">⚡ Principal</span>
                <span className="text-muted-foreground">Bloco central do treino. Usado para adaptação e performance contextual.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded">🏆 Benchmark</span>
                <span className="text-muted-foreground">Treino repetível para análise de evolução ao longo do tempo.</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {parsedWorkouts.map((day, dayIndex) => (
              <div key={day.day} className="rounded-xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => toggleDayExpanded(day.day)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg">{DAY_NAMES[day.day]}</span>
                    <span className="text-sm text-muted-foreground">
                      {day.blocks.length} blocos
                    </span>
                  </div>
                  {expandedDays.has(day.day) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedDays.has(day.day) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="p-4 space-y-3">
                        {day.blocks.map((block, blockIndex) => {
                          // Identificar bloco principal (manual ou automático)
                          const mainBlockResult = identifyMainBlock(day.blocks);
                          const isMainBlock = mainBlockResult.blockIndex === blockIndex;
                          const isManualMain = block.isMainWod === true;
                          const isAutoMain = isMainBlock && !isManualMain;
                          
                          const mainBlockCopy = getMainBlockCopy();
                          const benchmarkCopy = getBenchmarkCopy();
                          const uiCopy = getUIConceptsCopy();
                          
                          return (
                          <div 
                            key={block.id} 
                            className={`p-3 rounded-lg border ${
                              block.isBenchmark && isMainBlock
                                ? 'border-amber-500/30 bg-gradient-to-r from-primary/5 to-amber-500/5'
                                : block.isBenchmark 
                                  ? 'border-amber-500/30 bg-amber-500/5' 
                                  : isMainBlock
                                    ? 'border-primary/30 bg-primary/5'
                                    : 'border-border bg-secondary/30'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{block.title}</span>
                                {isManualMain && (
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                                    {mainBlockCopy.icon} {mainBlockCopy.manualLabel}
                                  </span>
                                )}
                                {isAutoMain && (
                                  <span className="text-xs bg-primary/10 text-primary/70 px-2 py-0.5 rounded-full">
                                    {mainBlockCopy.icon} {mainBlockCopy.autoLabel}
                                  </span>
                                )}
                                {block.isBenchmark && (
                                  <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-medium">
                                    {benchmarkCopy.icon} {benchmarkCopy.shortLabel}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => toggleBlockMainWod(dayIndex, blockIndex)}
                                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                                          isManualMain 
                                            ? 'bg-primary/20 text-primary' 
                                            : isAutoMain
                                              ? 'bg-primary/10 text-primary/70'
                                              : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                                        }`}
                                      >
                                        <Dumbbell className="w-3 h-3" />
                                        <span className="hidden sm:inline">Principal</span>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p className="font-medium mb-1">{mainBlockCopy.label}</p>
                                      <p className="text-xs text-muted-foreground">{mainBlockCopy.tooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => toggleBlockBenchmark(dayIndex, blockIndex)}
                                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                                          block.isBenchmark 
                                            ? 'bg-amber-500/20 text-amber-500' 
                                            : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                                        }`}
                                      >
                                        <Trophy className="w-3 h-3" />
                                        <span className="hidden sm:inline">Benchmark</span>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p className="font-medium mb-1">{benchmarkCopy.label}</p>
                                      <p className="text-xs text-muted-foreground">{benchmarkCopy.tooltip}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                              {block.content.substring(0, 200)}
                              {block.content.length > 200 && '...'}
                            </pre>
                            
                            {/* WOD Type & Duration */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <select
                                value={block.wodType || ''}
                                onChange={(e) => updateWodType(dayIndex, blockIndex, e.target.value as WodType || undefined)}
                                className="text-xs px-2 py-1 rounded bg-secondary border border-border"
                              >
                                <option value="">Tipo WOD</option>
                                {WOD_TYPES.map(type => (
                                  <option key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <input
                                  type="number"
                                  placeholder="min"
                                  value={block.durationMinutes || ''}
                                  onChange={(e) => updateDuration(dayIndex, blockIndex, parseInt(e.target.value) || 0)}
                                  className="w-16 text-xs px-2 py-1 rounded bg-secondary border border-border"
                                />
                              </div>
                            </div>

                            {/* Benchmark Time Ranges */}
                            {block.isBenchmark && block.levelTargetRanges && (
                              <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-amber-500 flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    Faixas de Tempo por Nível
                                  </span>
                                  <button
                                    onClick={() => regenerateTimeRanges(dayIndex, blockIndex)}
                                    className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"
                                  >
                                    <Wand2 className="w-3 h-3" />
                                    Regenerar
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  {Object.entries(block.levelTargetRanges).map(([level, range]) => (
                                    <div key={level} className="flex justify-between px-2 py-1 rounded bg-background/50">
                                      <span className="text-muted-foreground">{LEVEL_NAMES[level as AthleteLevel]}</span>
                                      <span className="font-mono">{formatTimeRange(range)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={backToInput}
              className="px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={goToReview}
              className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Continuar para Salvar
            </button>
          </div>
        </motion.section>
      ) : showConfig && parsedWorkouts ? (
        /* Config Phase */
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-primary" />
            <h2 className="font-display text-xl">CONFIGURAÇÃO DO PROGRAMA</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Nome do Programa</label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Ex: Semana de Preparação HYROX"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Período</label>
              <input
                type="text"
                value={programPeriod}
                onChange={(e) => setProgramPeriod(e.target.value)}
                placeholder="Ex: 16-22 Dezembro 2024"
                className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Resumo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {parsedWorkouts.length} dias de treino com {parsedWorkouts.reduce((acc, d) => acc + d.blocks.length, 0)} blocos totais.
              {parsedWorkouts.reduce((acc, d) => acc + d.blocks.filter(b => b.isBenchmark).length, 0) > 0 && (
                <span className="text-amber-500">
                  {' '}Inclui {parsedWorkouts.reduce((acc, d) => acc + d.blocks.filter(b => b.isBenchmark).length, 0)} benchmarks.
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfig(false);
                setShowPreview(true);
              }}
              className="px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={confirmAndSave}
              className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Salvar Programação
            </button>
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}
