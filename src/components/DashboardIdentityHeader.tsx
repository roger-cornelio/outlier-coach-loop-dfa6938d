/**
 * DashboardIdentityHeader - Header de identidade do atleta
 * 
 * Função: Gerar status, pertencimento e aspiração
 * 
 * Conteúdo:
 * - Nome do atleta em destaque (headline forte)
 * - Badge de nível competitivo (HYROX PRO, HYROX OPEN, etc.)
 * - Ícone de coroa
 * - Subtítulo aspiracional
 * 
 * Linguagem: aspiracional e competitiva, sem textos técnicos
 */

import { motion } from 'framer-motion';
import { StatusCrownPreset } from '@/components/ui/StatusCrownPreset';
import type { AthleteStatus } from '@/types/outlier';

interface DashboardIdentityHeaderProps {
  athleteName: string;
  status: AthleteStatus;
  loading?: boolean;
}

// Configuração visual para cada nível
const STATUS_CONFIG: Record<AthleteStatus, {
  label: string;
  subtitle: string;
  crownColor: string;
  badgeGradient: string;
  badgeBg: string;
}> = {
  iniciante: {
    label: 'INICIANTE',
    subtitle: 'Começando a jornada',
    crownColor: 'text-slate-400',
    badgeGradient: 'from-slate-400 to-slate-500',
    badgeBg: 'bg-slate-500/10 border-slate-500/30',
  },
  intermediario: {
    label: 'INTERMEDIÁRIO',
    subtitle: 'Evoluindo consistente',
    crownColor: 'text-sky-400',
    badgeGradient: 'from-sky-400 to-cyan-500',
    badgeBg: 'bg-sky-500/10 border-sky-500/30',
  },
  avancado: {
    label: 'AVANÇADO',
    subtitle: 'Preparado para competir',
    crownColor: 'text-emerald-400',
    badgeGradient: 'from-emerald-400 to-teal-500',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  hyrox_open: {
    label: 'HYROX OPEN',
    subtitle: 'Competidor oficial',
    crownColor: 'text-purple-400',
    badgeGradient: 'from-purple-400 to-fuchsia-500',
    badgeBg: 'bg-purple-500/10 border-purple-500/30',
  },
  hyrox_pro: {
    label: 'HYROX PRO',
    subtitle: 'Elite competitiva',
    crownColor: 'text-amber-400',
    badgeGradient: 'from-amber-400 to-yellow-500',
    badgeBg: 'bg-amber-500/10 border-amber-400/40',
  },
};

export function DashboardIdentityHeader({
  athleteName,
  status,
  loading = false,
}: DashboardIdentityHeaderProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.iniciante;

  if (loading) {
    return (
      <div className="mb-8 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded mb-3" />
        <div className="h-6 w-32 bg-muted rounded" />
      </div>
    );
  }

  // Extrai primeiro nome para saudação mais pessoal
  const firstName = athleteName?.split(' ')[0] || 'Atleta';

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {/* Nome do atleta - headline forte */}
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
        {firstName}
      </h1>

      {/* Badge de nível competitivo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border ${config.badgeBg}`}
      >
        {/* Coroa */}
        <StatusCrownPreset 
          size="sm" 
          colorClass={config.crownColor}
        />

        {/* Label do nível */}
        <span className={`font-display text-sm font-semibold tracking-wide bg-gradient-to-r ${config.badgeGradient} bg-clip-text text-transparent`}>
          {config.label}
        </span>
      </motion.div>

      {/* Subtítulo aspiracional */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-2 text-sm text-muted-foreground"
      >
        {config.subtitle}
      </motion.p>
    </motion.header>
  );
}
