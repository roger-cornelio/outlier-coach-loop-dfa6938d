import { useState } from 'react';
import { LevelUpModal } from '@/components/LevelUpModal';
import type { AthleteStatus } from '@/types/outlier';

const LEVELS: { status: AthleteStatus; label: string; color: string }[] = [
  { status: 'open', label: 'Simular OPEN', color: 'bg-violet-600 hover:bg-violet-700' },
  { status: 'pro', label: 'Simular PRO', color: 'bg-amber-500 hover:bg-amber-600' },
  { status: 'elite', label: 'Simular ELITE', color: 'bg-yellow-400 hover:bg-yellow-500 text-zinc-900' },
];

export default function DemoLevelUp() {
  const [active, setActive] = useState<AthleteStatus | null>(null);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-4">Demo — Level Up Modal</h1>
      <p className="text-muted-foreground text-sm mb-8">Clique em um nível para ver o modal completo</p>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {LEVELS.map(({ status, label, color }) => (
          <button
            key={status}
            onClick={() => {
              localStorage.removeItem('outlier_level_up_history');
              setActive(status);
            }}
            className={`px-6 py-4 rounded-xl font-semibold text-white uppercase tracking-wider transition-colors ${color}`}
          >
            {label}
          </button>
        ))}
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
