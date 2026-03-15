/**
 * ProvasTab - Aba de Provas Oficiais com busca HYROX (sem diagnóstico) + upload de screenshot
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Trophy, Check, CheckCheck, ShieldCheck, Loader2,
  Upload, Sparkles, Camera, X, FileText, Calendar, Timer,
  CheckCircle, AlertTriangle, Medal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { toast } from 'sonner';
import { BenchmarkHistory } from './BenchmarkHistory';
import { TargetSplitsTable } from './evolution/TargetSplitsTable';
import { type Split } from './diagnostico/types';
import {
  calculateAndSaveHyroxPercentiles,
  hasExistingScores,
  type MetricInput,
} from '@/utils/hyroxPercentileCalculator';

interface ProvasTabProps {
  refreshKey: number;
  onResultAdded: () => void;
}

interface SearchResult {
  athlete_name: string;
  event_name: string;
  division?: string;
  time_formatted: string;
  result_url: string;
  season_id?: number;
  event_index?: number;
}

interface ExtractedSplits {
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

const EMPTY_SPLITS: ExtractedSplits = {
  run_avg_sec: null, roxzone_sec: null, ski_sec: null,
  sled_push_sec: null, sled_pull_sec: null, bbj_sec: null,
  row_sec: null, farmers_sec: null, sandbag_sec: null, wallballs_sec: null,
};

function generateMetricsFromTotal(totalSeconds: number): MetricInput[] {
  const runAvg = (totalSeconds * 0.42) / 8;
  const stationTime = totalSeconds * 0.48;
  const roxzone = totalSeconds * 0.10;
  const w = { ski: 0.14, sled_push: 0.12, sled_pull: 0.10, bbj: 0.14, row: 0.14, farmers: 0.12, sandbag: 0.14, wallballs: 0.10 };
  return [
    { metric: 'run_avg', raw_time_sec: Math.round(runAvg), data_source: 'estimated' as const },
    { metric: 'roxzone', raw_time_sec: Math.round(roxzone), data_source: 'estimated' as const },
    ...Object.entries(w).map(([k, v]) => ({ metric: k, raw_time_sec: Math.round(stationTime * v), data_source: 'estimated' as const })),
  ];
}

function generateMetricsFromSplits(splits: Record<string, number>): MetricInput[] {
  const mapping: Record<string, string> = {
    run_avg_sec: 'run_avg', roxzone_sec: 'roxzone', ski_sec: 'ski',
    sled_push_sec: 'sled_push', sled_pull_sec: 'sled_pull', bbj_sec: 'bbj',
    row_sec: 'row', farmers_sec: 'farmers', sandbag_sec: 'sandbag', wallballs_sec: 'wallballs',
  };
  return Object.entries(mapping)
    .filter(([key]) => splits[key] && splits[key] > 0)
    .map(([key, metric]) => ({ metric, raw_time_sec: Math.round(splits[key]), data_source: 'real' as const }));
}

export function ProvasTab({ refreshKey, onResultAdded }: ProvasTabProps) {
  const { user, profile } = useAuth();
  const { athleteConfig, triggerExternalResultsRefresh } = useOutlierStore();

  // ── Search state ──
  const profileName = profile?.name || '';
  const [searchQuery, setSearchQuery] = useState(profileName);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchedRef = useRef('');
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [consentGiven, setConsentGiven] = useState(false);
  const [importingSelected, setImportingSelected] = useState(false);
  const [currentImportUrl, setCurrentImportUrl] = useState('');

  // ── Screenshot modal state ──
  const [modalOpen, setModalOpen] = useState(false);
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
  const [extractedSplits, setExtractedSplits] = useState<ExtractedSplits>(EMPTY_SPLITS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasGenderConfigured = athleteConfig?.sexo && ['masculino', 'feminino'].includes(athleteConfig.sexo);

  // Auto-search on mount
  useEffect(() => {
    if (profileName && user) executeSearch(profileName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search logic ──
  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (trimmed === lastSearchedRef.current) return;
    lastSearchedRef.current = trimmed;

    const parts = trimmed.split(/\s+/);
    const firstName = parts.length > 1 ? parts[0] : '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];

    setSearching(true);
    setSearchDone(false);

    try {
      const gender = athleteConfig?.sexo === 'feminino' ? 'W' : athleteConfig?.sexo === 'masculino' ? 'M' : '';
      const { data, error } = await supabase.functions.invoke('search-hyrox-athlete', {
        body: { firstName, lastName, gender },
      });
      if (error) throw error;

      const rawResults: SearchResult[] = data?.results || [];
      const sorted = rawResults.sort((a, b) => {
        if ((b.season_id || 0) !== (a.season_id || 0)) return (b.season_id || 0) - (a.season_id || 0);
        return (a.event_index ?? 999) - (b.event_index ?? 999);
      });

      // Filter already-imported (check benchmark_results.screenshot_url which stores result_url)
      if (user) {
        const urls = sorted.map(r => r.result_url);
        const { data: existing } = await supabase
          .from('benchmark_results')
          .select('screenshot_url')
          .eq('user_id', user.id)
          .eq('result_type', 'prova_oficial')
          .in('screenshot_url', urls);

        const importedUrls = new Set((existing || []).map(e => e.screenshot_url));
        setSearchResults(sorted.filter(r => !importedUrls.has(r.result_url)));
      } else {
        setSearchResults(sorted);
      }
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erro ao buscar resultados.');
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [athleteConfig?.sexo, user]);

  function handleQueryChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 3) {
      debounceRef.current = setTimeout(() => executeSearch(value), 800);
    }
  }

  function toggleResultSelection(url: string) {
    setSelectedResults(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedResults.size === searchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(searchResults.map(r => r.result_url)));
    }
  }

  // ── Import race WITHOUT diagnostic ──
  async function importRace(result: SearchResult) {
    if (!user) return;
    setCurrentImportUrl(result.result_url);

    const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke(
      'scrape-hyrox-result', { body: { url: result.result_url } }
    );
    if (scrapeError) throw new Error('Não foi possível ler os dados do link.');
    if (scrapeData?.error || !scrapeData?.time_in_seconds) {
      throw new Error(scrapeData?.error || 'Tempos não encontrados.');
    }

    const totalSeconds = scrapeData.time_in_seconds;
    const scrapedEventName = scrapeData.event_name || 'Prova HYROX';
    const eventYear = scrapeData.event_year || new Date().getFullYear();
    const scrapedRaceCategory = scrapeData.race_category || 'OPEN';
    const splits = scrapeData.splits || null;
    const hasSplits = splits && Object.values(splits).some((v: any) => v && v > 0);

    // Compute source_index for ordering: higher season + higher event_index = more recent
    // Encode as season_id * 1000 + event_index so higher = more recent
    const sourceIndex = (result.season_id && result.event_index !== undefined)
      ? (result.season_id * 1000) + (result.event_index ?? 0)
      : null;

    const insertPayload: any = {
      user_id: user.id,
      result_type: 'prova_oficial',
      event_name: scrapedEventName,
      event_date: scrapeData.event_date || `${eventYear}-06-15`,
      time_in_seconds: totalSeconds,
      screenshot_url: result.result_url,
      race_category: scrapedRaceCategory,
      completed: true,
      block_id: `prova_oficial_${Date.now()}`,
      workout_id: `prova_oficial_${Date.now()}`,
      benchmark_id: 'HYROX_OFFICIAL',
      source_index: sourceIndex,
    };

    if (hasSplits) {
      for (const key of ['run_avg_sec', 'roxzone_sec', 'ski_sec', 'sled_push_sec', 'sled_pull_sec', 'bbj_sec', 'row_sec', 'farmers_sec', 'sandbag_sec', 'wallballs_sec']) {
        if (splits[key]) insertPayload[key] = Math.round(splits[key]);
      }
    }

    const { data: insertedData, error: insertError } = await supabase
      .from('benchmark_results')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') throw new Error('Este resultado já foi importado.');
      throw insertError;
    }

    // Calculate percentiles
    const resultId = insertedData?.id;
    if (resultId && hasGenderConfigured) {
      const alreadyExists = await hasExistingScores(resultId);
      if (!alreadyExists) {
        const division = scrapedRaceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';
        const gender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';
        const metrics = hasSplits ? generateMetricsFromSplits(splits) : generateMetricsFromTotal(totalSeconds);
        await calculateAndSaveHyroxPercentiles(resultId, division, gender, metrics);
      }
    }
  }

  async function handleImportSelected() {
    if (!user || selectedResults.size === 0) return;
    const toImport = searchResults.filter(r => selectedResults.has(r.result_url));
    if (toImport.length === 0) return;

    setImportingSelected(true);
    let successCount = 0;
    let failCount = 0;

    for (const result of toImport) {
      try {
        await importRace(result);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setCurrentImportUrl('');
    setImportingSelected(false);
    setSelectedResults(new Set());

    if (successCount > 0) {
      toast.success(`${successCount} prova(s) importada(s) com sucesso! 🏆`);
      setSearchResults(prev => prev.filter(r => !selectedResults.has(r.result_url)));
      triggerExternalResultsRefresh();
      onResultAdded();
    }
    if (failCount > 0) {
      toast.error(`${failCount} prova(s) não puderam ser importadas.`);
    }
  }

  // ── Screenshot upload logic ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB.'); return; }
    setScreenshotFile(file);
    setExtractionConfidence(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const preview = reader.result as string;
      setScreenshotPreview(preview);
      await extractTimeFromImage(preview);
    };
    reader.readAsDataURL(file);
  };

  const extractTimeFromImage = async (imagePreview: string) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-time-from-screenshot', {
        body: { imageUrl: imagePreview },
      });
      if (error) throw error;
      if (data.error) { toast.info('Preencha manualmente.'); return; }

      if (data.time_in_seconds) {
        const t = data.time_in_seconds;
        setHours(Math.floor(t / 3600) > 0 ? String(Math.floor(t / 3600)) : '');
        setMinutes(String(Math.floor((t % 3600) / 60)));
        setSeconds(String(t % 60));
        setExtractionConfidence(data.confidence);
        if (data.event_name && !eventName) setEventName(data.event_name);
        if (data.event_date && !eventDate) setEventDate(data.event_date);
        if (data.race_category) setRaceCategory(data.race_category as 'OPEN' | 'PRO');

        if (data.splits) {
          let derivedRunAvg = data.splits.run_avg_sec ?? null;
          if (data.splits.run_total_sec && !derivedRunAvg) derivedRunAvg = Math.round(data.splits.run_total_sec / 8);
          setExtractedSplits({
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
          });
        }

        toast.success(`Tempo extraído: ${data.formatted_time}`);
      }
    } catch {
      toast.info('Erro ao extrair. Preencha manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setExtractionConfidence(null);
    setExtractedSplits(EMPTY_SPLITS);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const calculateTotalSeconds = (): number | null => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return null;
    return h * 3600 + m * 60 + s;
  };

  const handleScreenshotSubmit = async () => {
    if (!user) return;
    const totalSeconds = calculateTotalSeconds();
    if (!totalSeconds) { toast.error('Preencha o tempo.'); return; }
    if (!eventName.trim()) { toast.error('Digite o nome do evento.'); return; }

    setIsSubmitting(true);
    try {
      let screenshotUrl: string | null = null;
      if (screenshotFile) {
        const ext = screenshotFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('result-screenshots').upload(fileName, screenshotFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('result-screenshots').getPublicUrl(fileName);
        screenshotUrl = publicUrl;
      }

      const insertPayload = {
        user_id: user.id,
        result_type: 'prova_oficial' as const,
        event_name: eventName.trim(),
        event_date: eventDate || null,
        time_in_seconds: totalSeconds,
        screenshot_url: screenshotUrl,
        race_category: raceCategory,
        completed: true,
        block_id: `prova_oficial_${Date.now()}`,
        workout_id: `prova_oficial_${Date.now()}`,
        benchmark_id: 'HYROX_OFFICIAL',
        ...extractedSplits,
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('benchmark_results')
        .insert(insertPayload)
        .select('id')
        .single();
      if (insertError) throw insertError;

      const resultId = insertedData?.id;
      if (resultId && hasGenderConfigured) {
        const alreadyExists = await hasExistingScores(resultId);
        if (!alreadyExists) {
          const division = raceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';
          const gender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';
          const hasReal = Object.values(extractedSplits).some(v => v !== null);
          const metrics = hasReal ? generateMetricsFromSplits(extractedSplits as any) : generateMetricsFromTotal(totalSeconds);
          await calculateAndSaveHyroxPercentiles(resultId, division, gender, metrics);
        }
      }

      toast.success('Prova oficial registrada! 🏆');
      setModalOpen(false);
      setEventName(''); setEventDate(''); setHours(''); setMinutes(''); setSeconds('');
      setRaceCategory('OPEN'); removeScreenshot();
      triggerExternalResultsRefresh();
      onResultAdded();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao salvar resultado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeDisplay = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return '--:--:--';
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* ── HISTORY (imported races on top) ── */}
      <BenchmarkHistory key={`provas-${refreshKey}`} filterType="prova_oficial" />

      {/* ── SEARCH HYROX (below imported races) ── */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Buscar Provas HYROX
            </h3>
            <p className="text-xs text-muted-foreground">
              Encontre e importe suas provas oficiais automaticamente.
            </p>
          </div>
          {/* Screenshot upload button */}
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Print</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Medal className="w-5 h-5 text-primary" />
                  Registrar Prova via Screenshot
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-4">
                {/* Race Category */}
                <div className="space-y-2">
                  <Label className="text-sm">Categoria</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['OPEN', 'PRO'] as const).map(cat => (
                      <motion.button
                        key={cat}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setRaceCategory(cat)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          raceCategory === cat
                            ? cat === 'PRO' ? 'border-amber-500 bg-amber-500/10' : 'border-purple-500 bg-purple-500/10'
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                      >
                        <p className={`font-semibold ${raceCategory === cat ? (cat === 'PRO' ? 'text-amber-500' : 'text-purple-500') : 'text-foreground'}`}>{cat}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {!hasGenderConfigured && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Configure seu sexo no perfil antes de registrar.</p>
                  </div>
                )}

                {/* Screenshot Upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Print do Resultado
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      IA extrai automaticamente
                    </span>
                  </Label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <AnimatePresence mode="wait">
                    {screenshotPreview ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <div className="relative rounded-xl overflow-hidden border border-border">
                          <img src={screenshotPreview} alt="Preview" className="w-full h-40 object-cover" />
                          <button onClick={removeScreenshot} className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground">
                            <X className="w-4 h-4" />
                          </button>
                          {extractionConfidence && (
                            <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
                              extractionConfidence === 'high' ? 'bg-green-500/90 text-white' :
                              extractionConfidence === 'medium' ? 'bg-amber-500/90 text-white' : 'bg-red-500/90 text-white'
                            }`}>
                              Confiança {extractionConfidence === 'high' ? 'alta' : extractionConfidence === 'medium' ? 'média' : 'baixa'}
                            </div>
                          )}
                        </div>
                        {isExtracting && (
                          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                            <span className="text-sm text-amber-500">Extraindo tempo...</span>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.button
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
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
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou insira manualmente</span>
                  </div>
                </div>

                {/* Event Name */}
                <div className="space-y-2">
                  <Label htmlFor="eventName" className="flex items-center gap-2"><FileText className="w-4 h-4" />Nome do Evento</Label>
                  <Input id="eventName" placeholder="Ex: HYROX São Paulo 2024" value={eventName} onChange={(e) => setEventName(e.target.value)} />
                </div>

                {/* Event Date */}
                <div className="space-y-2">
                  <Label htmlFor="eventDate" className="flex items-center gap-2"><Calendar className="w-4 h-4" />Data do Evento</Label>
                  <Input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>

                {/* Time Input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Timer className="w-4 h-4" />Tempo Final</Label>
                  <div className="flex items-center gap-2">
                    {[{ val: hours, set: setHours, label: 'Horas', ph: 'HH', max: 23 },
                      { val: minutes, set: setMinutes, label: 'Min', ph: 'MM', max: 59 },
                      { val: seconds, set: setSeconds, label: 'Seg', ph: 'SS', max: 59 }].map((f, i) => (
                      <div key={f.label} className="flex-1 flex flex-col items-center">
                        {i > 0 && <span className="sr-only">:</span>}
                        <Input type="number" placeholder={f.ph} min="0" max={f.max} value={f.val} onChange={(e) => f.set(e.target.value)} className="text-center" />
                        <p className="text-xs text-muted-foreground mt-1">{f.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-center font-mono text-lg text-primary">{formatTimeDisplay()}</p>
                </div>

                <Button onClick={handleScreenshotSubmit} disabled={isSubmitting || !hasGenderConfigured || !calculateTotalSeconds()} className="w-full gap-2">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><CheckCircle className="w-4 h-4" />Registrar Prova</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Digite seu nome completo..."
              className="h-11 rounded-xl pl-10"
              disabled={importingSelected}
            />
          </div>
          <Button
            onClick={() => { lastSearchedRef.current = ''; executeSearch(searchQuery); }}
            disabled={searching || searchQuery.trim().length < 2 || importingSelected}
            className="h-11 rounded-xl px-5"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Loading */}
        {searching && (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Buscando provas...</span>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {!searching && searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  {searchResults.length} prova(s) encontrada(s):
                </p>
                {searchResults.length > 1 && (
                  <button
                    onClick={toggleSelectAll}
                    disabled={importingSelected}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-40"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {selectedResults.size === searchResults.length ? 'Desmarcar' : 'Selecionar todas'}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {searchResults.map((result, idx) => {
                  const isChecked = selectedResults.has(result.result_url);
                  const isImporting = currentImportUrl === result.result_url;
                  return (
                    <motion.div
                      key={`${result.result_url}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked ? 'border-primary/40 bg-primary/5' : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30'
                      } ${importingSelected && !isImporting ? 'opacity-40' : ''}`}
                      onClick={() => !importingSelected && toggleResultSelection(result.result_url)}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        isChecked ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{result.event_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.athlete_name} {result.division ? `• ${result.division}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {result.time_formatted && (
                          <span className="text-sm font-bold text-primary">{result.time_formatted}</span>
                        )}
                        {isImporting && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Consent + Import */}
              {selectedResults.size > 0 && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox checked={consentGiven} onCheckedChange={(v) => setConsentGiven(v === true)} className="mt-0.5" />
                    <span className="text-xs text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                      <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-primary" />
                      Autorizo a utilização dos meus dados de performance dentro da plataforma Outlier.
                    </span>
                  </label>
                  <Button
                    onClick={handleImportSelected}
                    disabled={!consentGiven || importingSelected}
                    className="w-full h-11 rounded-xl font-bold"
                  >
                    {importingSelected ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando...</>
                    ) : (
                      <>Importar selecionadas ({selectedResults.size})</>
                    )}
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty */}
        {!searching && searchDone && searchResults.length === 0 && (
          <div className="py-6 text-center space-y-2">
            <Search className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Nenhuma prova nova encontrada. Todas já foram importadas ou tente outro nome.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
