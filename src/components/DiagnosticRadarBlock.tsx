/**
 * DiagnosticRadarBlock - Diagnóstico em duas camadas (Valências Fisiológicas)
 * 
 * CAMADA 1 - Perfil Fisiológico (Radar Principal):
 * - 6 valências fisiológicas HYROX obrigatórias
 * - Radar visualmente maior, estilo premium
 * - Sem números ou escala visível
 * 
 * CAMADA 2 - Diagnóstico por Estação (Detalhado):
 * - Barras horizontais para as 9 estações HYROX
 * - Mesma escala visual para todas
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar, 
  ResponsiveContainer 
} from 'recharts';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { DiagnosticStationsBars } from './DiagnosticStationsBar';
import { Button } from './ui/button';

interface DiagnosticRadarBlockProps {
  scores: CalculatedScore[];
  loading?: boolean;
  hasData: boolean;
}

// Agregação de métricas em 6 valências fisiológicas HYROX
interface PhysiologicalDimension {
  name: string;
  shortName: string;
  value: number;
  fullMark: 100;
}

/**
 * Mapeia métricas HYROX para 6 valências fisiológicas reais
 * 
 * 1. Resistência Cardiovascular / Aeróbica → Run
 * 2. Força & Resistência Muscular Local → Sled Push, Sled Pull, Farmers
 * 3. Potência & Vigor → SkiErg, Row (power output)
 * 4. Capacidade Anaeróbica → BBJ, Wall Balls (alta intensidade)
 * 5. Core & Estabilidade → Sandbag Lunges
 * 6. Coordenação & Eficiência sob Fadiga → Média geral (consistência)
 */
function aggregateToPhysiologicalDimensions(scores: CalculatedScore[]): PhysiologicalDimension[] {
  if (!scores || scores.length === 0) return [];

  const scoreMap = new Map<string, number>();
  scores.forEach(s => {
    scoreMap.set(s.metric, s.percentile_value);
  });

  // Helper para calcular média de métricas
  const avgMetrics = (metrics: string[]): number => {
    const values = metrics
      .map(m => scoreMap.get(m))
      .filter((v): v is number => v !== undefined && v !== null);
    return values.length > 0 
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 50;
  };

  // 6 Valências Fisiológicas HYROX (obrigatórias)
  const dimensions: { name: string; shortName: string; metrics: string[] }[] = [
    { 
      name: 'Resistência Cardiovascular', 
      shortName: 'Cardio',
      metrics: ['run_avg'] 
    },
    { 
      name: 'Força & Resistência Muscular', 
      shortName: 'Força',
      metrics: ['sled_push', 'sled_pull', 'farmers'] 
    },
    { 
      name: 'Potência & Vigor', 
      shortName: 'Potência',
      metrics: ['ski', 'row'] 
    },
    { 
      name: 'Capacidade Anaeróbica', 
      shortName: 'Anaeróbica',
      metrics: ['bbj', 'wallballs'] 
    },
    { 
      name: 'Core & Estabilidade', 
      shortName: 'Core',
      metrics: ['sandbag'] 
    },
    { 
      name: 'Coordenação sob Fadiga', 
      shortName: 'Eficiência',
      metrics: ['run_avg', 'ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs'] 
    }
  ];

  return dimensions.map(dim => ({
    name: dim.name,
    shortName: dim.shortName,
    value: avgMetrics(dim.metrics),
    fullMark: 100
  }));
}

export function DiagnosticRadarBlock({ 
  scores, 
  loading = false, 
  hasData 
}: DiagnosticRadarBlockProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Agregar scores em 6 valências fisiológicas
  const radarData = useMemo(() => aggregateToPhysiologicalDimensions(scores), [scores]);

  // Estado carregando
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          PERFIL FISIOLÓGICO
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground/60 text-sm">Carregando diagnóstico...</p>
        </div>
      </motion.div>
    );
  }

  // Estado vazio
  if (!hasData || radarData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          PERFIL FISIOLÓGICO
        </h3>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Activity className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Lance seu primeiro simulado ou prova oficial para ver seu perfil fisiológico completo.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-6 border-l-4 border-l-primary"
    >
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-2">
        PERFIL FISIOLÓGICO
      </h3>

      {/* CAMADA 1 - Perfil Fisiológico (Radar Grande) */}
      <div className="h-80 sm:h-96 md:h-[28rem]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            {/* Grid sutil sem números */}
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.25}
              gridType="polygon"
            />
            
            {/* Labels das valências - tipografia legível */}
            <PolarAngleAxis
              dataKey="shortName"
              tick={{ 
                fill: 'hsl(var(--foreground))',
                fontSize: 11,
                fontWeight: 500
              }}
              tickLine={false}
            />
            
            {/* Área preenchida - cor OUTLIER premium */}
            <Radar
              name="Perfil"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              dot={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Texto explicativo obrigatório */}
      <p className="text-sm text-muted-foreground mt-2 text-center">
        Perfil fisiológico baseado na sua última prova registrada.
      </p>

      {/* Toggle para Camada 2 */}
      <div className="mt-5 pt-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Ocultar análise por estação
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver análise detalhada por estação
            </>
          )}
        </Button>
      </div>

      {/* CAMADA 2 - Diagnóstico por Estação (Barras) */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <DiagnosticStationsBars scores={scores} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
