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
 * - ✅ Exemplo correto
 * - 🎯 Próximo passo
 */

import { AlertCircle, AlertTriangle, ArrowRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { 
  formatStructureIssue, 
  type FormattedError 
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
  const [copied, setCopied] = useState(false);
  const formatted = formatStructureIssue(issue);
  const isError = formatted.severity === 'ERROR';
  
  const handleCopyExample = () => {
    navigator.clipboard.writeText(formatted.exampleFix);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
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
      
      {/* ✅ Exemplo correto */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground/80">✅ Exemplo correto</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyExample}
            className="h-6 px-2 text-xs gap-1"
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
        </div>
        <div className="p-3 rounded bg-muted/50 border border-border">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {formatted.exampleFix}
          </pre>
        </div>
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
      
      {/* Footer bloqueante */}
      {hasErrors && (
        <p className="text-xs text-destructive/80 font-medium pt-2 border-t border-destructive/20">
          🚫 Corrija os erros acima para poder importar o treino.
        </p>
      )}
    </div>
  );
}
