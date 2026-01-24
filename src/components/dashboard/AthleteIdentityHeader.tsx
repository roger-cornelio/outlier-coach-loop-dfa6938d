/**
 * AthleteIdentityHeader - Header de identidade do atleta para Dashboard V1
 * 
 * Função: gerar status, pertencimento e aspiração.
 * - Nome do atleta em destaque (headline forte)
 * - Badge de nível competitivo (ex: HYROX PRO)
 * - Ícone de coroa
 * - Linguagem aspiracional e competitiva
 */

import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { StatusCrown } from '@/components/ui/StatusCrown';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';

// Mapeamento de status para label aspiracional
const ASPIRATIONAL_LABELS: Record<AthleteStatus, string> = {
  iniciante: 'Começando a jornada',
  intermediario: 'Em evolução constante',
  avancado: 'Atleta dedicado',
  hyrox_open: 'Elite competitiva',
  hyrox_pro: 'Nível mundial',
};

// Cor do status para coroa
const STATUS_COLORS: Record<AthleteStatus, string> = {
  iniciante: 'text-slate-400',
  intermediario: 'text-blue-400',
  avancado: 'text-purple-400',
  hyrox_open: 'text-amber-500',
  hyrox_pro: 'text-amber-400',
};

// Mapeamento de training_level para categoria de competição
const COMPETITION_CATEGORY: Record<string, string> = {
  'base': 'HYROX OPEN',
  'progressivo': 'HYROX OPEN',
  'performance': 'HYROX PRO',
};

export function AthleteIdentityHeader() {
  const { profile } = useAuth();
  const { athleteConfig } = useOutlierStore();
  const { status: athleteStatus } = useAthleteStatus();

  const displayName = profile?.name || profile?.email?.split('@')[0] || 'Atleta';
  const aspirationalLabel = ASPIRATIONAL_LABELS[athleteStatus] || 'Em evolução';
  const crownColor = STATUS_COLORS[athleteStatus] || 'text-amber-500';
  const competitionCategory = athleteConfig?.trainingLevel 
    ? COMPETITION_CATEGORY[athleteConfig.trainingLevel] || 'HYROX'
    : 'HYROX';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center gap-4 py-6"
    >
      {/* Nome do atleta - headline forte */}
      <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight font-bold text-foreground">
        {displayName}
      </h1>

      {/* Badge de nível competitivo */}
      <div className="flex items-center gap-3">
        {/* Coroa com cor do status */}
        <StatusCrown 
          size="lg" 
          colorClass={crownColor}
          className="drop-shadow-md"
        />
        
        {/* Badge de categoria */}
        <span className="font-display text-lg sm:text-xl tracking-wide text-amber-500 font-semibold">
          {competitionCategory}
        </span>
      </div>

      {/* Subtítulo aspiracional */}
      <p className="text-muted-foreground text-sm sm:text-base">
        {aspirationalLabel}
      </p>
    </motion.div>
  );
}
