/**
 * RacePlanCard — Visual "race card" com os tempos-alvo por estação
 * Usado no modal do TargetSplitsTable e como referência na aba Simulados
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Crosshair } from 'lucide-react';
import { useState } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { formatEvolutionTime } from '@/utils/evolutionUtils';

export interface RacePlanRow {
  key: string;
  label: string;
  targetSplit: number;
  isRun: boolean;
}

interface RacePlanCardProps {
  targetTime: string;
  rows: RacePlanRow[];
  totalTarget: number;
  showCopyButton?: boolean;
  compact?: boolean;
}

export function RacePlanCard({ targetTime, rows, totalTarget, showCopyButton = true, compact = false }: RacePlanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyImage = async () => {
    if (!cardRef.current) return;

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0c0c0e',
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          toast.success('Imagem copiada!');
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `plano-prova-${targetTime.replace(/:/g, '')}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Imagem salva!');
        }
      }, 'image/png');
    } catch {
      toast.error('Erro ao gerar imagem');
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="rounded-xl border border-border/30 overflow-hidden"
        style={{ backgroundColor: '#0c0c0e', color: '#e4e4e7' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#a1a1aa' }}>
              Plano de Prova
            </span>
          </div>
          <span className="font-mono font-bold text-lg" style={{ color: '#f59e0b' }}>
            {targetTime}
          </span>
        </div>

        {/* Table */}
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider font-medium" style={{ color: '#71717a' }}>#</th>
              <th className="text-left py-2 px-4 text-[10px] uppercase tracking-wider font-medium" style={{ color: '#71717a' }}>Estação</th>
              <th className="text-right py-2 px-4 text-[10px] uppercase tracking-wider font-medium" style={{ color: '#71717a' }}>Tempo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.key}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: r.isRun ? 'rgba(59,130,246,0.06)' : 'transparent',
                }}
              >
                <td className={`py-1.5 px-4 font-mono ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: '#52525b' }}>
                  {i + 1}
                </td>
                <td className={`py-1.5 px-4 font-medium ${compact ? 'text-[11px]' : 'text-xs'}`} style={{ color: r.isRun ? '#93c5fd' : '#e4e4e7' }}>
                  {r.label}
                </td>
                <td className={`py-1.5 px-4 text-right font-mono font-bold ${compact ? 'text-[11px]' : 'text-xs'}`} style={{ color: '#f59e0b' }}>
                  {formatEvolutionTime(r.targetSplit)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <td className="py-2 px-4" />
              <td className="py-2 px-4 text-xs font-bold" style={{ color: '#e4e4e7' }}>Total</td>
              <td className="py-2 px-4 text-right font-mono font-bold text-sm" style={{ color: '#f59e0b' }}>
                {formatEvolutionTime(totalTarget)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer branding */}
        <div className="px-4 py-2 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[9px] uppercase tracking-[0.2em] font-medium" style={{ color: '#3f3f46' }}>
            outlier · gps da prova
          </span>
        </div>
      </div>

      {showCopyButton && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-border/20"
          onClick={handleCopyImage}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado!' : 'Copiar como imagem'}
        </Button>
      )}
    </div>
  );
}
