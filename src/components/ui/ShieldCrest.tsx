/**
 * ShieldCrest — Reusable shield for OUTLIER level identity
 * Uses external PNG assets from storage.
 */

import type { ExtendedLevelKey } from '@/hooks/useJourneyProgress';

const SHIELD_URLS: Record<string, string> = {
  'OPEN-active': 'https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/open_outlier_destravado.png',
  'OPEN-locked': 'https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/open_outlier_travado.png',
  'PRO-active': 'https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/pro_outlier_destravado.png',
  'PRO-locked': 'https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/pro_outlier_travado.png',
  'ELITE-active': 'https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/elite_outlier_destravado.png',
  'ELITE-locked': 'https://snvsmdwapplhmzvqcyun.supabase.co/storage/v1/object/public/slug_avancos_conquistas/elite_outlier_travado.png',
};

interface ShieldCrestProps {
  level: ExtendedLevelKey;
  active: boolean;
  isCurrent?: boolean;
  fillPercent?: number;
  className?: string;
}

export function ShieldCrest({ level, active, className }: ShieldCrestProps) {
  const key = `${level}-${active ? 'active' : 'locked'}`;
  const url = SHIELD_URLS[key];

  return (
    <img
      src={url}
      alt={`${level} Shield`}
      className={className}
      draggable={false}
    />
  );
}
