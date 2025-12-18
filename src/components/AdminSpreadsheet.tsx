import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, FileText, Sparkles, AlertCircle, Trash2, CheckCircle, ShieldAlert, LogIn, Trophy, Clock, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { DayOfWeek, DayWorkout, WorkoutBlock } from '@/types/outlier';

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
    
    // Check if it's a day header
    const dayMatch = DAY_PATTERNS.find(p => p.pattern.test(trimmedLine));
    if (dayMatch && (trimmedLine.length < 50 || /^[📅🗓️]/.test(trimmedLine))) {
      saveCurrentDay();
      currentDay = dayMatch.day;
      continue;
    }

    // Check if it's a block header
    const blockMatch = BLOCK_PATTERNS.find(p => p.pattern.test(trimmedLine));
    if (blockMatch && trimmedLine.length < 80) {
      saveCurrentBlock();
      currentBlockType = blockMatch.type;
      currentBlockTitle = trimmedLine;
      continue;
    }

    // Add content to current block
    if (currentDay && currentBlockType && trimmedLine) {
      currentBlockContent.push(trimmedLine);
    } else if (currentDay && !currentBlockType && trimmedLine) {
      // No block type yet, assume conditioning as default
      currentBlockType = 'conditioning';
      currentBlockTitle = 'TREINO';
      currentBlockContent.push(trimmedLine);
    }
  }

  // Save last day/block
  saveCurrentDay();

  return workouts;
}

export function AdminSpreadsheet() {
  const { setCurrentView, setWeeklyWorkouts, weeklyWorkouts } = useOutlierStore();
  const { user, canManageWorkouts, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Review phase state
  const [parsedWorkouts, setParsedWorkouts] = useState<DayWorkout[] | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<DayOfWeek>>(new Set());

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center">
          <p className="text-muted-foreground">Verificando acesso…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-primary/60" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Área restrita</h1>
          <p className="text-muted-foreground mb-6">
            Faça login com uma conta de coach ou administrador.
          </p>
          <button
            onClick={() => navigate('/auth?next=admin')}
            className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Fazer login
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="mt-3 w-full px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!canManageWorkouts) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-primary/60" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Acesso negado</h1>
          <p className="text-muted-foreground mb-6">
            Sua conta não tem permissão de coach ou administrador.
          </p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="w-full px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const handleClearWorkouts = () => {
    setWeeklyWorkouts([]);
    setSpreadsheetText('');
    setParsedWorkouts(null);
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

    // Move to review phase instead of saving directly
    setParsedWorkouts(parsed);
    setExpandedDays(new Set(parsed.map(w => w.day)));
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
    
    // If unchecking benchmark, clear target time
    if (!block.isBenchmark) {
      block.targetSeconds = undefined;
    }
    
    setParsedWorkouts(updated);
  };

  const toggleBlockMainWod = (dayIndex: number, blockIndex: number) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    const block = updated[dayIndex].blocks[blockIndex];
    block.isMainWod = !block.isMainWod;
    
    setParsedWorkouts(updated);
  };

  const updateTargetTime = (dayIndex: number, blockIndex: number, minutes: number, seconds: number) => {
    if (!parsedWorkouts) return;
    
    const updated = [...parsedWorkouts];
    const totalSeconds = (minutes * 60) + seconds;
    updated[dayIndex].blocks[blockIndex].targetSeconds = totalSeconds > 0 ? totalSeconds : undefined;
    
    setParsedWorkouts(updated);
  };

  const saveWorkouts = () => {
    if (!parsedWorkouts) return;
    
    setWeeklyWorkouts(parsedWorkouts);
    setSuccess(`${parsedWorkouts.length} dia(s) de treino salvo(s) com sucesso!`);
    setParsedWorkouts(null);
    setSpreadsheetText('');
  };

  const cancelReview = () => {
    setParsedWorkouts(null);
  };

  const formatTargetTime = (totalSeconds?: number) => {
    if (!totalSeconds) return { minutes: '', seconds: '' };
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return { minutes: mins.toString(), seconds: secs.toString().padStart(2, '0') };
  };

  // Review phase UI
  if (parsedWorkouts) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={cancelReview}
                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-2xl">REVISAR TREINOS</h1>
                <p className="text-sm text-muted-foreground">
                  Configure benchmarks e WODs principais
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* Info banner */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20"
          >
            <p className="text-sm text-primary">
              <Trophy className="w-4 h-4 inline mr-2" />
              Marque WODs como <strong>benchmark</strong> para rastrear evolução. Benchmarks exigem tempo do atleta.
            </p>
          </motion.div>

          {/* Days list */}
          <div className="space-y-4">
            {parsedWorkouts.map((workout, dayIndex) => (
              <motion.div
                key={workout.day}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.05 }}
                className="card-elevated rounded-lg overflow-hidden"
              >
                {/* Day header */}
                <button
                  onClick={() => toggleDayExpanded(workout.day)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl">{DAY_NAMES[workout.day]}</span>
                    <span className="text-sm text-muted-foreground">
                      {workout.blocks.length} bloco(s)
                    </span>
                    {workout.blocks.some(b => b.isBenchmark) && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-status-excellent/20 text-status-excellent rounded">
                        BENCHMARK
                      </span>
                    )}
                  </div>
                  {expandedDays.has(workout.day) ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>

                {/* Blocks */}
                <AnimatePresence>
                  {expandedDays.has(workout.day) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        {workout.blocks.map((block, blockIndex) => (
                          <div
                            key={block.id}
                            className={`p-4 rounded-lg border ${
                              block.isBenchmark 
                                ? 'border-status-excellent/50 bg-status-excellent/5' 
                                : 'border-border'
                            }`}
                          >
                            {/* Block header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-display text-sm">{block.title}</span>
                                <span className="px-2 py-0.5 text-xs bg-secondary rounded text-muted-foreground">
                                  {block.type}
                                </span>
                              </div>
                            </div>

                            {/* Block content preview */}
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap mb-4 max-h-32 overflow-y-auto">
                              {block.content}
                            </pre>

                            {/* Block options */}
                            <div className="space-y-3 pt-3 border-t border-border">
                              {/* Main WOD toggle */}
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={block.isMainWod || false}
                                  onChange={() => toggleBlockMainWod(dayIndex, blockIndex)}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm">WOD principal do dia</span>
                              </label>

                              {/* Benchmark toggle */}
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={block.isBenchmark || false}
                                  onChange={() => toggleBlockBenchmark(dayIndex, blockIndex)}
                                  className="w-4 h-4 rounded border-border text-status-excellent focus:ring-status-excellent"
                                />
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-status-excellent" />
                                  <span className="text-sm">WOD é benchmark (mede evolução)</span>
                                </div>
                              </label>

                              {/* Target time (only if benchmark) */}
                              {block.isBenchmark && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="ml-7 mt-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Tempo alvo:</span>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max="180"
                                        value={formatTargetTime(block.targetSeconds).minutes}
                                        onChange={(e) => {
                                          const mins = parseInt(e.target.value) || 0;
                                          const secs = block.targetSeconds ? block.targetSeconds % 60 : 0;
                                          updateTargetTime(dayIndex, blockIndex, mins, secs);
                                        }}
                                        placeholder="00"
                                        className="w-16 px-2 py-1 text-center text-sm rounded bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                      <span className="text-muted-foreground">:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={formatTargetTime(block.targetSeconds).seconds}
                                        onChange={(e) => {
                                          const secs = parseInt(e.target.value) || 0;
                                          const mins = block.targetSeconds ? Math.floor(block.targetSeconds / 60) : 0;
                                          updateTargetTime(dayIndex, blockIndex, mins, secs);
                                        }}
                                        placeholder="00"
                                        className="w-16 px-2 py-1 text-center text-sm rounded bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                                      />
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2 ml-7">
                                    ↳ Exigir tempo do atleta para gerar feedback
                                  </p>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={saveWorkouts}
              className="flex-1 font-display text-xl tracking-wider px-8 py-5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-3"
            >
              <Save className="w-5 h-5" />
              SALVAR TREINOS
            </button>
            <button
              onClick={cancelReview}
              className="px-8 py-5 rounded-lg border border-border hover:bg-secondary transition-colors font-body"
            >
              Voltar e Editar
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  // Input phase UI
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('welcome')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl">INSERIR PLANILHA</h1>
              <p className="text-sm text-muted-foreground">
                Área restrita para Coach
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Spreadsheet Input */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="font-display text-2xl">PLANILHA SEMANAL</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Cole a planilha completa da semana. O sistema aceita emojis, títulos e seções como:
            Aquecimento, Conditioning, Força, Específico, Core, Corrida, Notas.
          </p>
          <textarea
            value={spreadsheetText}
            onChange={(e) => setSpreadsheetText(e.target.value)}
            placeholder="Cole aqui a planilha semanal completa..."
            className="w-full h-96 px-4 py-4 rounded-lg bg-secondary border border-border font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
          />
          <p className="text-muted-foreground text-xs mt-2">
            {spreadsheetText.length} caracteres
          </p>
        </motion.section>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-primary" />
            <p className="text-sm text-primary">{success}</p>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={processSpreadsheet}
            disabled={isProcessing}
            className={`
              flex-1 font-display text-xl tracking-wider px-8 py-5 rounded-lg
              transition-all flex items-center justify-center gap-3
              ${isProcessing
                ? 'bg-muted text-muted-foreground cursor-wait'
                : 'bg-primary text-primary-foreground hover:opacity-90'
              }
            `}
          >
            {isProcessing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
                PROCESSANDO...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                PROCESSAR PLANILHA
              </>
            )}
          </button>
          <button
            onClick={() => setCurrentView('welcome')}
            className="px-8 py-5 rounded-lg border border-border hover:bg-secondary transition-colors font-body"
          >
            Voltar
          </button>
          {weeklyWorkouts.length > 0 && (
            <button
              onClick={handleClearWorkouts}
              className="px-8 py-5 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors font-body flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Limpar Planilha
            </button>
          )}
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 p-6 rounded-lg bg-card border border-border"
        >
          <h3 className="font-display text-lg mb-3">📋 FORMATO ESPERADO</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Use <strong>📅</strong> ou nome do dia para separar dias (Segunda, Terça...)</li>
            <li>• Seções: 🔥 Aquecimento, 💪 Força, ⚡ Conditioning, 🛷 Específico, 🎯 Core, 🏃 Corrida, 📝 Notas</li>
            <li>• Use <strong>---</strong> ou linha em branco para separar dias</li>
            <li>• Inclua CAP e referências de tempo para WODs principais</li>
            <li>• Emojis e formatação livre são aceitos</li>
          </ul>
        </motion.div>

        {/* Benchmark info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-6 rounded-lg bg-status-excellent/10 border border-status-excellent/20"
        >
          <h3 className="font-display text-lg mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-status-excellent" />
            BENCHMARKS
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Após processar, você poderá marcar WODs como <strong>benchmark</strong></li>
            <li>• Benchmarks rastreiam evolução do atleta ao longo do tempo</li>
            <li>• Atletas são obrigados a registrar tempo em benchmarks</li>
            <li>• Configure um tempo alvo para classificação de performance</li>
          </ul>
        </motion.div>
      </main>
    </div>
  );
}
