import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, FileText, Sparkles, AlertCircle, Trash2, CheckCircle, ShieldAlert, LogIn } from 'lucide-react';
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

    const parsedWorkouts = parseSpreadsheet(spreadsheetText);

    if (parsedWorkouts.length === 0) {
      setError('Não foi possível identificar treinos na planilha. Verifique se os dias da semana estão identificados (Segunda, Terça, etc.).');
      setIsProcessing(false);
      return;
    }

    setWeeklyWorkouts(parsedWorkouts);
    setIsProcessing(false);
    setSuccess(`${parsedWorkouts.length} dia(s) de treino processado(s) com sucesso!`);
    setSpreadsheetText('');
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
            onClick={() => setCurrentView('dashboard')}
            className="px-8 py-5 rounded-lg border border-border hover:bg-secondary transition-colors font-body"
          >
            Cancelar
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
      </main>
    </div>
  );
}
