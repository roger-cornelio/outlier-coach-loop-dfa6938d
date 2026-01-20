import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Medal, Timer, Calendar, Image, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { HyroxAnalysisCard } from './HyroxAnalysisCard';

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

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * HyroxResultCard - Compact card for HYROX race results
 * Features:
 * - Compact header with event name, date, time
 * - "Ver análise" CTA button
 * - Expandable analysis section with radar chart
 */
export function HyroxResultCard({ result, gender }: HyroxResultCardProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const isOfficial = result.result_type === 'prova_oficial';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated rounded-lg overflow-hidden"
    >
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
                {result.event_name || 'HYROX'}
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
                {result.event_date 
                  ? formatFullDate(result.event_date)
                  : formatFullDate(result.created_at)}
              </span>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
