import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { EQUIPMENT_LIST } from '@/types/outlier';
import { ArrowLeft, Check, FileText, Sparkles, AlertCircle } from 'lucide-react';

export function AdminSpreadsheet() {
  const { setCurrentView, setWeeklyWorkouts } = useOutlierStore();
  const [spreadsheetText, setSpreadsheetText] = useState('');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEquipment = (id: string) => {
    setAvailableEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const selectAllEquipment = () => {
    setAvailableEquipment(EQUIPMENT_LIST.map((e) => e.id));
  };

  const clearAllEquipment = () => {
    setAvailableEquipment([]);
  };

  const processSpreadsheet = async () => {
    if (!spreadsheetText.trim()) {
      setError('Cole a planilha semanal no campo de texto.');
      return;
    }

    if (availableEquipment.length === 0) {
      setError('Selecione pelo menos um equipamento disponível.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Simulating processing - in production this would parse the spreadsheet
    // and potentially call an API to process with AI
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For now, we'll just show success and go to dashboard
    // In production, this would parse the text and update weeklyWorkouts
    setIsProcessing(false);
    setCurrentView('dashboard');
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
              <p className="text-sm text-muted-foreground">Área restrita - Administrador</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Equipment Selection */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">EQUIPAMENTOS DISPONÍVEIS</h2>
            <div className="flex gap-2">
              <button
                onClick={selectAllEquipment}
                className="px-3 py-1 text-sm rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                Todos
              </button>
              <button
                onClick={clearAllEquipment}
                className="px-3 py-1 text-sm rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Selecione os equipamentos que estarão disponíveis para os atletas nesta semana.
            Isso ajudará a filtrar exercícios incompatíveis.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {EQUIPMENT_LIST.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleEquipment(item.id)}
                className={`
                  p-4 rounded-lg border transition-all duration-200 text-left flex items-center gap-3
                  ${availableEquipment.includes(item.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-muted-foreground/50'
                  }
                `}
              >
                <span className="text-2xl">{item.emoji}</span>
                <span className="font-body text-sm flex-1">{item.name}</span>
                {availableEquipment.includes(item.id) && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Spreadsheet Input */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
          transition={{ delay: 0.2 }}
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
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
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
