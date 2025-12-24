/**
 * TextModelImporter - Importador de treino via texto livre + arquivo
 * 
 * UX:
 * - Área 1: Texto livre (principal) - funciona sempre
 * - Área 2: Upload de arquivo (PDF/imagem) - fallback para texto se não funcionar
 * 
 * REGRAS:
 * - Parsing determinístico automático
 * - Preview obrigatório antes de importar
 * - Alertas leves não bloqueiam
 * - Apenas erros críticos bloqueiam
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, AlertCircle, CheckCircle, Upload, Eye, Trash2, 
  AlertTriangle, Star, ChevronDown, ChevronUp, FileImage
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
  type ParseResult 
} from '@/utils/structuredTextParser';
import type { DayWorkout } from '@/types/outlier';

interface TextModelImporterProps {
  onImport: (workouts: DayWorkout[]) => void;
}

export function TextModelImporter({ onImport }: TextModelImporterProps) {
  const [text, setText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleClear = () => {
    setText('');
    setParseResult(null);
    setShowPreview(false);
    setFileError(null);
  };

  // Toggle WOD principal no preview
  const toggleMainWod = (dayIndex: number, blockIndex: number) => {
    if (!parseResult) return;
    
    const updated = { ...parseResult };
    const day = updated.days[dayIndex];
    const clickedBlock = day.blocks[blockIndex];
    
    if (clickedBlock.isMainWod) {
      clickedBlock.isMainWod = false;
    } else {
      // Remove de todos os outros do dia
      day.blocks.forEach((block, idx) => {
        block.isMainWod = idx === blockIndex;
      });
    }
    
    // Atualiza alerta de WOD principal
    const hasMainWod = updated.days.some(d => d.blocks.some(b => b.isMainWod));
    updated.alerts = updated.alerts.filter(a => !a.includes('WOD principal'));
    if (!hasMainWod) {
      updated.alerts.push('Nenhum WOD principal definido');
    }
    
    setParseResult(updated);
  };

  // Handler para upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setFileError(null);
    
    // Por enquanto, apenas arquivos .txt são suportados no MVP
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          setText(content);
        }
      };
      reader.readAsText(file);
    } else {
      // PDF e imagens - fallback para texto
      setFileError('Não consegui ler esse arquivo com segurança.\nCole o texto do treino acima para continuar.');
    }
    
    // Limpa o input para permitir re-upload do mesmo arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Contagem de WODs principais definidos
  const mainWodCount = parseResult?.days.reduce(
    (count, day) => count + day.blocks.filter(b => b.isMainWod).length, 
    0
  ) || 0;

  // Verifica se pode publicar (tem pelo menos 1 WOD principal)
  const canPublish = parseResult?.success && mainWodCount > 0;

  return (
    <div className="space-y-4">
      {/* ÁREA 1 - TEXTO (PRINCIPAL) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Cole seu treino aqui
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParseResult(null);
              setShowPreview(false);
            }}
            placeholder={`Cole o treino como você escreveria no WhatsApp ou PDF.
O OUTLIER organiza tudo pra você antes de salvar.`}
            className="min-h-[180px] text-sm"
          />
          
          <p className="text-xs text-muted-foreground">
            Use títulos em MAIÚSCULO para separar blocos. O WOD principal pode ser marcado depois.
          </p>

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

      {/* ÁREA 2 - UPLOAD DE ARQUIVO (SECUNDÁRIA) */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileImage className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="font-medium text-sm text-foreground">
                Importar treino por arquivo (PDF ou imagem)
              </p>
              <p className="text-xs text-muted-foreground">
                Envie um PDF ou imagem do treino.
                Se for possível extrair o texto, o OUTLIER organiza pra você.
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                Escolher arquivo
              </Button>
              
              {fileError && (
                <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-600 whitespace-pre-line">
                    {fileError}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RESULTADO DO PARSE - PREVIEW */}
      <AnimatePresence>
        {parseResult && showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className={parseResult.success ? 'border-green-500/30' : 'border-destructive/30'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {parseResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    Foi isso que o OUTLIER entendeu do seu treino:
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Erros críticos */}
                {parseResult.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-1">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Problemas encontrados:
                    </p>
                    {parseResult.errors.map((error, idx) => (
                      <p key={idx} className="text-xs text-destructive flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {error}
                      </p>
                    ))}
                  </div>
                )}

                {/* Alertas leves (não bloqueiam) */}
                {parseResult.alerts.length > 0 && (
                  <Collapsible open={showAlerts} onOpenChange={setShowAlerts}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {parseResult.alerts.length} alerta(s) leve(s)
                        {showAlerts ? (
                          <ChevronUp className="w-3 h-3 ml-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-1" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                        {parseResult.alerts.map((alert, idx) => (
                          <p key={idx} className="text-xs text-amber-600 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            {alert}
                          </p>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Preview dos dias */}
                {parseResult.success && parseResult.days.length > 0 && (
                  <div className="space-y-3">
                    {parseResult.days.map((day, dayIndex) => (
                      <div key={day.day} className="border border-border rounded-lg overflow-hidden">
                        <div className="p-2 bg-secondary/30 flex items-center gap-2">
                          <Badge variant="outline">{getDayName(day.day)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {day.blocks.length} bloco(s)
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          {day.blocks.map((block, blockIndex) => (
                            <div 
                              key={blockIndex} 
                              className={`p-2 rounded space-y-1 ${
                                block.isMainWod 
                                  ? 'bg-primary/10 border border-primary/30' 
                                  : 'bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{block.title}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {getTypeLabel(block.type)}
                                </Badge>
                                {block.format !== 'outro' && (
                                  <Badge variant="outline" className="text-xs">
                                    {getFormatLabel(block.format)}
                                  </Badge>
                                )}
                                
                                {/* Botão para marcar WOD principal */}
                                <Button
                                  variant={block.isMainWod ? "default" : "ghost"}
                                  size="sm"
                                  className="h-6 text-xs ml-auto"
                                  onClick={() => toggleMainWod(dayIndex, blockIndex)}
                                >
                                  <Star className={`w-3 h-3 mr-1 ${block.isMainWod ? 'fill-current' : ''}`} />
                                  {block.isMainWod ? 'Principal' : 'Marcar como principal'}
                                </Button>
                              </div>
                              
                              {block.instruction && (
                                <p className="text-xs text-muted-foreground italic">
                                  {block.instruction}
                                </p>
                              )}
                              
                              <div className="text-xs text-muted-foreground">
                                {block.items.length} exercício(s):
                                <span className="ml-1">
                                  {block.items.slice(0, 3).map(i => 
                                    `${i.quantity} ${i.unit} ${i.movement}`
                                  ).join(', ')}
                                  {block.items.length > 3 && '...'}
                                </span>
                              </div>
                              
                              {block.coachNotes.length > 0 && (
                                <div className="text-xs text-amber-600">
                                  📝 {block.coachNotes.length} nota(s)
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Mensagem de validação para publicar */}
                    {parseResult.success && !canPublish && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm text-amber-600">
                          Para publicar, marque qual é o WOD principal.
                        </p>
                      </div>
                    )}

                    {/* Botão importar */}
                    <Button 
                      onClick={handleImport} 
                      className="w-full"
                      size="lg"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
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
