import { useEffect } from 'react';
import { useAthleteStatus } from './useAthleteStatus';
import type { AthleteStatus } from '@/types/outlier';

export const LEVEL_THEMES: Record<AthleteStatus, {
  className: string;
  primaryHue: number;
  accentHue: number;
  bgHue: number;
}> = {
  iniciante: {
    className: 'level-iniciante',
    primaryHue: 199,
    accentHue: 172,
    bgHue: 210,
  },
  intermediario: {
    className: 'level-intermediario',
    primaryHue: 142,
    accentHue: 158,
    bgHue: 150,
  },
  avancado: {
    className: 'level-avancado',
    primaryHue: 25,
    accentHue: 15,
    bgHue: 20,
  },
  hyrox_open: {
    className: 'level-hyrox_open',
    primaryHue: 270,
    accentHue: 290,
    bgHue: 280,
  },
  hyrox_pro: {
    className: 'level-hyrox_pro',
    primaryHue: 45,
    accentHue: 38,
    bgHue: 40,
  },
};

export function useLevelTheme() {
  const { status } = useAthleteStatus();
  const theme = LEVEL_THEMES[status];

  useEffect(() => {
    // Remove all level classes
    Object.values(LEVEL_THEMES).forEach(t => {
      document.documentElement.classList.remove(t.className);
    });
    
    // Add current level class
    document.documentElement.classList.add(theme.className);
    
    // Update meta theme-color for mobile browsers
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', `hsl(${theme.bgHue}, 30%, 6%)`);
    }

    return () => {
      document.documentElement.classList.remove(theme.className);
    };
  }, [status, theme]);

  return { status, theme };
}
