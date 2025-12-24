/**
 * TextModelImporter - Importador de treino via texto livre + arquivo
 * 
 * UX:
 * - Área 1: Texto livre (principal) - funciona sempre
 * - Área 2: Upload de arquivo (PDF/múltiplas imagens) - OCR via edge function
 * 
 * REGRAS:
 * - Parsing determinístico automático
 * - Preview obrigatório antes de importar
 * - Se dia não identificado, perguntar no preview
 * - Alertas leves não bloqueiam
 * - Apenas erros críticos bloqueiam
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, AlertCircle, CheckCircle, Upload, Eye, Trash2, 
  AlertTriangle, Star, FileImage, Loader2, Moon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { 
  parseStructuredText, 
  parsedToDayWorkouts,
  getDayName,
  getTypeLabel,
  getFormatLabel,
  isInvalidBlockTitle,
  getBlockTitleError,
  type ParseResult 
} from '@/utils/structuredTextParser';
import type { DayOfWeek, DayWorkout } from '@/types/outlier';

interface TextModelImporterProps {
  onImport: (workouts: DayWorkout[]) => void;
}

const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 'seg', label: 'Segunda' },
  { value: 'ter', label: 'Terça' },
  { value: 'qua', label: 'Quarta' },
  { value: 'qui', label: 'Quinta' },
  { value: 'sex', label: 'Sexta' },
  { value: 'sab', label: 'Sábado' },
  { value: 'dom', label: 'Domingo' },
];

// Opções de tipo de bloco para dropdown
const BLOCK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'aquecimento', label: 'Aquecimento' },
  { value: 'forca', label: 'Força' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'especifico', label: 'Específico' },
  { value: 'core', label: 'Core' },
  { value: 'corrida', label: 'Corrida' },
];

export function TextModelImporter({ onImport }: TextModelImporterProps) {
  const [text, setText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [restDays, setRestDays] = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = () => {
    if (!text.trim()) return;
    const result = parseStructuredText(text);
    setParseResult(result);
    setShowPreview(true);
    // Reset selections when parsing new text
    setSelectedDay(null);
    setRestDays({});
  };

  const handleImport = () => {
    if (!parseResult?.success) return;
    
    // Check if day is required and selected
    if (parseResult.needsDaySelection && !selectedDay) {
      return; // Block import without day selection
    }
    
    const workouts = parsedToDayWorkouts(parseResult, selectedDay || undefined);
    onImport(workouts);
    // Limpar após importar
    setText('');
    setParseResult(null);
    setShowPreview(false);
    setSelectedDay(null);
    setRestDays({});
  };

  const handleClear = () => {
    setText('');
    setParseResult(null);
    setShowPreview(false);
    setFileError(null);
    setSelectedDay(null);
    setRestDays({});
  };

  // Toggle Rest Day
  const toggleRestDay = (dayIndex: number) => {
    setRestDays(prev => ({
      ...prev,
      [dayIndex]: !prev[dayIndex]
    }));
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
    
    setParseResult(updated);
  };

  // Alterar tipo do bloco
  const changeBlockType = (dayIndex: number, blockIndex: number, newType: string) => {
    if (!parseResult) return;
    
    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].type = newType as any;
    setParseResult(updated);
  };

  // Alterar título do bloco
  const changeBlockTitle = (dayIndex: number, blockIndex: number, newTitle: string) => {
    if (!parseResult) return;
    
    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].title = newTitle;
    setParseResult(updated);
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handler para upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setFileError(null);
    setIsProcessingFile(true);
    
    try {
      // Check file types
      const fileArray = Array.from(files);
      const textFiles = fileArray.filter(f => f.type === 'text/plain' || f.name.endsWith('.txt'));
      const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
      const pdfFiles = fileArray.filter(f => f.type === 'application/pdf');
      
      // Handle text files directly
      if (textFiles.length > 0 && imageFiles.length === 0 && pdfFiles.length === 0) {
        const content = await textFiles[0].text();
        setText(content);
        setIsProcessingFile(false);
        return;
      }
      
      // Handle images and PDFs via OCR
      const filesToProcess = [...imageFiles, ...pdfFiles];
      
      if (filesToProcess.length === 0) {
        setFileError('Não consegui ler esse arquivo com segurança.\nCole o texto do treino acima para continuar.');
        setIsProcessingFile(false);
        return;
      }
      
      // Convert files to base64
      const base64Images: string[] = [];
      for (const file of filesToProcess) {
        const base64 = await fileToBase64(file);
        base64Images.push(base64);
      }
      
      // Call OCR edge function
      const { data, error } = await supabase.functions.invoke('extract-workout-text', {
        body: { images: base64Images }
      });
      
      if (error) {
        console.error('OCR error:', error);
        setFileError('Não consegui ler esse arquivo com segurança.\nCole o texto do treino acima para continuar.');
        setIsProcessingFile(false);
        return;
      }
      
      if (data?.success && data?.text) {
        setText(data.text);
      } else {
        setFileError(data?.error || 'Não consegui ler esse arquivo com segurança.\nCole o texto do treino acima para continuar.');
      }
    } catch (err) {
      console.error('File processing error:', err);
      setFileError('Não consegui ler esse arquivo com segurança.\nCole o texto do treino acima para continuar.');
    } finally {
      setIsProcessingFile(false);
      // Limpa o input para permitir re-upload do mesmo arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Contagem de WODs principais definidos (excluindo dias de descanso)
  const mainWodCount = parseResult?.days.reduce(
    (count, day, dayIndex) => {
      if (restDays[dayIndex]) return count; // Dias de descanso não precisam de WOD
      return count + (day.blocks.some(b => b.isMainWod) ? 1 : 0);
    }, 
    0
  ) || 0;

  // Contagem de dias que precisam de WOD (não são descanso)
  const daysNeedingWod = parseResult?.days.filter((_, idx) => !restDays[idx]).length || 0;

  // Verifica se pode publicar (tem WOD principal em cada dia de treino e dia definido se necessário)
  // Dias com todos blocos opcionais não precisam de WOD principal
  // REGRA ANTI-BURRO: Bloqueado se qualquer bloco tiver título inválido
  const hasInvalidTitles = parseResult?.days.some((day, idx) => {
    if (restDays[idx]) return false; // Dias de descanso ignorados
    return day.blocks.some(b => isInvalidBlockTitle(b.title));
  }) ?? false;

  const allTrainingDaysHaveWod = parseResult?.days.every((day, idx) => {
    if (restDays[idx]) return true; // Dias de descanso não precisam de WOD
    if (day.blocks.every(b => b.optional)) return true; // Dias só com opcionais não precisam de WOD
    return day.blocks.some(b => b.isMainWod);
  }) ?? false;

  const canPublish = parseResult?.success && 
    allTrainingDaysHaveWod && 
    !hasInvalidTitles &&
    (!parseResult.needsDaySelection || selectedDay !== null);

  // Verifica se pode importar (rascunho - apenas precisa de treino válido e títulos corretos)
  const canImport = parseResult?.success && 
    !hasInvalidTitles &&
    (!parseResult.needsDaySelection || selectedDay !== null);

  return (
    <div className="space-y-4">
      {/* ÁREA 1 - TEXTO (PRINCIPAL) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Cole seu treino aqui seguindo essa estrutura
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            O OUTLIER ajusta tudo pra você.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground space-y-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="font-medium text-foreground">Organize cada bloco pelo tipo de treino.</p>
            <p className="text-foreground">Ex: Aquecimento, Força, Condicionamento.</p>
            <div className="grid gap-1.5 mt-2">
              <p><span className="font-medium">DIA DA SEMANA</span> — Ex: SEGUNDA</p>
              <p><span className="font-medium">BLOCOS</span> — Ex: AQUECIMENTO, FORÇA, WOD</p>
              <p><span className="font-medium">EXERCÍCIOS</span> — Ex: 10 Pull-ups, 20m Sled Push</p>
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParseResult(null);
              setShowPreview(false);
            }}
            placeholder="Cole o treino aqui (texto, WhatsApp ou PDF)…"
            className="min-h-[180px] text-sm"
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
                accept=".txt,application/pdf,image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
                disabled={isProcessingFile}
              >
                {isProcessingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Escolher arquivo(s)
                  </>
                )}
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

                {/* Seletor de dia - quando necessário */}
                {parseResult.needsDaySelection && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <p className="text-sm text-amber-600">
                      Não identifiquei o dia da semana nesse treino. Escolha o dia para continuar.
                    </p>
                    <Select 
                      value={selectedDay || ''} 
                      onValueChange={(val) => setSelectedDay(val as DayOfWeek)}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Selecione o dia..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Preview dos dias - ACCORDION */}
                {parseResult.success && parseResult.days.length > 0 && (
                  <TooltipProvider>
                    <div className="space-y-4">
                      <Accordion type="single" collapsible className="space-y-4">
                        {parseResult.days.map((day, dayIndex) => {
                          const dayName = day.day ? getDayName(day.day) : (selectedDay ? getDayName(selectedDay) : 'Dia não definido');
                          const isRestDay = restDays[dayIndex] || false;
                          
                          // Verificar se todos blocos são opcionais
                          const allBlocksOptional = day.blocks.length > 0 && day.blocks.every(b => b.optional);
                          
                          // ========================================
                          // ALERTAS REATIVOS - Derivados em tempo real
                          // ========================================
                          // Função determinística que calcula issues do dia
                          const getDayIssues = (): { type: string; blockIndex?: number }[] => {
                            const issues: { type: string; blockIndex?: number }[] = [];
                            
                            // Dias de descanso não têm issues
                            if (isRestDay) return issues;
                            
                            // Verificar títulos inválidos em cada bloco
                            day.blocks.forEach((block, blockIdx) => {
                              if (isInvalidBlockTitle(block.title)) {
                                issues.push({ type: 'titulo_invalido', blockIndex: blockIdx });
                              }
                            });
                            
                            // Dias só com blocos opcionais não precisam de WOD
                            if (allBlocksOptional) return issues;
                            
                            // Verifica se tem WOD principal (REATIVO - usa estado atual do bloco)
                            const hasMainWod = day.blocks.some(b => b.isMainWod);
                            if (!hasMainWod && day.blocks.length > 0) {
                              issues.push({ type: 'wod_principal' });
                            }
                            
                            return issues;
                          };
                          
                          // Issues derivados - recalculados a cada render
                          const dayIssues = getDayIssues();
                          const issuesCount = dayIssues.length;
                          const hasIssues = issuesCount > 0;
                          
                          return (
                            <AccordionItem 
                              key={day.day || `day-${dayIndex}`} 
                              value={`day-${dayIndex}`}
                              className="border-2 border-border rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 bg-card"
                            >
                              <AccordionTrigger className="px-5 py-5 min-h-[72px] hover:no-underline hover:bg-secondary/30 transition-colors group">
                                <div className="flex items-center gap-4 flex-wrap flex-1 text-left">
                                  {/* Nome do dia em DESTAQUE */}
                                  <span className="font-bold text-lg uppercase tracking-wide text-foreground">
                                    {dayName}
                                  </span>
                                  
                                  {/* Contagem de blocos - secundário */}
                                  <span className="text-sm text-muted-foreground">
                                    {day.blocks.length} bloco{day.blocks.length !== 1 ? 's' : ''}
                                  </span>
                                  
                                  {/* Badge de descanso - bem visível */}
                                  {isRestDay && (
                                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-2 border-blue-500/30 px-3 py-1">
                                      <Moon className="w-4 h-4 mr-1.5" />
                                      DESCANSO
                                    </Badge>
                                  )}
                                  
                                  {/* Spacer para empurrar toggle e alerta para direita */}
                                  <div className="flex-1" />
                                  
                                  {/* ALERTA LARANJA - triângulo + número (REATIVO) */}
                                  {hasIssues && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40">
                                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                                      <span className="font-bold text-sm text-amber-600">{issuesCount}</span>
                                    </div>
                                  )}
                                  
                                  {/* Toggle descanso no header */}
                                  <div 
                                    className="flex items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">Descanso</span>
                                          <Switch
                                            checked={isRestDay}
                                            onCheckedChange={() => toggleRestDay(dayIndex)}
                                            className="data-[state=checked]:bg-blue-500"
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="bg-popover text-popover-foreground z-50">
                                        <p className="text-xs">Dia de descanso não exige WOD principal.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-5 pb-5">
                                {/* Alertas do dia - CAIXA LARANJA (REATIVO) */}
                                {hasIssues && (
                                  <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40">
                                    <div className="flex items-center gap-2 mb-3">
                                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                                      <span className="font-semibold text-sm text-amber-600">
                                        Ajustes pendentes neste dia:
                                      </span>
                                    </div>
                                    <ul className="space-y-1.5 ml-7">
                                      {dayIssues.map((issue, issueIdx) => (
                                        <li key={issueIdx} className="text-sm text-amber-700 flex items-start gap-2">
                                          <span className="text-amber-500">•</span>
                                          {issue.type === 'wod_principal' && 'Marcar o WOD principal'}
                                          {issue.type === 'titulo_invalido' && `Bloco ${(issue.blockIndex ?? 0) + 1}: Adicionar título do bloco (Ex: Aquecimento, Força)`}
                                          {issue.type === 'dia_semana' && 'Selecionar o dia da semana'}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {/* Mensagem de dia de descanso */}
                                {isRestDay && (
                                  <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 text-center">
                                    <p className="text-sm text-blue-600 flex items-center justify-center gap-2 font-medium">
                                      <Moon className="w-5 h-5" />
                                      Dia marcado como descanso
                                    </p>
                                  </div>
                                )}
                                
                                {/* Blocos do dia */}
                                <div className="space-y-4">
                                  {day.blocks.map((block, blockIndex) => {
                                    const hasTitleError = isInvalidBlockTitle(block.title);
                                    const titleError = getBlockTitleError(block.title);
                                    
                                    return (
                                      <div 
                                        key={blockIndex} 
                                        className={`p-4 rounded-xl space-y-3 transition-all duration-200 ${
                                          hasTitleError
                                            ? 'bg-amber-500/10 border-2 border-amber-500/50 shadow-md'
                                            : block.isMainWod 
                                              ? 'bg-primary/10 border-2 border-primary/40 shadow-sm' 
                                              : 'bg-muted/50 border border-border/60'
                                        }`}
                                      >
                                        {/* Erro de título - mensagem no topo do bloco */}
                                        {hasTitleError && titleError && (
                                          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 mb-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-xs text-amber-700 whitespace-pre-line">{titleError}</span>
                                          </div>
                                        )}
                                        
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {/* Título do bloco - SEMPRE EDITÁVEL se inválido ou fallback */}
                                          {hasTitleError || block.title.match(/^Bloco \d+$/) || block.title === 'Opcional' || block.title === '__FALLBACK_BLOCK__' ? (
                                            <input
                                              type="text"
                                              value={block.title === '__FALLBACK_BLOCK__' ? '' : block.title}
                                              onChange={(e) => changeBlockTitle(dayIndex, blockIndex, e.target.value)}
                                              className={`font-semibold text-base bg-transparent border-b-2 focus:outline-none px-1 min-w-[150px] max-w-[220px] ${
                                                hasTitleError 
                                                  ? 'border-amber-500 text-amber-700 placeholder:text-amber-500/60' 
                                                  : 'border-dashed border-muted-foreground/30 focus:border-primary'
                                              }`}
                                              placeholder="Digite: Aquecimento, Força, etc."
                                              autoFocus={hasTitleError}
                                            />
                                          ) : (
                                            <span className="font-semibold text-base">{block.title}</span>
                                          )}
                                        
                                        {/* Badge Principal - fixo quando marcado */}
                                        {block.isMainWod && (
                                          <Badge className="bg-primary text-primary-foreground text-xs px-2">
                                            <Star className="w-3 h-3 mr-1 fill-current" />
                                            Principal
                                          </Badge>
                                        )}
                                        
                                        {/* Dropdown do tipo - AJUSTE FINO */}
                                        <Select
                                          value={block.type}
                                          onValueChange={(val) => changeBlockType(dayIndex, blockIndex, val)}
                                        >
                                          <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-dashed">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {BLOCK_TYPE_OPTIONS.map(opt => (
                                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        {/* Chip de formato - se aplicável */}
                                        {block.format !== 'outro' && (
                                          <Badge variant="outline" className="text-xs px-2">
                                            {getFormatLabel(block.format)}
                                          </Badge>
                                        )}
                                        
                                        {/* Badge opcional */}
                                        {block.optional && (
                                          <Badge variant="outline" className="text-xs px-2 bg-blue-500/10 text-blue-600 border-blue-500/30">
                                            Opcional
                                          </Badge>
                                        )}
                                        
                                        {/* Spacer */}
                                        <div className="flex-1" />
                                        
                                        {/* Botão para marcar WOD principal */}
                                        {!isRestDay && !block.optional && (
                                          <Button
                                            variant={block.isMainWod ? "secondary" : "ghost"}
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => toggleMainWod(dayIndex, blockIndex)}
                                          >
                                            <Star className={`w-3 h-3 mr-1 ${block.isMainWod ? 'fill-current' : ''}`} />
                                            {block.isMainWod ? 'Desmarcar' : 'Marcar principal'}
                                          </Button>
                                        )}
                                      </div>
                                      
                                      {/* Instrução principal */}
                                      {block.instruction && (
                                        <p className="text-sm text-muted-foreground italic">
                                          {block.instruction}
                                        </p>
                                      )}
                                      
                                      {/* Instruções do bloco */}
                                      {block.instructions && block.instructions.length > 0 && (
                                        <div className="text-sm text-muted-foreground space-y-0.5">
                                          {block.instructions.map((instr, instrIdx) => (
                                            <p key={instrIdx}>{instr}</p>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Exercícios */}
                                      {block.items.length > 0 && (
                                        <div className="text-sm text-foreground mt-2 space-y-1 pl-2 border-l-2 border-border">
                                          {block.items.map((item, itemIdx) => {
                                            // Formatar peso para exibição humana (sem @ ou marcadores técnicos)
                                            const formatWeight = (w: string | undefined): string | null => {
                                              if (!w) return null;
                                              // Remove @ do início se existir
                                              let cleaned = w.replace(/^@\s*/, '').trim();
                                              // Converte marcadores técnicos
                                              if (cleaned === 'autorregulado') return '(autorregulado)';
                                              if (/^\d+\/\d+\s*kg$/i.test(cleaned)) return `(${cleaned})`;
                                              if (/^(?:pse|rpe)\s*\d+$/i.test(cleaned)) return `(${cleaned.toUpperCase()})`;
                                              if (/^\d+%$/.test(cleaned)) return `(${cleaned})`;
                                              if (/^\d+(?:[.,]\d+)?\s*kg$/i.test(cleaned)) return `(${cleaned})`;
                                              // Qualquer outro caso, envolve em parênteses
                                              return `(${cleaned})`;
                                            };
                                            
                                            const displayWeight = formatWeight(item.weight);
                                            
                                            return (
                                              <p key={itemIdx}>
                                                <span className="font-medium">{item.quantity}</span> {item.unit} {item.movement}
                                                {displayWeight && <span className="text-muted-foreground"> {displayWeight}</span>}
                                              </p>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>

                      {/* Mensagem de validação para publicar */}
                      {parseResult.success && !canPublish && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
                          <p className="text-sm text-amber-600 font-medium flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {hasInvalidTitles
                              ? 'O bloco precisa começar com o tipo de treino. Ex: Aquecimento, Força, Condicionamento.'
                              : parseResult.needsDaySelection && !selectedDay 
                                ? 'Para publicar, selecione o dia do treino.'
                                : 'Antes de publicar, marque o WOD principal dos dias de treino.'}
                          </p>
                        </div>
                      )}

                      {/* Info de quantidade de dias */}
                      <p className="text-sm text-muted-foreground text-center">
                        Você importou {parseResult.days.length} dia(s)
                        {Object.values(restDays).filter(Boolean).length > 0 && 
                          ` (${Object.values(restDays).filter(Boolean).length} de descanso)`
                        }
                      </p>

                      {/* Botão importar */}
                      <Button 
                        onClick={handleImport} 
                        className="w-full"
                        size="lg"
                        disabled={!canImport}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Importar treino
                      </Button>
                    </div>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
