import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trophy, Medal, Timer, Upload, X, Camera, 
  CheckCircle, Loader2, Calendar, FileText, Sparkles, Wand2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { toast } from 'sonner';
import { 
  calculateAndSaveHyroxPercentiles, 
  hasExistingScores,
  type MetricInput 
} from '@/utils/hyroxPercentileCalculator';

/**
 * Generates estimated metric times from total race time.
 * Distribution based on typical HYROX race structure.
 * All metrics are marked as 'estimated' since they're inferred from total time.
 */
function generateMetricsFromTotal(totalSeconds: number): MetricInput[] {
  const runPercent = 0.42;
  const stationPercent = 0.48;
  const roxzonePercent = 0.10;
  
  const totalRunTime = totalSeconds * runPercent;
  const totalStationTime = totalSeconds * stationPercent;
  const totalRoxzone = totalSeconds * roxzonePercent;
  
  const runAvg = totalRunTime / 8;
  
  const stationWeights = {
    ski: 0.14,
    sled_push: 0.12,
    sled_pull: 0.10,
    bbj: 0.14,
    row: 0.14,
    farmers: 0.12,
    sandbag: 0.14,
    wallballs: 0.10
  };
  
  // All metrics are estimated from total time - mark as 'estimated'
  return [
    { metric: 'run_avg', raw_time_sec: Math.round(runAvg), data_source: 'estimated' as const },
    { metric: 'roxzone', raw_time_sec: Math.round(totalRoxzone), data_source: 'estimated' as const },
    { metric: 'ski', raw_time_sec: Math.round(totalStationTime * stationWeights.ski), data_source: 'estimated' as const },
    { metric: 'sled_push', raw_time_sec: Math.round(totalStationTime * stationWeights.sled_push), data_source: 'estimated' as const },
    { metric: 'sled_pull', raw_time_sec: Math.round(totalStationTime * stationWeights.sled_pull), data_source: 'estimated' as const },
    { metric: 'bbj', raw_time_sec: Math.round(totalStationTime * stationWeights.bbj), data_source: 'estimated' as const },
    { metric: 'row', raw_time_sec: Math.round(totalStationTime * stationWeights.row), data_source: 'estimated' as const },
    { metric: 'farmers', raw_time_sec: Math.round(totalStationTime * stationWeights.farmers), data_source: 'estimated' as const },
    { metric: 'sandbag', raw_time_sec: Math.round(totalStationTime * stationWeights.sandbag), data_source: 'estimated' as const },
    { metric: 'wallballs', raw_time_sec: Math.round(totalStationTime * stationWeights.wallballs), data_source: 'estimated' as const }
  ];
}

export type ResultType = 'benchmark' | 'simulado' | 'prova_oficial';

/**
 * Interface for extracted/real splits from screenshot or manual input.
 * These are the canonical split times in seconds.
 */
export interface ExtractedSplits {
  run_avg_sec: number | null;
  roxzone_sec: number | null;
  ski_sec: number | null;
  sled_push_sec: number | null;
  sled_pull_sec: number | null;
  bbj_sec: number | null;
  row_sec: number | null;
  farmers_sec: number | null;
  sandbag_sec: number | null;
  wallballs_sec: number | null;
}

interface AddResultModalProps {
  onResultAdded?: () => void;
}

const RESULT_TYPES = [
  { value: 'simulado', label: 'Simulado', icon: Timer, description: 'Treino simulando prova oficial' },
  { value: 'prova_oficial', label: 'Prova Oficial', icon: Medal, description: 'Competição HYROX oficial' },
] as const;

// Empty splits object
const EMPTY_SPLITS: ExtractedSplits = {
  run_avg_sec: null,
  roxzone_sec: null,
  ski_sec: null,
  sled_push_sec: null,
  sled_pull_sec: null,
  bbj_sec: null,
  row_sec: null,
  farmers_sec: null,
  sandbag_sec: null,
  wallballs_sec: null,
};

export function AddResultModal({ onResultAdded }: AddResultModalProps) {
  const { user } = useAuth();
  const { athleteConfig, setCurrentView, triggerExternalResultsRefresh } = useOutlierStore();
  const [open, setOpen] = useState(false);
  const [resultType, setResultType] = useState<ResultType>('simulado');
  const [raceCategory, setRaceCategory] = useState<'OPEN' | 'PRO'>('OPEN');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionConfidence, setExtractionConfidence] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // NEW: State for extracted splits
  const [extractedSplits, setExtractedSplits] = useState<ExtractedSplits>(EMPTY_SPLITS);
  const [splitsConfidence, setSplitsConfidence] = useState<string | null>(null);

  // Check if gender is configured
  const hasGenderConfigured = athleteConfig?.sexo && ['masculino', 'feminino'].includes(athleteConfig.sexo);
  const needsGenderForProva = resultType === 'prova_oficial' && !hasGenderConfigured;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      setScreenshotFile(file);
      setExtractionConfidence(null);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const preview = reader.result as string;
        setScreenshotPreview(preview);
        // Auto-extract time from screenshot
        await extractTimeFromImage(preview);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractTimeFromImage = async (imagePreview: string) => {
    setIsExtracting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-time-from-screenshot', {
        body: { imageUrl: imagePreview }
      });

      if (error) throw error;

      if (data.error) {
        toast.info('Não foi possível extrair o tempo automaticamente. Preencha manualmente.');
        return;
      }

      if (data.time_in_seconds) {
        const totalSecs = data.time_in_seconds;
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        
        setHours(h > 0 ? h.toString() : '');
        setMinutes(m.toString());
        setSeconds(s.toString());
        setExtractionConfidence(data.confidence);

        if (data.event_name && !eventName) {
          setEventName(data.event_name);
        }
        if (data.event_date && !eventDate) {
          setEventDate(data.event_date);
        }
        
        // Auto-set race category if detected and we're in prova_oficial mode
        if (data.race_category && resultType === 'prova_oficial') {
          setRaceCategory(data.race_category as 'OPEN' | 'PRO');
        }

        // NEW: Capture extracted splits
        if (data.splits) {
          // DERIVE run_avg_sec from run_total_sec if available
          // Rule: run_avg_sec = round(run_total_sec / 8)
          let derivedRunAvg = data.splits.run_avg_sec ?? null;
          if (data.splits.run_total_sec && !derivedRunAvg) {
            derivedRunAvg = Math.round(data.splits.run_total_sec / 8);
            console.log(`[EXTRACTION] Derived run_avg_sec: ${derivedRunAvg} from run_total: ${data.splits.run_total_sec}`);
          }
          
          const newSplits: ExtractedSplits = {
            run_avg_sec: derivedRunAvg,
            roxzone_sec: data.splits.roxzone_sec ?? null,
            ski_sec: data.splits.ski_sec ?? null,
            sled_push_sec: data.splits.sled_push_sec ?? null,
            sled_pull_sec: data.splits.sled_pull_sec ?? null,
            bbj_sec: data.splits.bbj_sec ?? null,
            row_sec: data.splits.row_sec ?? null,
            farmers_sec: data.splits.farmers_sec ?? null,
            sandbag_sec: data.splits.sandbag_sec ?? null,
            wallballs_sec: data.splits.wallballs_sec ?? null,
          };
          setExtractedSplits(newSplits);
          setSplitsConfidence(data.splits_confidence || null);
          
          // Count how many splits were extracted
          const splitsCount = Object.values(newSplits).filter(v => v !== null).length;
          if (splitsCount > 0) {
            console.log(`[EXTRACTION] Captured ${splitsCount} real splits from screenshot`);
          }
        }

        const confidenceLabel = {
          high: 'alta',
          medium: 'média', 
          low: 'baixa'
        }[data.confidence] || 'média';

        let successMsg = `Tempo extraído: ${data.formatted_time}`;
        if (data.race_category) {
          successMsg += ` | Categoria: ${data.race_category}`;
        }
        
        // Add splits info to toast
        if (data.splits && data.splits_confidence !== 'none') {
          const splitsCount = Object.values(data.splits).filter((v: unknown) => v !== null && v !== undefined).length;
          if (splitsCount > 0) {
            successMsg += ` | ${splitsCount} splits extraídos`;
          }
        }
        
        successMsg += ` (confiança ${confidenceLabel})`;

        toast.success(successMsg);
      } else {
        toast.info('Não foi possível identificar o tempo. Preencha manualmente.');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.info('Erro ao extrair tempo. Preencha manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setExtractionConfidence(null);
    setSplitsConfidence(null);
    setExtractedSplits(EMPTY_SPLITS);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Função extractTimeFromScreenshot removida - agora usa extractTimeFromImage automaticamente

  const calculateTotalSeconds = (): number | null => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return null;
    return h * 3600 + m * 60 + s;
  };

  // Check if we have any real splits
  const hasRealSplits = Object.values(extractedSplits).some(v => v !== null);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para adicionar resultados');
      return;
    }

    // Validate gender for official competitions
    if (resultType === 'prova_oficial' && !hasGenderConfigured) {
      toast.error('Configure seu sexo no perfil antes de registrar uma prova oficial');
      return;
    }

    const totalSeconds = calculateTotalSeconds();
    
    // TEMPO É OBRIGATÓRIO para provas e simulados
    if (!totalSeconds) {
      toast.error('O tempo é obrigatório. Preencha horas, minutos e segundos.');
      return;
    }

    if (!eventName.trim()) {
      toast.error('Digite o nome do evento');
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if provided
      if (screenshotFile) {
        const fileExt = screenshotFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('result-screenshots')
          .upload(fileName, screenshotFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('result-screenshots')
          .getPublicUrl(fileName);
        
        screenshotUrl = publicUrl;
      }

      // Build insert object with real splits when available
      const insertPayload = {
        user_id: user.id,
        result_type: resultType,
        event_name: eventName.trim(),
        event_date: eventDate || null,
        time_in_seconds: totalSeconds,
        screenshot_url: screenshotUrl,
        race_category: resultType === 'prova_oficial' ? raceCategory : null,
        completed: true,
        block_id: `${resultType}_${Date.now()}`,
        workout_id: `${resultType}_${Date.now()}`,
        benchmark_id: resultType === 'prova_oficial' ? 'HYROX_OFFICIAL' : 'HYROX_SIMULADO',
        // Add extracted splits (null values are fine)
        run_avg_sec: extractedSplits.run_avg_sec,
        roxzone_sec: extractedSplits.roxzone_sec,
        ski_sec: extractedSplits.ski_sec,
        sled_push_sec: extractedSplits.sled_push_sec,
        sled_pull_sec: extractedSplits.sled_pull_sec,
        bbj_sec: extractedSplits.bbj_sec,
        row_sec: extractedSplits.row_sec,
        farmers_sec: extractedSplits.farmers_sec,
        sandbag_sec: extractedSplits.sandbag_sec,
        wallballs_sec: extractedSplits.wallballs_sec,
      };

      console.log('[SUBMIT] INSERT payload with splits:', {
        resultType,
        totalSeconds,
        hasRealSplits,
        splitsData: {
          run_avg_sec: extractedSplits.run_avg_sec,
          roxzone_sec: extractedSplits.roxzone_sec,
          ski_sec: extractedSplits.ski_sec,
          sled_push_sec: extractedSplits.sled_push_sec,
          sled_pull_sec: extractedSplits.sled_pull_sec,
          bbj_sec: extractedSplits.bbj_sec,
          row_sec: extractedSplits.row_sec,
          farmers_sec: extractedSplits.farmers_sec,
          sandbag_sec: extractedSplits.sandbag_sec,
          wallballs_sec: extractedSplits.wallballs_sec,
        },
        splitsCount: Object.values(extractedSplits).filter(v => v !== null).length,
      });

      // Insert the result and get the ID back
      const { data: insertedData, error: insertError } = await supabase
        .from('benchmark_results')
        .insert(insertPayload)
        .select('id, run_avg_sec, roxzone_sec, ski_sec')
        .single();

      if (insertError) throw insertError;

      const resultId = insertedData?.id;

      console.log('[SUBMIT] INSERT successful:', {
        resultId,
        insertedSplits: {
          run_avg_sec: insertedData?.run_avg_sec,
          roxzone_sec: insertedData?.roxzone_sec,
          ski_sec: insertedData?.ski_sec,
        },
        message: 'Splits saved to benchmark_results table'
      });

      toast.success(
        resultType === 'prova_oficial' 
          ? 'Prova oficial registrada! 🏆' 
          : 'Simulado registrado! 💪'
      );

      // AUTOMATIC ANALYSIS GENERATION
      // Only trigger for results with time and valid gender
      if (resultId && totalSeconds > 0 && hasGenderConfigured) {
        // Fire and forget - don't block the UI
        triggerAutoAnalysis(
          resultId,
          totalSeconds,
          athleteConfig?.sexo === 'feminino' ? 'F' : 'M',
          resultType === 'prova_oficial' ? raceCategory : 'OPEN'
        );
      }

      // Reset form
      setEventName('');
      setEventDate('');
      setHours('');
      setMinutes('');
      setSeconds('');
      setRaceCategory('OPEN');
      setExtractionConfidence(null);
      setSplitsConfidence(null);
      setExtractedSplits(EMPTY_SPLITS);
      removeScreenshot();
      setOpen(false);
      triggerExternalResultsRefresh();
      onResultAdded?.();
    } catch (error) {
      console.error('Error adding result:', error);
      toast.error('Erro ao salvar resultado');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Triggers automatic analysis generation in the background.
   * Non-blocking, with idempotency check.
   */
  const triggerAutoAnalysis = async (
    resultId: string,
    totalSeconds: number,
    gender: 'M' | 'F',
    category: 'OPEN' | 'PRO'
  ) => {
    console.log('[AUTO_ANALYSIS] Starting automatic analysis for:', resultId);
    
    try {
      // IDEMPOTENCY CHECK: Don't recalculate if scores exist
      const alreadyExists = await hasExistingScores(resultId);
      if (alreadyExists) {
        console.log('[AUTO_ANALYSIS] Scores already exist, skipping:', resultId);
        return;
      }

      // Generate metrics from total time
      const metrics = generateMetricsFromTotal(totalSeconds);
      const division = category === 'PRO' ? 'HYROX PRO' : 'HYROX';

      console.log('[AUTO_ANALYSIS] Calling edge function:', { resultId, division, gender });

      // Call the calculation
      const result = await calculateAndSaveHyroxPercentiles(
        resultId,
        division,
        gender,
        metrics
      );

      if (result.success) {
        console.log('[AUTO_ANALYSIS] Analysis generated successfully');
        // Trigger refresh so HyroxAnalysisCard picks up the new scores
        triggerExternalResultsRefresh();
      } else {
        console.warn('[AUTO_ANALYSIS] Analysis failed:', result.error);
        // Non-blocking warning - don't show toast to avoid confusion
      }
    } catch (err) {
      console.error('[AUTO_ANALYSIS] Unexpected error:', err);
      // Silent failure - the UI will show appropriate state
    }
  };

  const formatTimeDisplay = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return '--:--:--';
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Adicionar Resultado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Registrar Resultado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Result Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            {RESULT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = resultType === type.value;
              return (
                <motion.button
                  key={type.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setResultType(type.value as ResultType)}
                  className={`
                    p-4 rounded-xl border-2 text-left transition-all
                    ${isSelected 
                      ? type.value === 'prova_oficial'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground/50'
                    }
                  `}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? type.value === 'prova_oficial' ? 'text-amber-500' : 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-semibold text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </motion.button>
              );
            })}
          </div>

          {/* Race Category Selection - Only for official races */}
          {resultType === 'prova_oficial' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label className="text-sm">Categoria da Prova</Label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRaceCategory('OPEN')}
                  className={`
                    p-3 rounded-xl border-2 text-center transition-all
                    ${raceCategory === 'OPEN'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-border hover:border-muted-foreground/50'
                    }
                  `}
                >
                  <p className={`font-semibold ${raceCategory === 'OPEN' ? 'text-purple-500' : 'text-foreground'}`}>OPEN</p>
                  <p className="text-xs text-muted-foreground">Categoria padrão</p>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRaceCategory('PRO')}
                  className={`
                    p-3 rounded-xl border-2 text-center transition-all
                    ${raceCategory === 'PRO'
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border hover:border-muted-foreground/50'
                    }
                  `}
                >
                  <p className={`font-semibold ${raceCategory === 'PRO' ? 'text-amber-500' : 'text-foreground'}`}>PRO</p>
                  <p className="text-xs text-muted-foreground">Cargas maiores</p>
                </motion.button>
              </div>
              <p className="text-xs text-muted-foreground">
                {raceCategory === 'PRO' 
                  ? 'Tempo PRO será normalizado (~5-6% mais difícil que OPEN)'
                  : 'Tempo OPEN usado diretamente como referência'
                }
              </p>
            </motion.div>
          )}

          {/* Gender Warning for Official Competition */}
          {needsGenderForProva && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-500">Configuração necessária</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para registrar uma prova oficial, é necessário configurar seu sexo no perfil. 
                    Os tempos de referência são diferentes para masculino e feminino.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => {
                      setOpen(false);
                      setCurrentView('config');
                    }}
                  >
                    Configurar Perfil
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Screenshot Upload - Moved to top for AI extraction flow */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Print do Resultado
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                IA extrai o tempo automaticamente
              </span>
            </Label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {screenshotPreview ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-3"
                >
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img 
                      src={screenshotPreview} 
                      alt="Preview" 
                      className="w-full h-40 object-cover"
                    />
                    <button
                      onClick={removeScreenshot}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {extractionConfidence && (
                      <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
                        extractionConfidence === 'high' ? 'bg-green-500/90 text-white' :
                        extractionConfidence === 'medium' ? 'bg-amber-500/90 text-white' :
                        'bg-red-500/90 text-white'
                      }`}>
                        Confiança {extractionConfidence === 'high' ? 'alta' : extractionConfidence === 'medium' ? 'média' : 'baixa'}
                      </div>
                    )}
                  </div>
                  
                  {/* Extraction status indicator */}
                  {isExtracting && (
                    <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span className="text-sm text-amber-500">Extraindo tempo da imagem...</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-amber-500/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-amber-500/60 hover:bg-amber-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-6 h-6 text-amber-500" />
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Faça upload do print</p>
                  <p className="text-xs text-amber-500">IA extrai o tempo automaticamente</p>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou insira manualmente</span>
            </div>
          </div>

          {/* Event Name */}
          <div className="space-y-2">
            <Label htmlFor="eventName" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Nome do Evento
            </Label>
            <Input
              id="eventName"
              placeholder={resultType === 'prova_oficial' ? 'Ex: HYROX São Paulo 2024' : 'Ex: Simulado Box CrossFit'}
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>

          {/* Event Date */}
          <div className="space-y-2">
            <Label htmlFor="eventDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data do Evento
            </Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          {/* Time Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Tempo Final
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="HH"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Horas</p>
              </div>
              <span className="text-2xl text-muted-foreground">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="MM"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Min</p>
              </div>
              <span className="text-2xl text-muted-foreground">:</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="SS"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  className="text-center"
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Seg</p>
              </div>
            </div>
            <p className="text-center font-mono text-lg text-primary">
              {formatTimeDisplay()}
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || needsGenderForProva || (!calculateTotalSeconds() && !screenshotFile)}
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Registrar {resultType === 'prova_oficial' ? 'Prova' : 'Simulado'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
