import { Timer } from 'lucide-react';
import type { Split } from './types';

interface Props {
  splits: Split[];
}

export default function SplitTimesGrid({ splits }: Props) {
  if (splits.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Timer className="w-5 h-5 text-primary" />
        Tempos & Parciais
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {splits.map((split) => (
          <div
            key={split.id}
            className="bg-card border border-border rounded-xl p-4 text-center space-y-1"
          >
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
              {split.split_name}
            </p>
            <p className="text-xl font-bold text-primary">
              {split.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
