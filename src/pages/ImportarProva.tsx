import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Flame, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useRaceResults } from '@/hooks/useRaceResults';

function extractIdpFromUrl(url: string): { idp: string | null; event: string | null } {
  try {
    const urlObj = new URL(url);
    const idp = urlObj.searchParams.get('idp');
    const event = urlObj.searchParams.get('event') || urlObj.pathname.split('/').filter(Boolean)[0] || null;
    return { idp, event };
  } catch {
    // Try regex fallback
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
  const { addResult } = useRaceResults();
  const [url, setUrl] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedUrl, setSavedUrl] = useState('');

  const handleSubmit = async () => {
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

    setSubmitting(true);
    const result = await addResult({
      hyrox_idp: idp,
      hyrox_event: event,
      source_url: url.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      setSavedUrl(url.trim());
      setSuccess(true);
      toast.success('Resultado salvo com sucesso!');
    } else {
      toast.error(result.error || 'Erro ao salvar resultado.');
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
      {/* Header */}
      <header className="px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Importar Resultado HYROX</h1>
      </header>

      {/* Form */}
      <main className="flex-1 flex items-start justify-center px-4 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Link do resultado HYROX
              </label>
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

            <Button
              onClick={handleSubmit}
              disabled={submitting || !url.trim()}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-base font-bold rounded-2xl"
            >
              {submitting ? 'Importando...' : (
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
