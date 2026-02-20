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
      'level-open',
      'level-pro', 
      'level-elite',
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
  open: {
    primary: 'hsl(270 70% 60%)',
    secondary: 'hsl(290 60% 55%)',
    gradient: 'from-purple-500 to-violet-500',
    text: 'text-purple-500',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  pro: {
    primary: 'hsl(45 93% 47%)',
    secondary: 'hsl(38 92% 50%)',
    gradient: 'from-amber-400 to-yellow-500',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  elite: {
    primary: 'hsl(50 95% 65%)',
    secondary: 'hsl(45 93% 60%)',
    gradient: 'from-yellow-300 to-amber-300',
    text: 'text-yellow-300',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  },
};
