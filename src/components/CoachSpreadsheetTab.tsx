/**
 * CoachSpreadsheetTab - Aba IMPORTAR do Coach
 * 
 * REGRA ANTI-BUG:
 * - Preview = estado local (parsedWorkouts)
 * - Nunca depende do banco para renderizar preview
 * - "Publicar para Atletas" usa preview local como fonte
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { useCoachWorkouts } from '@/hooks/useCoachWorkouts';
import { 
  FileText, Sparkles, AlertCircle, Trash2, CheckCircle, ChevronDown, ChevronUp, 
  Save, Zap, Dumbbell, Target, Info, Trophy, Clock, Send, Upload 
} from 'lucide-react';
import { DayOfWeek, DayWorkout, WorkoutBlock, WodType, AthleteLevel, LEVEL_NAMES } from '@/types/outlier';
import { PublishToAthletesModal } from './PublishToAthletesModal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { generateBenchmarkTimeRanges, formatTimeRange, describeTimeRange } from '@/utils/benchmarkTimeGenerator';
import { getActiveParams } from '@/config/outlierParams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

interface LinkedAthlete {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
}

interface CoachSpreadsheetTabProps {
  linkedAthletes: LinkedAthlete[];
  loadingAthletes?: boolean;
}

export function CoachSpreadsheetTab({ linkedAthletes, loadingAthletes = false }: CoachSpreadsheetTabProps) {
  const { setWeeklyWorkouts, weeklyWorkouts } = useOutlierStore();
  const { profile } = useAuth();
  const { saveWorkout: saveToDb } = useCoachWorkouts();
  
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsedWorkouts, setParsedWorkouts] = useState<DayWorkout[] | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<DayOfWeek>>(new Set());
  const [programName, setProgramName] = useState('');
  const [programStatus, setProgramStatus] = useState<'draft' | 'published'>('draft');
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const handleClearWorkouts = () => {
    setWeeklyWorkouts([]);
    setSpreadsheetText('');
    setParsedWorkouts(null);
    setProgramName('');
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

    await new Promise((resolve) => setTimeout(resolve, 300));

    const parsed = parseSpreadsheet(spreadsheetText);

    if (parsed.length === 0) {
      setError('Não foi possível identificar treinos. Verifique se os dias da semana estão identificados.');
      setIsProcessing(false);
      return;
    }

    setParsedWorkouts(parsed);
    setExpandedDays(new Set(parsed.map(w => w.day)));
    setIsProcessing(false);
    setSuccess(`${parsed.length} dia(s) identificados. Revise abaixo e salve.`);
  };

  const toggleDayExpanded = (day: DayOfWeek) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) newSet.delete(day);
      else newSet.add(day);
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

  const saveWorkouts = async () => {
    if (!parsedWorkouts) return;
    
    setIsSavingToDb(true);
    setError(null);
    
    try {
      setWeeklyWorkouts(parsedWorkouts);
      
      const title = programName.trim() || `Programação ${new Date().toLocaleDateString('pt-BR')}`;
      const status = programStatus === 'published' ? 'published' : 'draft';
      
      const workoutId = await saveToDb(title, parsedWorkouts, status, 0);
      
      if (workoutId) {
        setSuccess(`${parsedWorkouts.length} dia(s) salvos! ${status === 'published' ? '(Publicado)' : '(Rascunho)'}`);
      } else {
        setSuccess(`${parsedWorkouts.length} dia(s) salvos localmente.`);
      }
      
      setParsedWorkouts(null);
      setSpreadsheetText('');
      setProgramName('');
    } catch (err) {
      console.error('[CoachSpreadsheetTab] Error saving:', err);
      setError('Erro ao salvar treino');
    } finally {
      setIsSavingToDb(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Como usar</p>
              <p className="text-muted-foreground">
                Cole sua planilha semanal abaixo. O sistema identifica automaticamente os dias (Segunda, Terça...) 
                e blocos (Aquecimento, Conditioning, Força, Core, etc.).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors/Success */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </motion.div>
        )}
        
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-green-500/10 border border-green-500/20"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-500">{success}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      {!parsedWorkouts && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Importar Planilha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={spreadsheetText}
              onChange={(e) => setSpreadsheetText(e.target.value)}
              placeholder={`Segunda-feira 📅
🔥 AQUECIMENTO
3 rounds:
- 200m Run
- 10 Air Squats

⚡ CONDITIONING
AMRAP 20min:
5 Pull-ups
10 Push-ups
15 Air Squats

Terça-feira 📅
...`}
              className="min-h-[250px] font-mono text-sm"
            />
            
            <div className="flex gap-3">
              <Button
                onClick={processSpreadsheet}
                disabled={isProcessing || !spreadsheetText.trim()}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Processar Planilha
                  </>
                )}
              </Button>
              
              {weeklyWorkouts.length > 0 && (
                <Button variant="outline" onClick={handleClearWorkouts}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview dos treinos parseados - FONTE LOCAL */}
      {parsedWorkouts && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Dumbbell className="w-5 h-5 text-primary" />
                Preview da Semana ({parsedWorkouts.length} dias)
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setParsedWorkouts(null)}>
                  Voltar
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setShowPublishModal(true)}
                        className="flex items-center gap-1.5"
                        disabled={linkedAthletes.length === 0}
                      >
                        <Send className="w-4 h-4" />
                        Publicar para Atletas
                      </Button>
                    </TooltipTrigger>
                    {linkedAthletes.length === 0 && (
                      <TooltipContent>
                        <p>Vincule atletas primeiro na aba Atletas</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lista de dias */}
            <div className="space-y-3">
              {parsedWorkouts.map((workout, dayIndex) => (
                <div key={workout.day} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleDayExpanded(workout.day)}
                    className="w-full p-3 flex items-center justify-between bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{DAY_NAMES[workout.day]}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {workout.blocks.length} bloco(s)
                      </span>
                    </div>
                    {expandedDays.has(workout.day) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedDays.has(workout.day) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 space-y-3 bg-background">
                          {workout.blocks.map((block, blockIndex) => (
                            <div key={block.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{block.title}</span>
                                <div className="flex gap-2">
                                  <Button
                                    variant={block.isBenchmark ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleBlockBenchmark(dayIndex, blockIndex)}
                                    className="h-7 text-xs"
                                  >
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Benchmark
                                  </Button>
                                </div>
                              </div>
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-background/50 p-2 rounded">
                                {block.content}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Configurações de salvamento */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="programName">Nome da Programação</Label>
                  <Input
                    id="programName"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder={`Semana ${new Date().toLocaleDateString('pt-BR')}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status ao Salvar</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={programStatus === 'draft' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProgramStatus('draft')}
                      className="flex-1"
                    >
                      Rascunho
                    </Button>
                    <Button
                      variant={programStatus === 'published' ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProgramStatus('published')}
                      className="flex-1"
                    >
                      Publicar
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={saveWorkouts}
                disabled={isSavingToDb}
                className="w-full"
              >
                {isSavingToDb ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Programação
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio - sem preview processado */}
      {!parsedWorkouts && !spreadsheetText.trim() && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-foreground font-medium">Nenhuma planilha importada</p>
            <p className="text-muted-foreground text-sm mt-1">
              Cole sua planilha semanal acima e clique em "Processar Planilha".
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de publicar para atletas - usa preview local */}
      <PublishToAthletesModal
        open={showPublishModal}
        onOpenChange={setShowPublishModal}
        workouts={parsedWorkouts || []}
        title={programName || `Semana ${new Date().toLocaleDateString('pt-BR')}`}
        linkedAthletes={linkedAthletes}
        loadingAthletes={loadingAthletes}
      />
    </div>
  );
}
