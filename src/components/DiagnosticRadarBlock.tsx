/**
 * DiagnosticRadarBlock - Radar Chart de diagnóstico da última prova
 * 
 * DESIGN GUIDELINES:
 * - Máximo 6 eixos agregados (Run, Sled Push, Sled Pull, Carry, Engine, Pacing)
 * - Sem números visíveis na escala
 * - Estilo premium, técnico, não gamificado
 * - Texto explicativo obrigatório
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar, 
  ResponsiveContainer 
} from 'recharts';
import { Activity } from 'lucide-react';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';

interface DiagnosticRadarBlockProps {
  scores: CalculatedScore[];
  loading?: boolean;
  hasData: boolean;
}

// Agregação de métricas em 6 dimensões principais
interface AggregatedDimension {
  name: string;
  value: number;
  fullMark: 100;
}

// Mapeia métricas HYROX para dimensões agregadas
function aggregateScores(scores: CalculatedScore[]): AggregatedDimension[] {
  if (!scores || scores.length === 0) return [];

  // Mapa de métricas para valores
  const scoreMap = new Map<string, number>();
  scores.forEach(s => {
    scoreMap.set(s.metric, s.percentile_value);
  });

  // Agregação em 6 dimensões principais
  const dimensions: { name: string; metrics: string[] }[] = [
    { name: 'Run', metrics: ['run_avg'] },
    { name: 'Sled Push', metrics: ['sled_push'] },
    { name: 'Sled Pull', metrics: ['sled_pull'] },
    { name: 'Carry / Grip', metrics: ['farmers', 'sandbag'] },
    { name: 'Engine', metrics: ['ski', 'row'] },
    { name: 'Stations', metrics: ['bbj', 'wallballs'] }
  ];

  return dimensions.map(dim => {
    const values = dim.metrics
      .map(m => scoreMap.get(m))
      .filter((v): v is number => v !== undefined && v !== null);
    
    const avg = values.length > 0 
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 50; // Default neutro

    return {
      name: dim.name,
      value: avg,
      fullMark: 100
    };
  });
}

export function DiagnosticRadarBlock({ 
  scores, 
  loading = false, 
  hasData 
}: DiagnosticRadarBlockProps) {
  // Agregar scores em 6 dimensões
  const radarData = useMemo(() => aggregateScores(scores), [scores]);

  // Estado vazio ou carregando
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          DIAGNÓSTICO
        </h3>
        <div className="h-48 flex items-center justify-center">
          <p className="text-muted-foreground/60 text-sm">Carregando diagnóstico...</p>
        </div>
      </motion.div>
    );
  }

  if (!hasData || radarData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          DIAGNÓSTICO
        </h3>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Activity className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Lance seu primeiro simulado ou prova oficial para ver seu diagnóstico técnico.
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
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-4">
        DIAGNÓSTICO
      </h3>

      {/* Radar Chart - estilo premium, sem escalas visíveis */}
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            {/* Grid sutil sem números */}
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.3}
              gridType="polygon"
            />
            
            {/* Labels dos eixos - sem valores numéricos */}
            <PolarAngleAxis
              dataKey="name"
              tick={{ 
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11,
                fontWeight: 500
              }}
              tickLine={false}
            />
            
            {/* Área preenchida - cor OUTLIER premium */}
            <Radar
              name="Performance"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="hsl(var(--primary))"
              fillOpacity={0.25}
              dot={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Texto explicativo obrigatório */}
      <p className="text-sm text-muted-foreground mt-4 text-center">
        Este gráfico mostra seu perfil atual nas principais demandas da prova.
      </p>
    </motion.div>
  );
}
