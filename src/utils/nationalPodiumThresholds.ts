import type { AthleteCountry } from '@/types/outlier';
import type { AthleteGender } from './athleteStatusSystem';

/**
 * National podium thresholds for PRO ruler calibration.
 * Times are in minutes.
 * 
 * The ruler for PRO athletes is calibrated against national podium times,
 * not average PRO times.
 * 
 * Score ranges:
 * - 95-100: Podium level (top 3 nationally)
 * - 88-94: National elite (top 10)
 * - 80-87: Competitive PRO (top 20-30)
 * - 72-79: Solid PRO competitor
 * - 65-71: Entry PRO level
 * - <65: Below competitive PRO threshold
 */

interface PodiumThresholds {
  // Time in minutes for each score range boundary
  podium: number;      // 95-100: ≤ this time
  elite: number;       // 88-94: podium < time ≤ elite
  competitive: number; // 80-87: elite < time ≤ competitive
  solid: number;       // 72-79: competitive < time ≤ solid
  entry: number;       // 65-71: solid < time ≤ entry
  // Below entry = < 65 score
}

// National thresholds by country and gender (times in minutes)
const NATIONAL_THRESHOLDS: Record<AthleteCountry, Record<AthleteGender, PodiumThresholds>> = {
  // Brazil - Based on national rankings
  BR: {
    masculino: {
      podium: 66,      // ≤1h06 → 95-100
      elite: 70,       // 1h06-1h10 → 88-94
      competitive: 75, // 1h10-1h15 → 80-87
      solid: 80,       // 1h15-1h20 → 72-79
      entry: 85,       // 1h20-1h25 → 65-71
    },
    feminino: {
      podium: 72,      // ≤1h12 → 95-100
      elite: 77,       // 1h12-1h17 → 88-94
      competitive: 82, // 1h17-1h22 → 80-87
      solid: 87,       // 1h22-1h27 → 72-79
      entry: 92,       // 1h27-1h32 → 65-71
    },
  },
  
  // United States - Stronger competition
  US: {
    masculino: {
      podium: 62,
      elite: 66,
      competitive: 70,
      solid: 75,
      entry: 80,
    },
    feminino: {
      podium: 68,
      elite: 73,
      competitive: 78,
      solid: 83,
      entry: 88,
    },
  },
  
  // Germany - Very strong HYROX nation
  DE: {
    masculino: {
      podium: 60,
      elite: 64,
      competitive: 68,
      solid: 73,
      entry: 78,
    },
    feminino: {
      podium: 66,
      elite: 71,
      competitive: 76,
      solid: 81,
      entry: 86,
    },
  },
  
  // United Kingdom
  UK: {
    masculino: {
      podium: 63,
      elite: 67,
      competitive: 72,
      solid: 77,
      entry: 82,
    },
    feminino: {
      podium: 69,
      elite: 74,
      competitive: 79,
      solid: 84,
      entry: 89,
    },
  },
  
  // Spain
  ES: {
    masculino: {
      podium: 65,
      elite: 69,
      competitive: 74,
      solid: 79,
      entry: 84,
    },
    feminino: {
      podium: 71,
      elite: 76,
      competitive: 81,
      solid: 86,
      entry: 91,
    },
  },
  
  // France
  FR: {
    masculino: {
      podium: 64,
      elite: 68,
      competitive: 73,
      solid: 78,
      entry: 83,
    },
    feminino: {
      podium: 70,
      elite: 75,
      competitive: 80,
      solid: 85,
      entry: 90,
    },
  },
  
  // Italy
  IT: {
    masculino: {
      podium: 65,
      elite: 69,
      competitive: 74,
      solid: 79,
      entry: 84,
    },
    feminino: {
      podium: 71,
      elite: 76,
      competitive: 81,
      solid: 86,
      entry: 91,
    },
  },
  
  // Portugal
  PT: {
    masculino: {
      podium: 66,
      elite: 70,
      competitive: 75,
      solid: 80,
      entry: 85,
    },
    feminino: {
      podium: 72,
      elite: 77,
      competitive: 82,
      solid: 87,
      entry: 92,
    },
  },
  
  // Other/Default - Use average competitive thresholds
  OTHER: {
    masculino: {
      podium: 65,
      elite: 69,
      competitive: 74,
      solid: 79,
      entry: 84,
    },
    feminino: {
      podium: 71,
      elite: 76,
      competitive: 81,
      solid: 86,
      entry: 91,
    },
  },
};

/**
 * Calculate PRO ruler score (0-100) based on national podium thresholds.
 * This is only for PRO athletes and calibrates their position relative
 * to national competition, not general PRO averages.
 * 
 * @param timeInSeconds - Athlete's official competition time in seconds
 * @param country - Athlete's country
 * @param gender - Athlete's gender
 * @returns Score 0-100 calibrated to national podium
 */
export function calculateProRulerScore(
  timeInSeconds: number,
  country: AthleteCountry = 'BR',
  gender: AthleteGender = 'masculino'
): number {
  const thresholds = NATIONAL_THRESHOLDS[country]?.[gender] || NATIONAL_THRESHOLDS.OTHER[gender];
  const timeInMinutes = timeInSeconds / 60;
  
  // Score ranges with linear interpolation within each band
  if (timeInMinutes <= thresholds.podium) {
    // 95-100: Podium level
    // Scale from 100 (best possible) down to 95 at podium threshold
    const bestPossible = thresholds.podium - 10; // ~10 min faster than podium = 100
    const ratio = Math.max(0, (thresholds.podium - timeInMinutes) / (thresholds.podium - bestPossible));
    return 95 + (ratio * 5);
  }
  
  if (timeInMinutes <= thresholds.elite) {
    // 88-94: National elite
    const ratio = (thresholds.elite - timeInMinutes) / (thresholds.elite - thresholds.podium);
    return 88 + (ratio * 6);
  }
  
  if (timeInMinutes <= thresholds.competitive) {
    // 80-87: Competitive PRO
    const ratio = (thresholds.competitive - timeInMinutes) / (thresholds.competitive - thresholds.elite);
    return 80 + (ratio * 7);
  }
  
  if (timeInMinutes <= thresholds.solid) {
    // 72-79: Solid PRO
    const ratio = (thresholds.solid - timeInMinutes) / (thresholds.solid - thresholds.competitive);
    return 72 + (ratio * 7);
  }
  
  if (timeInMinutes <= thresholds.entry) {
    // 65-71: Entry PRO
    const ratio = (thresholds.entry - timeInMinutes) / (thresholds.entry - thresholds.solid);
    return 65 + (ratio * 6);
  }
  
  // Below entry level - scale down from 65
  // Every 5 minutes over entry threshold = -10 points
  const overEntry = timeInMinutes - thresholds.entry;
  const penalty = (overEntry / 5) * 10;
  return Math.max(0, 65 - penalty);
}

/**
 * Get the national podium time for display purposes
 */
export function getNationalPodiumTime(
  country: AthleteCountry = 'BR',
  gender: AthleteGender = 'masculino'
): number {
  const thresholds = NATIONAL_THRESHOLDS[country]?.[gender] || NATIONAL_THRESHOLDS.OTHER[gender];
  return thresholds.podium * 60; // Return in seconds
}

/**
 * Get threshold description for a given score
 */
export function getProScoreDescription(score: number): string {
  if (score >= 95) return 'Pódio Nacional';
  if (score >= 88) return 'Elite Nacional';
  if (score >= 80) return 'PRO Competitivo';
  if (score >= 72) return 'PRO Sólido';
  if (score >= 65) return 'PRO Iniciante';
  return 'Abaixo do nível PRO competitivo';
}

/**
 * Country display names
 */
export const COUNTRY_NAMES: Record<AthleteCountry, string> = {
  BR: 'Brasil',
  US: 'Estados Unidos',
  DE: 'Alemanha',
  UK: 'Reino Unido',
  ES: 'Espanha',
  FR: 'França',
  IT: 'Itália',
  PT: 'Portugal',
  OTHER: 'Outro',
};

/**
 * Get all thresholds for a country (for display in UI)
 */
export function getNationalThresholds(
  country: AthleteCountry = 'BR',
  gender: AthleteGender = 'masculino'
): PodiumThresholds {
  return NATIONAL_THRESHOLDS[country]?.[gender] || NATIONAL_THRESHOLDS.OTHER[gender];
}
