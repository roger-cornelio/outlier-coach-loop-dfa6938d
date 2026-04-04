import { useEffect, useState } from 'react';
import { getPendingCount, getFailedCount, onQueueChange, flush, clearFailed } from '@/lib/offlineQueue';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function OfflineQueueIndicator() {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    const update = () => {
      setPending(getPendingCount());
      setFailed(getFailedCount());
    };
    update();
    return onQueueChange(update);
  }, []);

  if (pending === 0 && failed === 0) return null;

  const handleRetry = async () => {
    setFlushing(true);
    await flush();
    setFlushing(false);
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg bg-warning/90 px-3 py-2 text-warning-foreground text-xs shadow-lg backdrop-blur-sm md:bottom-4">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        {pending > 0 && `${pending} pendente${pending > 1 ? 's' : ''}`}
        {pending > 0 && failed > 0 && ' · '}
        {failed > 0 && `${failed} falha${failed > 1 ? 's' : ''}`}
      </span>
      {pending > 0 && (
        <button
          onClick={handleRetry}
          disabled={flushing}
          className="ml-1 rounded p-1 hover:bg-black/10"
        >
          <RefreshCw className={`h-3 w-3 ${flushing ? 'animate-spin' : ''}`} />
        </button>
      )}
      {failed > 0 && (
        <button
          onClick={clearFailed}
          className="ml-1 text-[10px] underline hover:no-underline"
        >
          limpar
        </button>
      )}
    </div>
  );
}
