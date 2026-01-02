/**
 * StructuredErrorDisplay - Componente de exibição padronizada de erros
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * MVP0 — PADRONIZAÇÃO GLOBAL DE ERROS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ESTRUTURA OBRIGATÓRIA DE TODA MENSAGEM DE ERRO:
 * - 🔴 Erro de estrutura — {DIA_DA_SEMANA}
 * - Linha {NÚMERO_DA_LINHA}
 * - 📌 O que aconteceu
 * - 🛠️ O que fazer agora
 * - 🎯 Próximo passo
 * 
 * NOTA: "Exemplo correto" foi removido — o ensino acontece no "Modelo Recomendado" (input)
 */

import { AlertCircle, AlertTriangle, ArrowRight, Copy, Check, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
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
  
  return (
    <div 
      className={`p-4 rounded-lg border-2 space-y-3 ${
        isError 
          ? 'bg-destructive/5 border-destructive/30' 
          : 'bg-amber-500/5 border-amber-500/30'
      }`}
    >
      {/* Header: Tipo de erro + Dia + Linha */}
      <div className="flex items-start gap-2">
        {isError ? (
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className={`font-semibold text-sm ${isError ? 'text-destructive' : 'text-amber-700'}`}>
            {isError ? '🔴' : '🟡'} Erro de estrutura — {formatted.dayName}
            {formatted.blockTitle && ` · Bloco: ${formatted.blockTitle}`}
          </p>
          {formatted.lineNumber && (
            <p className={`text-xs ${isError ? 'text-destructive/80' : 'text-amber-600/80'}`}>
              Linha {formatted.lineNumber}
            </p>
          )}
        </div>
      </div>
      
      {/* Linha problemática */}
      {formatted.lineText && (
        <div className="bg-muted/40 px-3 py-2 rounded border border-border/50">
          <p className="text-xs text-muted-foreground italic font-mono break-all">
            "{formatted.lineText.length > 100 ? formatted.lineText.substring(0, 100) + '...' : formatted.lineText}"
          </p>
        </div>
      )}
      
      {/* 📌 O que aconteceu */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground/80">📌 O que aconteceu</p>
        <p className="text-sm text-foreground/90">
          {formatted.whatHappened}
        </p>
      </div>
      
      {/* 🛠️ O que fazer agora */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground/80">🛠️ O que fazer agora</p>
        <p className="text-sm text-foreground/90">
          👉 {formatted.whatToDo}
        </p>
      </div>
      
      {/* 🎯 Próximo passo + Botão Ir para bloco */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          🎯 Depois de ajustar, clique em <span className="font-medium">Validar e Visualizar</span> novamente.
        </p>
        
        {formatted.dayIndex !== undefined && onScrollToBlock && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onScrollToBlock(formatted.dayIndex!, formatted.blockIndex)}
            className="h-7 text-xs gap-1.5 flex-shrink-0"
          >
            <ArrowRight className="w-3 h-3" />
            Ir para o bloco
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Bloco "Modelo Recomendado" - CONSTANTE FIXA (MVP0)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONTRATO DE PRODUTO (INVIOLÁVEL):
 * - Texto é FIXO e IMUTÁVEL em runtime
 * - NÃO depende de props, estado, erros ou contexto
 * - Card inicia SEMPRE FECHADO
 * - Abertura APENAS por clique manual do usuário
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// CONSTANTE FIXA — Modelo determinístico oficial (única versão permitida)
// O motor NÃO interpreta texto. Ele APENAS classifica por MARCADOR.
const MODEL_RECOMMENDED_TEMPLATE = `SEGUNDA

NOME_DO_BLOCO

= TREINO
- <linha de treino com métrica objetiva>
- <linha de treino com métrica objetiva>

> COMENTÁRIO
> <observação do coach>


TERÇA

NOME_DO_BLOCO

= TREINO
- <linha de treino>
- <linha de treino>

> COMENTÁRIO
> <observação do coach>`;

interface RecommendedModelBlockProps {
  // Props removidas intencionalmente — modelo é FIXO e não depende de contexto
}

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
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 overflow-hidden">
      {/* Header clicável — ÚNICA forma de abrir o card */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm text-primary">
            🧩 Modelo recomendado (à prova de erro)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copiar
              </>
            )}
          </Button>
          <span className={`text-xs text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>
      
      {/* Conteúdo expandível — texto FIXO, não muda */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Template FIXO copiável */}
          <div className="p-3 rounded bg-muted/50 border border-border">
            <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {MODEL_RECOMMENDED_TEMPLATE}
            </pre>
          </div>
          
          {/* Marcadores obrigatórios */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/80">🔒 Marcadores obrigatórios</p>
            <div className="text-xs text-foreground/70 space-y-1.5 pl-2 font-mono">
              <p><span className="font-semibold text-primary">=</span> TREINO → início do bloco de treino</p>
              <p><span className="font-semibold text-primary">-</span> item de treino → cada exercício</p>
              <p><span className="font-semibold text-primary">&gt;</span> COMENTÁRIO → observação do coach</p>
            </div>
          </div>
          
          {/* Métricas aceitas */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/80">📏 Métricas obrigatórias por modalidade</p>
            <div className="text-xs text-foreground/70 space-y-1.5 pl-2">
              <p><span className="font-medium">🏃 Corrida:</span> tempo (30 min), distância (5 km), intensidade (Z2, PSE 5, pace 5:00/km)</p>
              <p><span className="font-medium">🏋️ Força:</span> séries x reps (5x5), carga (75% ou 60 kg), rest (2:00)</p>
              <p><span className="font-medium">🔥 Metcon:</span> formato (EMOM 12, AMRAP 15, For Time), reps explícitas</p>
              <p><span className="font-medium">🧘 Acessórios:</span> tempo (3 min) ou reps (2x15)</p>
            </div>
          </div>
          
          {/* Regras determinísticas */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs font-semibold text-destructive/80">⚠️ Regras absolutas</p>
            <div className="text-xs text-foreground/70 space-y-1 pl-2">
              <p>• Linha de treino SEM métrica = erro</p>
              <p>• Comentário SEM marcador <span className="font-mono">&gt;</span> = erro</p>
              <p>• Texto sem marcador segue o marcador anterior</p>
              <p>• O sistema não move texto entre treino e comentário</p>
            </div>
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
    <div className={`p-4 rounded-xl border-2 space-y-4 ${
      hasErrors 
        ? 'bg-destructive/10 border-destructive/40' 
        : 'bg-amber-500/10 border-amber-500/40'
    }`}>
      {/* Header resumo */}
      <div className="flex items-center gap-2">
        <AlertCircle className={`w-5 h-5 ${hasErrors ? 'text-destructive' : 'text-amber-600'}`} />
        <span className={`font-semibold text-sm ${hasErrors ? 'text-destructive' : 'text-amber-700'}`}>
          {errorCount > 0 && `${errorCount} erro${errorCount > 1 ? 's' : ''}`}
          {errorCount > 0 && warningCount > 0 && ' / '}
          {warningCount > 0 && `${warningCount} aviso${warningCount > 1 ? 's' : ''}`}
          {' de estrutura'}
        </span>
      </div>
      
      {/* Lista de erros */}
      <div className="space-y-3">
        {issues.map((issue, idx) => (
          <SingleError 
            key={idx} 
            issue={issue} 
            onScrollToBlock={onScrollToBlock}
          />
        ))}
      </div>
      
      {/* Footer informativo */}
      {hasErrors ? (
        <p className="text-xs text-destructive/80 font-medium pt-2 border-t border-destructive/20">
          🚫 Corrija os erros acima para poder publicar o treino.
        </p>
      ) : (
        <p className="text-xs text-amber-600/80 font-medium pt-2 border-t border-amber-500/20">
          ⚠️ Avisos não bloqueiam o salvamento. Você pode ajustar depois.
        </p>
      )}
    </div>
  );
}
