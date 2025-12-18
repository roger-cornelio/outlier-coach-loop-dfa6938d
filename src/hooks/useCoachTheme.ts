import { useEffect } from 'react';
import { useOutlierStore } from '@/store/outlierStore';

export type CoachStyle = 'IRON' | 'SPARK' | 'PULSE';

const THEME_CLASSES: Record<CoachStyle, string> = {
  IRON: 'theme-iron',
  SPARK: 'theme-spark',
  PULSE: 'theme-pulse',
};

export function useCoachTheme() {
  const { athleteConfig } = useOutlierStore();
  const coachStyle = (athleteConfig?.coachStyle as CoachStyle) || 'PULSE';

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    Object.values(THEME_CLASSES).forEach((themeClass) => {
      root.classList.remove(themeClass);
    });

    // Add the current theme class
    const themeClass = THEME_CLASSES[coachStyle] || THEME_CLASSES.PULSE;
    root.classList.add(themeClass);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const colors: Record<CoachStyle, string> = {
        IRON: '#0f1419',
        SPARK: '#1a1308',
        PULSE: '#0d0a0a',
      };
      metaThemeColor.setAttribute('content', colors[coachStyle] || colors.PULSE);
    }

    return () => {
      // Cleanup on unmount (optional)
    };
  }, [coachStyle]);

  return {
    coachStyle,
    themeClass: THEME_CLASSES[coachStyle] || THEME_CLASSES.PULSE,
  };
}

// Helper to get coach-specific styles
export const getCoachStyles = (coachStyle: CoachStyle | string | undefined) => {
  const style = (coachStyle as CoachStyle) || 'PULSE';
  
  return {
    IRON: {
      name: 'IRON',
      icon: '⚔️',
      displayFont: 'font-iron-display',
      bodyFont: 'font-iron-body',
      buttonStyle: 'uppercase tracking-widest font-semibold',
      cardRadius: 'rounded-lg',
      accentColor: 'text-blue-400',
      glowColor: 'shadow-blue-500/20',
    },
    SPARK: {
      name: 'SPARK',
      icon: '🔥',
      displayFont: 'font-spark-display',
      bodyFont: 'font-spark-body',
      buttonStyle: 'font-bold rounded-2xl',
      cardRadius: 'rounded-2xl',
      accentColor: 'text-yellow-400',
      glowColor: 'shadow-yellow-500/30',
    },
    PULSE: {
      name: 'PULSE',
      icon: '💪',
      displayFont: 'font-pulse-display',
      bodyFont: 'font-pulse-body',
      buttonStyle: 'font-medium',
      cardRadius: 'rounded-lg',
      accentColor: 'text-orange-400',
      glowColor: 'shadow-orange-500/25',
    },
  }[style];
};
