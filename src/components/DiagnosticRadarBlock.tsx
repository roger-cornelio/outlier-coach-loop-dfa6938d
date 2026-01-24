/**
 * DiagnosticRadarBlock - Diagnóstico em duas camadas
 * 
 * CAMADA 1 - Perfil do Atleta (Visão Executiva):
 * - Radar Chart com 5 dimensões agregadas
 * - Sem números ou escala visível
 * - Estilo premium e técnico
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

// Agregação de métricas em 5 dimensões principais (Camada 1)
interface AggregatedDimension {
  name: string;
  value: number;
  fullMark: 100;
}

// Mapeia métricas HYROX para 5 dimensões agregadas
function aggregateScores(scores: CalculatedScore[]): AggregatedDimension[] {
  if (!scores || scores.length === 0) return [];

  // Mapa de métricas para valores
  const scoreMap = new Map<string, number>();
  scores.forEach(s => {
    scoreMap.set(s.metric, s.percentile_value);
  });

  // Agregação em 5 dimensões principais (conforme spec)
  const dimensions: { name: string; metrics: string[] }[] = [
    { name: 'Run', metrics: ['run_avg'] },
    { name: 'Sled', metrics: ['sled_push', 'sled_pull'] },
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
  const [showDetails, setShowDetails] = useState(false);
  
  // Agregar scores em 5 dimensões para o radar
  const radarData = useMemo(() => aggregateScores(scores), [scores]);

  // Estado carregando
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

  // Estado vazio
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

      {/* CAMADA 1 - Perfil do Atleta (Radar) */}
      <div className="h-52 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
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
      <p className="text-sm text-muted-foreground mt-3 text-center">
        Perfil geral baseado na sua última prova.
      </p>

      {/* Toggle para Camada 2 */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Ocultar detalhes por estação
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver detalhes por estação
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
