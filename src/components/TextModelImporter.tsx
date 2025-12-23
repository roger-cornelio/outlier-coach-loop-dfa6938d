/**
 * TextModelImporter - Importador de treino via texto modelo estruturado
 * 
 * REGRAS:
 * - Texto deve seguir modelo fixo
 * - Preview obrigatório antes de importar
 * - Bloqueia se faltarem campos obrigatórios
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, AlertCircle, CheckCircle, ChevronDown, ChevronUp, 
  Zap, Copy, HelpCircle, AlertTriangle, Eye, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  parseStructuredText, 
  parsedToDayWorkouts,
  getDayName,
  getTypeLabel,
  getFormatLabel,
  TEMPLATE_EXAMPLE,
  type ParseResult 
} from '@/utils/structuredTextParser';
import type { DayWorkout } from '@/types/outlier';

interface TextModelImporterProps {
  onImport: (workouts: DayWorkout[]) => void;
}

export function TextModelImporter({ onImport }: TextModelImporterProps) {
  const [text, setText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleParse = () => {
    if (!text.trim()) return;
    const result = parseStructuredText(text);
    setParseResult(result);
    setShowPreview(true);
  };

  const handleImport = () => {
    if (!parseResult?.success) return;
    const workouts = parsedToDayWorkouts(parseResult);
    onImport(workouts);
    // Limpar após importar
    setText('');
    setParseResult(null);
    setShowPreview(false);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(TEMPLATE_EXAMPLE);
  };

  const handleClear = () => {
    setText('');
    setParseResult(null);
    setShowPreview(false);
  };

  return (
    <div className="space-y-4">
      {/* Info e ajuda */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-foreground mb-1">Importar via Texto Modelo</p>
              <p className="text-sm text-muted-foreground mb-3">
                Cole o treino seguindo o modelo estruturado. Textos de WhatsApp, PDF convertido ou digitados manualmente 
                são aceitos, desde que sigam o padrão.
              </p>
              
              <Collapsible open={showHelp} onOpenChange={setShowHelp}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <HelpCircle className="w-3 h-3 mr-1" />
                    {showHelp ? 'Ocultar modelo' : 'Ver modelo obrigatório'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-foreground">MODELO OBRIGATÓRIO</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={handleCopyTemplate}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
{`DIA: <Segunda | Terça | ... | Domingo>
BLOCO: <Título do bloco>
TIPO: <Aquecimento | Força | Conditioning | Específico | Core | Corrida | Bike | Remo>
FORMATO: <For Time | AMRAP | EMOM | Rounds | Intervalos | Técnica>
PRINCIPAL: <true | false>
BENCHMARK: <true | false>
- <quantidade> <unidade> <movimento>
- <quantidade> <unidade> <movimento>

(repetir BLOCO se necessário)
(repetir DIA se necessário)`}
                    </pre>
                    
                    <div className="mt-3 pt-3 border-t border-border">
                      <span className="text-xs font-medium text-foreground">EXEMPLO:</span>
                      <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
{TEMPLATE_EXAMPLE}
                      </pre>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Área de input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Colar Texto do Treino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParseResult(null);
              setShowPreview(false);
            }}
            placeholder={`Cole aqui o texto do treino seguindo o modelo:

DIA: Segunda
BLOCO: AMRAP 20min
TIPO: Conditioning
FORMATO: AMRAP
PRINCIPAL: true
BENCHMARK: false
- 5 reps Pull-ups
- 10 reps Push-ups
- 15 reps Air Squats`}
            className="min-h-[200px] font-mono text-sm"
          />

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleParse}
              disabled={!text.trim()}
              className="flex-1 min-w-[150px]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Validar e Visualizar
            </Button>
            
            {text.trim() && (
              <Button variant="outline" onClick={handleClear}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultado do parse */}
      <AnimatePresence>
        {parseResult && showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className={parseResult.success ? 'border-green-500/30' : 'border-destructive/30'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {parseResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    {parseResult.success 
                      ? `Preview: ${parseResult.days.length} dia(s) encontrados`
                      : 'Erros encontrados'
                    }
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Erros */}
                {parseResult.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Corrija os erros para poder importar:
                    </p>
                    {parseResult.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-destructive flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {error}
                      </p>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {parseResult.warnings.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {parseResult.warnings.length} aviso(s)
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                        {parseResult.warnings.map((warning, idx) => (
                          <p key={idx} className="text-xs text-amber-600">
                            {warning}
                          </p>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Preview dos dias */}
                {parseResult.success && parseResult.days.length > 0 && (
                  <div className="space-y-3">
                    {parseResult.days.map((day) => (
                      <div key={day.day} className="border border-border rounded-lg overflow-hidden">
                        <div className="p-2 bg-secondary/30 flex items-center gap-2">
                          <Badge variant="outline">{getDayName(day.day)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {day.blocks.length} bloco(s)
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          {day.blocks.map((block, idx) => (
                            <div key={idx} className="p-2 rounded bg-muted/30 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{block.title}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {getTypeLabel(block.type)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {getFormatLabel(block.format)}
                                </Badge>
                                {block.isMainWod && (
                                  <Badge className="text-xs bg-primary">Principal</Badge>
                                )}
                                {block.isBenchmark && (
                                  <Badge className="text-xs bg-amber-500">Benchmark</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {block.items.length} item(s):
                                <span className="ml-1">
                                  {block.items.slice(0, 3).map(i => `${i.quantity} ${i.unit} ${i.movement}`).join(', ')}
                                  {block.items.length > 3 && '...'}
                                </span>
                              </div>
                              {block.coachNotes.length > 0 && (
                                <div className="text-xs text-amber-600">
                                  📝 {block.coachNotes.length} nota(s) do coach
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Botão importar */}
                    <Button 
                      onClick={handleImport} 
                      className="w-full"
                      size="lg"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Importar {parseResult.days.length} dia(s)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
