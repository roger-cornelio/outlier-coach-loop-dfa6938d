import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRaceResults } from '@/hooks/useRaceResults';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ImportHyroxCTA() {
  const navigate = useNavigate();
  const { latestResult, loading } = useRaceResults();

  if (loading) return null;

  // CASE 2: Has result — show summary
  if (latestResult) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-5 space-y-4"
      >
        <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
          <Flame className="w-4 h-4" />
          Última prova HYROX
        </h3>
        <div className="space-y-1">
          {latestResult.hyrox_event && (
            <p className="text-foreground font-medium">{latestResult.hyrox_event}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Importado em {format(parseISO(latestResult.created_at), "dd 'de' MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => window.open(latestResult.source_url, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Ver resultado
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate('/importar-prova')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova prova
          </Button>
        </div>
      </motion.section>
    );
  }

  // CASE 1: No result — big orange CTA
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl bg-primary p-6 space-y-4 cursor-pointer"
      onClick={() => navigate('/importar-prova')}
    >
      <h3 className="text-xl font-black text-primary-foreground flex items-center gap-2">
        <Flame className="w-6 h-6" />
        IMPORTAR SUA PROVA HYROX
      </h3>
      <p className="text-primary-foreground/80 text-sm">
        Cole o link do seu resultado oficial e desbloqueie seu diagnóstico OUTLIER.
      </p>
      <Button
        className="w-full h-14 bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-base font-bold rounded-2xl"
      >
        IMPORTAR RESULTADO
      </Button>
      <p className="text-center text-xs text-primary-foreground/60">
        Leva menos de 30 segundos.
      </p>
    </motion.section>
  );
}
