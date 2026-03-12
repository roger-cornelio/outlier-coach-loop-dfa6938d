import { Crosshair, ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import type { DiagnosticoMelhoria, DiagnosticoResumo } from './types';
import { secondsToTime } from './types';

interface Props {
  resumo: DiagnosticoResumo;
  diagnosticos: DiagnosticoMelhoria[];
  onToggleFullAnalysis?: () => void;
  showFullAnalysis?: boolean;
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-primary">{children}</span>;
}

/** Check if texto_ia contains Claude-style markdown (### headers) */
function isMarkdownAnalysis(text: string | null): boolean {
  if (!text) return false;
  return text.includes('###');
}

export default function ParecerPremium({ resumo, diagnosticos, onToggleFullAnalysis, showFullAnalysis }: Props) {
  const textoIa = resumo.texto_ia;
  const hasClaudeAnalysis = isMarkdownAnalysis(textoIa);

  // Sort by improvement_value descending, pick top 3
  const sorted = [...diagnosticos]
    .filter(d => d.improvement_value > 0)
    .sort((a, b) => b.improvement_value - a.improvement_value);

  const gargalo = sorted[0] || null;
  const top3 = sorted.slice(0, 3);

  const nome = resumo.nome_atleta || 'Atleta';
  const evento = resumo.evento || 'HYROX';
  const finish = resumo.finish_time || '--:--';
  const divisao = resumo.divisao || 'Open';

  const totalPotential = top3.reduce((sum, d) => sum + d.improvement_value, 0);

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
              Parecer OUTLIER
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
              {hasClaudeAnalysis ? 'Análise por IA · Treinador de Elite' : 'Inteligência de Performance · Dados Reais'}
            </p>
          </div>
        </div>

        {/* Claude AI Markdown Analysis */}
        {hasClaudeAnalysis ? (
          <div className="prose prose-sm max-w-none parecer-markdown">
            <ReactMarkdown
              components={{
                h3: ({ children }) => (
                  <h3 className="text-orange-500 font-extrabold text-sm uppercase tracking-wide mt-5 mb-2 flex items-center gap-1.5">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-white/90 text-[15px] leading-relaxed mb-3">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="text-orange-400 font-bold">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-3 text-white/80 text-sm">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-3 text-white/80 text-sm">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-white/80 text-sm leading-relaxed">
                    {children}
                  </li>
                ),
              }}
            >
              {textoIa!}
            </ReactMarkdown>
          </div>
        ) : (
          /* Fallback: template-based analysis */
          <>
            {gargalo ? (
              <div className="text-[15px] leading-relaxed text-muted-foreground space-y-4">
                <p>
                  Fala, <Highlight>{nome}</Highlight>! Você finalizou o{' '}
                  <Highlight>{evento}</Highlight> com a marca de{' '}
                  <Highlight>{finish}</Highlight>. Nós dissecamos a sua prova e
                  comparamos cada split seu contra a referência OUTLIER da categoria{' '}
                  <Highlight>{divisao}</Highlight> — o padrão que separa quem é da média de quem é fora da curva.
                </p>

                <p>
                  Os dados não mentem: identificamos exatamente onde a sua performance
                  está vazando. O seu maior gargalo atual é no{' '}
                  <Highlight>{gargalo.movement}</Highlight>, onde você perdeu{' '}
                  <Highlight>{secondsToTime(gargalo.improvement_value)}</Highlight>{' '}
                  para a Meta OUTLIER.
                </p>

                {/* Top 3 critical stations */}
                {top3.length > 1 && (
                  <div className="rounded-xl border border-primary/10 bg-primary/[0.03] p-4 space-y-3">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-primary" />
                      Estações Críticas
                    </p>
                    <div className="space-y-2">
                      {top3.map((d, i) => (
                        <div key={d.movement} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-extrabold shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-sm font-semibold text-foreground truncate">
                              {d.movement}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs">
                            <span className="text-muted-foreground">
                              Você: <span className="font-semibold text-foreground">{secondsToTime(d.your_score)}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Meta: <span className="font-semibold text-primary">{secondsToTime(d.top_1)}</span>
                            </span>
                            <span className="font-bold text-destructive">
                              −{secondsToTime(d.improvement_value)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {totalPotential > 0 && (
                      <p className="text-xs text-muted-foreground pt-1 border-t border-primary/10">
                        Potencial combinado: cortar{' '}
                        <Highlight>{secondsToTime(totalPotential)}</Highlight>{' '}
                        do seu tempo final focando apenas nessas {top3.length} estações.
                      </p>
                    )}
                  </div>
                )}

                <p>
                  A estratégia agora não é treinar mais, é treinar mais inteligente.
                  Vamos focar em transformar essas fraquezas na sua maior vantagem
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
          </>
        )}

        {/* Toggle full analysis */}
        {(gargalo || hasClaudeAnalysis) && onToggleFullAnalysis && (
          <Button
            variant="outline"
            onClick={onToggleFullAnalysis}
            className="w-full border-primary/20 hover:bg-primary/10 text-primary font-bold gap-2"
          >
            {showFullAnalysis ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Fechar análise completa
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Ver análise completa da sua prova
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
