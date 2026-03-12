import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { CalculatedScore } from '@/utils/hyroxPercentileCalculator';

interface Props {
  scores: CalculatedScore[];
}

interface CategoryDef {
  label: string;
  metrics: string[];
}

const CATEGORIES: CategoryDef[] = [
  { label: 'Cardio', metrics: ['run_avg', 'row'] },
  { label: 'Força', metrics: ['sled_push', 'sled_pull'] },
  { label: 'Potência', metrics: ['wallballs'] },
  { label: 'Anaeróbica', metrics: ['ski', 'bbj'] },
  { label: 'Core', metrics: ['sandbag', 'farmers'] },
  { label: 'Eficiência', metrics: ['roxzone'] },
];

function buildRadarData(scores: CalculatedScore[]) {
  const scoreMap = new Map(scores.map(s => [s.metric, s.percentile_value]));

  return CATEGORIES.map(cat => {
    const values = cat.metrics
      .map(m => scoreMap.get(m))
      .filter((v): v is number => v != null);

    const score = values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 50;

    const clamped = Math.max(0, Math.min(100, score));
    // Visual floor: prevents low percentiles from collapsing to center (FIFA/NBA2K pattern)
    const visualScore = Math.round(25 + clamped * 0.75);

    return { category: cat.label, score: clamped, visualScore };
  });
}

export default function OutlierRadarChart({ scores }: Props) {
  if (scores.length === 0) return null;

  const data = buildRadarData(scores);

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
            dataKey="visualScore"
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
