/**
 * StructuredErrorDisplay - Componente de exibição padronizada de erros
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * MVP0 — PADRONIZAÇÃO GLOBAL DE ERROS (FACE-LIFT PREMIUM)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRUTURA:
 * - Header compacto: severity icon + título + dia (1 linha)
 * - Detalhes colapsáveis via Collapsible (fechado por padrão)
 * - Modelo recomendado: card fixo, sempre fechado
 */

import { AlertCircle, AlertTriangle, ArrowRight, Copy, Check, Lightbulb, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  formatStructureIssue, 
  type FormattedError,
  getDayNameFromIndex
} from '@/utils/errorMessageFormatter';
import type { StructureIssue } from '@/utils/structuredTextParser';

interface StructuredErrorDisplayProps {
  issues: StructureIssue[];
  onScrollToBlock?: (dayIndex: number, blockIndex?: number) => void;
}

interface SingleErrorProps {
  issue: StructureIssue;
  onScrollToBlock?: (dayIndex: number, blockIndex?: number) => void;
}

function SingleError({ issue, onScrollToBlock }: SingleErrorProps) {
  const formatted = formatStructureIssue(issue);
  const isError = formatted.severity === 'ERROR';
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div 
        className={`rounded-xl border overflow-hidden transition-colors ${
          isError 
            ? 'bg-destructive/5 border-destructive/20' 
            : 'bg-amber-500/5 border-amber-500/20'
        }`}
      >
        {/* Header compacto — 1 linha */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
          >
            {isError ? (
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            )}
            <span className={`text-sm font-medium flex-1 ${isError ? 'text-destructive' : 'text-amber-700'}`}>
              {formatted.dayName}
              {formatted.blockTitle && ` · ${formatted.blockTitle}`}
              {formatted.lineNumber && (
                <span className="text-muted-foreground font-normal ml-1.5">
                  (linha {formatted.lineNumber})
                </span>
              )}
            </span>
            
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {formatted.dayIndex !== undefined && onScrollToBlock && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onScrollToBlock(formatted.dayIndex!, formatted.blockIndex);
                  }}
                  className="h-6 px-2 text-xs gap-1"
                >
                  <ArrowRight className="w-3 h-3" />
                  Ir
                </Button>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        {/* Detalhes colapsáveis */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 border-t border-border/30">
            {/* Linha problemática */}
            {formatted.lineText && (
              <div className="mt-2 bg-muted/40 px-2.5 py-1.5 rounded-lg">
                <p className="text-xs text-muted-foreground italic font-mono truncate">
                  "{formatted.lineText.length > 100 ? formatted.lineText.substring(0, 100) + '...' : formatted.lineText}"
                </p>
              </div>
            )}
            
            {/* 📌 O que aconteceu */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">📌 O que aconteceu</p>
              <p className="text-xs text-foreground/80 mt-0.5">{formatted.whatHappened}</p>
            </div>
            
            {/* 🛠️ O que fazer */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">🛠️ O que fazer</p>
              <p className="text-xs text-foreground/80 mt-0.5">👉 {formatted.whatToDo}</p>
            </div>
            
            {/* 🎯 Próximo passo */}
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/30">
              🎯 Ajuste e clique em <span className="font-medium">Validar e Visualizar</span>.
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Bloco "Modelo Recomendado" - CONSTANTE FIXA (MVP0)
 */

const MODEL_RECOMMENDED_TEMPLATE = `DIA: SEGUNDA

BLOCO: AQUECIMENTO
- 800m Run Z2
- 3x10 Squat to Stand
(Foco na mobilidade de quadril)

BLOCO: WOD
**15' AMRAP**
PSE 8
- 10 Wall Ball 9kg
- 15 Cal Row
- 5 Bar Muscle-up
(Cap 5 rounds)

DIA: TERÇA

BLOCO: FORÇA
- Back Squat 5x5 @80%
- Romanian Deadlift 4x8
(Rest 2' entre séries)`;

interface RecommendedModelBlockProps {}

export function RecommendedModelBlock(_props: RecommendedModelBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleToggle = () => {
    setIsExpanded(prev => !prev);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(MODEL_RECOMMENDED_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm text-primary">
            Modelo recomendado
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 text-xs gap-1 px-2"
          >
            {copied ? (
              <><Check className="w-3 h-3" /> Copiado</>
            ) : (
              <><Copy className="w-3 h-3" /> Copiar</>
            )}
          </Button>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/30">
          <div className="mt-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
            <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {MODEL_RECOMMENDED_TEMPLATE}
            </pre>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">🔒 Marcadores</p>
            <div className="text-xs text-foreground/70 space-y-1 pl-2 font-mono">
              <p><span className="font-semibold text-primary">DIA:</span> SEGUNDA → início do dia</p>
              <p><span className="font-semibold text-primary">BLOCO:</span> AQUECIMENTO → início do bloco</p>
              <p><span className="font-semibold text-primary">**estrutura**</span> → AMRAP, EMOM, Rounds, For Time</p>
              <p><span className="font-semibold text-primary">-</span> exercício → cada exercício com métrica</p>
              <p><span className="font-semibold text-primary">( )</span> → comentário/observação</p>
            </div>
          </div>
          
          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-[11px] text-amber-700 font-medium">
              ⚠️ Texto solto sem <span className="font-mono">( )</span> será marcado como erro de interpretação
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function StructuredErrorDisplay({ issues, onScrollToBlock }: StructuredErrorDisplayProps) {
  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  const hasErrors = errorCount > 0;
  
  if (issues.length === 0) return null;
  
  return (
    <div className={`rounded-xl border space-y-2 p-3 ${
      hasErrors 
        ? 'bg-destructive/5 border-destructive/20' 
        : 'bg-amber-500/5 border-amber-500/20'
    }`}>
      {/* Header resumo compacto */}
      <div className="flex items-center gap-2 px-1">
        <AlertCircle className={`w-4 h-4 flex-shrink-0 ${hasErrors ? 'text-destructive' : 'text-amber-600'}`} />
        <span className={`font-medium text-sm ${hasErrors ? 'text-destructive' : 'text-amber-700'}`}>
          {errorCount > 0 && `${errorCount} erro${errorCount > 1 ? 's' : ''}`}
          {errorCount > 0 && warningCount > 0 && ' · '}
          {warningCount > 0 && `${warningCount} aviso${warningCount > 1 ? 's' : ''}`}
        </span>
      </div>
      
      {/* Lista de erros compactos */}
      <div className="space-y-1.5">
        {issues.map((issue, idx) => (
          <SingleError 
            key={idx} 
            issue={issue} 
            onScrollToBlock={onScrollToBlock}
          />
        ))}
      </div>
      
      {/* Footer */}
      <p className={`text-[11px] px-1 ${hasErrors ? 'text-destructive/70' : 'text-amber-600/70'}`}>
        {hasErrors 
          ? '🚫 Corrija os erros para publicar.'
          : '⚠️ Avisos não bloqueiam o salvamento.'}
      </p>
    </div>
  );
}
