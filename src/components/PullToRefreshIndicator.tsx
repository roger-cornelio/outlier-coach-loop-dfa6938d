import { RefreshCw } from 'lucide-react';

interface Props {
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({ pullDistance, pullProgress, isRefreshing }: Props) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: isRefreshing ? 48 : pullDistance * 0.6 }}
    >
      <RefreshCw
        className={`w-5 h-5 text-primary transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
        style={{ transform: `rotate(${pullProgress * 360}deg)`, opacity: Math.max(pullProgress, isRefreshing ? 1 : 0) }}
      />
    </div>
  );
}
