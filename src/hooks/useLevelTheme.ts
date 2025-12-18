import { useEffect } from 'react';
import { useAthleteStatus } from './useAthleteStatus';
import type { AthleteStatus } from '@/types/outlier';

/**
 * Level Theme Hook
 * 
 * Applies level-specific CSS classes for coloring TEXT, BADGES, PROGRESS BARS, and ICONS.
 * DOES NOT change the background - background remains fixed dark gradient.
 */
export function useLevelTheme() {
  const { status } = useAthleteStatus();

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all level classes
    const levelClasses = [
      'level-iniciante',
      'level-intermediario', 
      'level-avancado',
      'level-hyrox_open',
      'level-hyrox_pro'
    ];
    
    levelClasses.forEach(cls => root.classList.remove(cls));
    
    // Add current level class (for text/badge/icon colors only)
    root.classList.add(`level-${status}`);
    
  }, [status]);
}

// Level color utilities for use in components (text, badges, progress bars, icons)
export const LEVEL_COLORS: Record<AthleteStatus, {
  primary: string;
  secondary: string;
  gradient: string;
  text: string;
  badge: string;
}> = {
  iniciante: {
    primary: 'hsl(199 89% 48%)',
    secondary: 'hsl(187 85% 43%)',
    gradient: 'from-cyan-500 to-blue-500',
    text: 'text-cyan-500',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  intermediario: {
    primary: 'hsl(142 71% 45%)',
    secondary: 'hsl(158 64% 52%)',
    gradient: 'from-green-500 to-emerald-500',
    text: 'text-green-500',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  avancado: {
    primary: 'hsl(25 95% 53%)',
    secondary: 'hsl(38 92% 50%)',
    gradient: 'from-orange-500 to-amber-500',
    text: 'text-orange-500',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  hyrox_open: {
    primary: 'hsl(270 70% 60%)',
    secondary: 'hsl(290 60% 55%)',
    gradient: 'from-purple-500 to-pink-500',
    text: 'text-purple-500',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  hyrox_pro: {
    primary: 'hsl(45 93% 47%)',
    secondary: 'hsl(38 92% 50%)',
    gradient: 'from-amber-400 to-yellow-500',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};
