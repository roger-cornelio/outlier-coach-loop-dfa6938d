/**
 * EvolutionTab — Container principal da aba Evolução
 * Renderiza FatigueIndexCard + TargetSplitsTable
 */

import { FatigueIndexCard } from './FatigueIndexCard';
import { TargetSplitsTable } from './TargetSplitsTable';
import { TrendingUp } from 'lucide-react';

export function EvolutionTab() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <TrendingUp className="w-6 h-6 text-amber-500" />
          Sua Evolução
        </h1>
        <p className="text-sm text-muted-foreground">
          Análise de fadiga e metas por estação para sua próxima prova
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <FatigueIndexCard />
        </div>
        <div className="lg:col-span-2">
          <TargetSplitsTable />
        </div>
      </div>
    </div>
  );
}
