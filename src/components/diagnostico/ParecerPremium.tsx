import { Crosshair, TrendingUp } from 'lucide-react';
import type { DiagnosticoMelhoria, DiagnosticoResumo } from './types';
import { secondsToTime } from './types';

interface Props {
  resumo: DiagnosticoResumo;
  diagnosticos: DiagnosticoMelhoria[];
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-primary">{children}</span>;
}

export default function ParecerPremium({ resumo, diagnosticos }: Props) {
  // Find the critical bottleneck: station with highest improvement_value
  const gargalo = diagnosticos.length > 0
    ? diagnosticos.reduce((worst, d) =>
        d.improvement_value > worst.improvement_value ? d : worst
      , diagnosticos[0])
    : null;

  const nome = resumo.nome_atleta || 'Atleta';
  const evento = resumo.evento || 'HYROX';
  const finish = resumo.finish_time || '--:--';
  const divisao = resumo.divisao || 'Open';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04]">
      {/* Decorative glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/[0.06] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-primary/[0.04] blur-2xl pointer-events-none" />

      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 border border-primary/20">
            <Crosshair className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wide">
              Parecer de Performance
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
              Análise Inteligente · Dados Reais
            </p>
          </div>
        </div>

        {/* Body text */}
        {gargalo ? (
          <div className="text-[15px] leading-relaxed text-muted-foreground space-y-4">
            <p>
              Fala, <Highlight>{nome}</Highlight>! Você finalizou o{' '}
              <Highlight>{evento}</Highlight> com a marca de{' '}
              <Highlight>{finish}</Highlight>. Nós dissecamos a sua prova e
              comparamos cada split seu contra a elite (Top 1%) da categoria{' '}
              <Highlight>{divisao}</Highlight>.
            </p>

            <p>
              Os dados não mentem: identificamos exatamente onde a sua performance
              está vazando. O seu maior gargalo atual é no{' '}
              <Highlight>{gargalo.movement}</Highlight>. Apenas ajustando a sua
              eficiência neste movimento específico, você tem potencial imediato
              para cortar{' '}
              <Highlight>{secondsToTime(gargalo.improvement_value)}</Highlight>{' '}
              do seu tempo final.
            </p>

            <p>
              A estratégia agora não é treinar mais, é treinar mais inteligente.
              Vamos focar em transformar essa fraqueza na sua maior vantagem
              competitiva.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted-foreground bg-primary/[0.04] rounded-xl p-4 border border-primary/10">
            <TrendingUp className="w-5 h-5 text-primary shrink-0" />
            <p>
              Ainda não temos dados de diagnóstico suficientes para gerar o seu
              parecer personalizado. Importe uma prova para desbloquear a análise
              completa!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
