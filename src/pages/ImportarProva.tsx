import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Flame, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import {
  calculateAndSaveHyroxPercentiles,
  hasExistingScores,
  type MetricInput,
} from '@/utils/hyroxPercentileCalculator';

// Same distribution used by AddResultModal
function generateMetricsFromTotal(totalSeconds: number): MetricInput[] {
  const runPercent = 0.42;
  const stationPercent = 0.48;
  const roxzonePercent = 0.10;
  const totalRunTime = totalSeconds * runPercent;
  const totalStationTime = totalSeconds * stationPercent;
  const totalRoxzone = totalSeconds * roxzonePercent;
  const runAvg = totalRunTime / 8;
  const stationWeights: Record<string, number> = {
    ski: 0.14, sled_push: 0.12, sled_pull: 0.10, bbj: 0.14,
    row: 0.14, farmers: 0.12, sandbag: 0.14, wallballs: 0.10,
  };
  return [
    { metric: 'run_avg', raw_time_sec: Math.round(runAvg), data_source: 'estimated' as const },
    { metric: 'roxzone', raw_time_sec: Math.round(totalRoxzone), data_source: 'estimated' as const },
    ...Object.entries(stationWeights).map(([key, weight]) => ({
      metric: key,
      raw_time_sec: Math.round(totalStationTime * weight),
      data_source: 'estimated' as const,
    })),
  ];
}

function extractIdpFromUrl(url: string): { idp: string | null; event: string | null } {
  try {
    const urlObj = new URL(url);
    const idp = urlObj.searchParams.get('idp');
    const event = urlObj.searchParams.get('event') || null;
    return { idp, event };
  } catch {
    const idpMatch = url.match(/idp=([^&]+)/);
    const eventMatch = url.match(/event=([^&]+)/);
    return {
      idp: idpMatch ? idpMatch[1] : null,
      event: eventMatch ? eventMatch[1] : null,
    };
  }
}

export default function ImportarProva() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { athleteConfig, triggerExternalResultsRefresh } = useOutlierStore();

  const [url, setUrl] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedUrl, setSavedUrl] = useState('');

  // Time fields
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');

  // Event info
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [raceCategory, setRaceCategory] = useState<'OPEN' | 'PRO'>('OPEN');

  const hasGenderConfigured = athleteConfig?.sexo && ['masculino', 'feminino'].includes(athleteConfig.sexo);

  const calculateTotalSeconds = (): number | null => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const s = parseInt(seconds) || 0;
    if (h === 0 && m === 0 && s === 0) return null;
    return h * 3600 + m * 60 + s;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Faça login para continuar.');
      return;
    }
    if (!url.trim()) {
      toast.error('Cole o link do seu resultado HYROX.');
      return;
    }
    const { idp, event } = extractIdpFromUrl(url.trim());
    if (!idp) {
      toast.error('Link inválido. Abra seu resultado oficial e copie o link da página.');
      return;
    }
    if (!agreed) {
      toast.error('Aceite a autorização para continuar.');
      return;
    }
    const totalSeconds = calculateTotalSeconds();
    if (!totalSeconds) {
      toast.error('Preencha o tempo total da prova.');
      return;
    }
    if (!eventName.trim()) {
      toast.error('Preencha o nome do evento.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Insert into benchmark_results (same as AddResultModal for prova_oficial)
      const insertPayload = {
        user_id: user.id,
        result_type: 'prova_oficial',
        event_name: eventName.trim(),
        event_date: eventDate || null,
        time_in_seconds: totalSeconds,
        screenshot_url: url.trim(), // store source URL here
        race_category: raceCategory,
        completed: true,
        block_id: `prova_oficial_${Date.now()}`,
        workout_id: `prova_oficial_${Date.now()}`,
        benchmark_id: 'HYROX_OFFICIAL',
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('benchmark_results')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('Este resultado já foi importado.');
        } else {
          throw insertError;
        }
        return;
      }

      const resultId = insertedData?.id;

      // 2. Also save to race_results for link tracking
      await supabase.from('race_results').insert({
        athlete_id: user.id,
        hyrox_idp: idp,
        hyrox_event: event,
        source_url: url.trim(),
      } as any).single();

      // 3. Trigger automatic analysis (same pipeline as AddResultModal)
      if (resultId && hasGenderConfigured) {
        const alreadyExists = await hasExistingScores(resultId);
        if (!alreadyExists) {
          const metrics = generateMetricsFromTotal(totalSeconds);
          const division = raceCategory === 'PRO' ? 'HYROX PRO' : 'HYROX';
          const gender = athleteConfig?.sexo === 'feminino' ? 'F' : 'M';
          await calculateAndSaveHyroxPercentiles(resultId, division, gender, metrics);
        }
      }

      triggerExternalResultsRefresh();
      setSavedUrl(url.trim());
      setSuccess(true);
      toast.success('Prova oficial registrada! 🏆');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar resultado.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Resultado salvo com sucesso</h1>
            <p className="text-muted-foreground">
              🔥 Agora vamos encontrar seus gargalos de prova.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(savedUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver resultado oficial
              </Button>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold rounded-2xl"
                onClick={() => navigate('/app')}
              >
                Gerar diagnóstico OUTLIER
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Importar Resultado HYROX</h1>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            {/* URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Link do resultado HYROX</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Cole aqui o link do seu resultado HYROX"
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Ex: https://results.hyrox.com/...&idp=XXXXX
              </p>
            </div>

            {/* Event name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome do evento</label>
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ex: HYROX São Paulo 2026"
                className="h-10 rounded-xl"
              />
            </div>

            {/* Date + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data</label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Categoria</label>
                <div className="flex gap-2">
                  {(['OPEN', 'PRO'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setRaceCategory(cat)}
                      className={`flex-1 h-10 rounded-xl text-sm font-bold transition-colors ${
                        raceCategory === cat
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tempo total</label>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="0"
                    className="h-12 text-center text-lg font-bold rounded-xl"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="00"
                    className="h-12 text-center text-lg font-bold rounded-xl"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                    placeholder="00"
                    className="h-12 text-center text-lg font-bold rounded-xl"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">s</span>
                </div>
              </div>
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="consent"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <label htmlFor="consent" className="text-sm text-muted-foreground cursor-pointer">
                Autorizo uso do meu resultado para análise de performance.
              </label>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || !url.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold rounded-2xl"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Flame className="w-5 h-5 mr-2" />
                  IMPORTAR RESULTADO
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
