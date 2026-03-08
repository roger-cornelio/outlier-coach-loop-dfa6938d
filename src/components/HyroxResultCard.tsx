import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Medal, Timer, Calendar, Image, ExternalLink, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { HyroxAnalysisCard } from './HyroxAnalysisCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface HyroxResultCardProps {
  result: {
    id: string;
    result_type: 'simulado' | 'prova_oficial';
    event_name: string | null;
    event_date: string | null;
    time_in_seconds: number | null;
    screenshot_url: string | null;
    race_category: 'OPEN' | 'PRO' | null;
    created_at: string;
  };
  gender: 'M' | 'F';
  /** Optional: time difference in seconds vs previous race (positive = improved) */
  timeDeltaSeconds?: number | null;
  /** Optional: callback when result is deleted */
  onDelete?: (id: string) => void;
  /** Optional: highlight as the most recent race */
  isLatest?: boolean;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Extract season label from event_name year.
 * HYROX seasons: Season 7 = 2024/25, Season 8 = 2025/26, etc.
 * We derive season from the event year in the event_name.
 */
function getSeasonFromEventName(eventName: string | null): string | null {
  if (!eventName) return null;
  const yearMatch = eventName.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);
  // Season mapping: 2024 → S7 (2024/25), 2025 → S8 (2025/26), 2023 → S6 (2023/24)
  const seasonNum = year - 2017;
  return `Temporada ${seasonNum}`;
}

/**
 * Extract just the location from event_name.
 * Strips "HYROX" prefix and trailing year.
 * E.g., "HYROX CIUDAD DE MEXICO 2024" → "CIUDAD DE MEXICO"
 */
function getEventLocation(eventName: string | null): string {
  if (!eventName) return 'HYROX';
  let name = eventName.replace(/^HYROX\s*/i, '').replace(/\s*\b20\d{2}\b\s*$/, '').trim();
  return name || eventName;
}

/**
 * HyroxResultCard - Compact card for HYROX race results
 * Features:
 * - Compact header with event name, date, time
 * - "Ver análise" CTA button
 * - Expandable analysis section with radar chart
 */
export function HyroxResultCard({ result, gender, timeDeltaSeconds, onDelete, isLatest }: HyroxResultCardProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const isOfficial = result.result_type === 'prova_oficial';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-elevated rounded-lg overflow-hidden ${isLatest ? 'ring-2 ring-primary/60 shadow-lg shadow-primary/10' : ''}`}
    >
      {/* "Mais recente" label */}
      {isLatest && (
        <div className="bg-primary/10 border-b border-primary/20 px-3 py-1 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Prova que valida seu nível</span>
        </div>
      )}

      {/* Compact Result Header - Clickable */}
      <button
        onClick={() => setShowAnalysis(!showAnalysis)}
        className={`w-full p-3 flex items-center justify-between hover:bg-secondary/50 transition-colors border-l-4 ${
          isOfficial ? 'border-l-amber-500' : 'border-l-primary'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`p-1.5 rounded-lg ${
            isOfficial ? 'bg-amber-500/10' : 'bg-primary/10'
          }`}>
            {isOfficial ? (
              <Medal className="w-4 h-4 text-amber-500" />
            ) : (
              <Timer className="w-4 h-4 text-primary" />
            )}
          </div>
          
          {/* Event Info */}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h4 className="font-display text-sm">
                {getEventLocation(result.event_name)}
              </h4>
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                isOfficial
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-primary/20 text-primary'
              }`}>
                {isOfficial ? 'OFICIAL' : 'SIM'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>
                {getSeasonFromEventName(result.event_name) || 'HYROX'}
              </span>
              {timeDeltaSeconds != null && timeDeltaSeconds !== 0 && (
                <span className={`ml-1 font-semibold ${timeDeltaSeconds > 0 ? 'text-status-good' : 'text-status-attention'}`}>
                  {timeDeltaSeconds > 0 ? '▼' : '▲'} {formatTime(Math.abs(timeDeltaSeconds))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time + CTA */}
        <div className="flex items-center gap-3">
          {result.time_in_seconds && (
            <p className={`font-display text-xl ${
              isOfficial ? 'text-amber-500' : 'text-primary'
            }`}>
              {formatTime(result.time_in_seconds)}
            </p>
          )}
          <div className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            showAnalysis
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary/10 text-primary'
          }`}>
            {showAnalysis ? 'Ocultar' : 'Ver análise'}
          </div>
          {showAnalysis ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Analysis Content */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-2 border-t border-border">
              {/* Screenshot Preview - Compact link */}
              {result.screenshot_url && (
                <div className="mb-3">
                  <a 
                    href={result.screenshot_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Image className="w-3 h-3" />
                    Ver screenshot original
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* HYROX Analysis Card - only for results with time */}
              {result.time_in_seconds && result.time_in_seconds > 0 && (
                <HyroxAnalysisCard
                  resultId={result.id}
                  totalTimeSeconds={result.time_in_seconds}
                  gender={gender}
                  raceCategory={result.race_category}
                />
              )}

              {/* Delete individual result */}
              {onDelete && (
                <div className="flex justify-end pt-3 mt-3 border-t border-border">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir prova
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir esta prova?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O resultado de "{getEventLocation(result.event_name)}" será apagado permanentemente do banco de dados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(result.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sim, excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
