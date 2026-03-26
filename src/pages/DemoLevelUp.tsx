import { useState } from 'react';
import { LevelUpModal } from '@/components/LevelUpModal';
import type { AthleteStatus } from '@/types/outlier';
import { ShieldCrest } from '@/components/ui/ShieldCrest';
import type { ExtendedLevelKey } from '@/hooks/useJourneyProgress';

interface LevelOption {
  status: AthleteStatus;
  label: string;
  color: string;
}

const CATEGORY_LEVELS: LevelOption[] = [
  { status: 'open', label: 'Simular OPEN', color: 'bg-violet-600 hover:bg-violet-700' },
  { status: 'pro', label: 'Simular PRO', color: 'bg-amber-500 hover:bg-amber-600' },
  { status: 'elite', label: 'Simular ELITE', color: 'bg-yellow-400 hover:bg-yellow-500 text-zinc-900' },
];

const OUTLIER_LEVELS: (LevelOption & { levelKey: ExtendedLevelKey })[] = [
  { status: 'open', label: 'OPEN OUTLIER', color: 'border border-violet-500 hover:bg-violet-500/20 text-violet-400', levelKey: 'OPEN' },
  { status: 'pro', label: 'PRO OUTLIER', color: 'border border-amber-500 hover:bg-amber-500/20 text-amber-400', levelKey: 'PRO' },
  { status: 'elite', label: 'ELITE OUTLIER', color: 'border border-yellow-400 hover:bg-yellow-400/20 text-yellow-400', levelKey: 'ELITE' },
];

export default function DemoLevelUp() {
  const [active, setActive] = useState<AthleteStatus | null>(null);

  const handleClick = (status: AthleteStatus) => {
    localStorage.removeItem('outlier_level_up_history');
    setActive(status);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-2">Demo — Level Up Modal</h1>
      <p className="text-muted-foreground text-sm mb-6">Clique em um nível para ver o modal completo</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        {/* Categoria */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Categoria</h2>
          {CATEGORY_LEVELS.map(({ status, label, color }) => (
            <button
              key={`cat-${status}`}
              onClick={() => handleClick(status)}
              className={`px-6 py-4 rounded-xl font-semibold text-white uppercase tracking-wider transition-colors ${color}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Outlier */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Atleta Outlier</h2>
          {OUTLIER_LEVELS.map(({ status, label, color, levelKey }) => (
            <button
              key={`out-${status}`}
              onClick={() => handleClick(status)}
              className={`px-6 py-4 rounded-xl font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-3 ${color}`}
            >
              <ShieldCrest level={levelKey} active className="w-7 h-7" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {active && (
        <LevelUpModal
          isOpen={true}
          newStatus={active}
          onContinue={() => setActive(null)}
        />
      )}
    </div>
  );
}
