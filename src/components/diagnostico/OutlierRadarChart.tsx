import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { DiagnosticoMelhoria } from './types';

interface Props {
  diagnosticos: DiagnosticoMelhoria[];
}

interface CategoryDef {
  label: string;
  keywords: string[];
}

const CATEGORIES: CategoryDef[] = [
  { label: 'Cardio', keywords: ['run', 'rowing', 'row'] },
  { label: 'Força', keywords: ['sled push', 'sled pull'] },
  { label: 'Potência', keywords: ['wall ball'] },
  { label: 'Anaeróbica', keywords: ['ski', 'bbj', 'burpee'] },
  { label: 'Core', keywords: ['sandbag', 'farmers', 'farmer'] },
  { label: 'Eficiência', keywords: ['roxzone', 'rox zone'] },
];

function matchCategory(movement: string, keywords: string[]): boolean {
  const m = movement.toLowerCase();
  return keywords.some(k => m.includes(k));
}

function buildRadarData(diagnosticos: DiagnosticoMelhoria[]) {
  return CATEGORIES.map(cat => {
    const matched = diagnosticos.filter(d => matchCategory(d.movement, cat.keywords));
    let score: number;
    if (matched.length > 0) {
      const avg = matched.reduce((sum, d) => sum + d.percentage, 0) / matched.length;
      score = Math.max(0, Math.min(100, 100 - avg));
    } else {
      // fallback: average of all
      const allAvg = diagnosticos.reduce((sum, d) => sum + d.percentage, 0) / (diagnosticos.length || 1);
      score = Math.max(0, Math.min(100, 100 - allAvg));
    }
    return { category: cat.label, score: Math.round(score) };
  });
}

export default function OutlierRadarChart({ diagnosticos }: Props) {
  if (diagnosticos.length === 0) return null;

  const data = buildRadarData(diagnosticos);

  return (
    <div className="space-y-2">
      <p className="text-center text-sm text-muted-foreground">
        Seus pontos fortes e fracos impactam diretamente seu Outlier Score.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="category" tick={{ fill: '#e5e7eb', fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.4}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
