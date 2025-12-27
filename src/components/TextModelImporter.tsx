/**
 * TextModelImporter - Importador de treino via texto livre + arquivo
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FLUXO CANÔNICO DE INTERPRETAÇÃO — MVP0 — NÃO CRIAR VARIAÇÕES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * SOURCE OF TRUTH ÚNICO:
 * - O ÚNICO input para parsing é o valor do textarea (string)
 * - "Validar e Visualizar" SEMPRE chama: parseStructuredText(textareaValue)
 * - PROIBIDO: parsing por página, bloco por print, caminhos alternativos
 * 
 * MODAL DE DIA:
 * - Modal só abre APÓS analisar o texto do textarea
 * - Se 2+ dias detectados no texto → NÃO abre modal, vai direto pro preview
 * - Se 0 ou 1 dia → abre modal para coach escolher
 * - Dia selecionado = METADADO (nunca inserir no texto)
 * 
 * PRÉ-PROCESSAMENTO:
 * - Apenas normalização leve de quebras de linha
 * - NÃO apagar linhas, NÃO reformatar, NÃO inserir cabeçalhos
 * 
 * CRITÉRIO DE ACEITE:
 * - Copiar texto do textarea e colar de novo → preview idêntico (1:1)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * UX:
 * - Área 1: Texto livre (principal) - funciona sempre
 * - Área 2: Upload de arquivo (PDF/múltiplas imagens) - OCR preenche textarea
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, AlertCircle, CheckCircle, Upload, Eye, Trash2, 
  AlertTriangle, Star, FileImage, Loader2, Moon, MoreVertical, Pencil, Settings2
} from 'lucide-react';
import { BlockEditorModal } from './BlockEditorModal';
import { DaySelectionModal } from './DaySelectionModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  getDerivedTitle,
  normalizeText,
  type ParseResult 
} from '@/utils/structuredTextParser';
import { getBlockHeader } from '@/utils/blockDisplayUtils';
import type { DayOfWeek, DayWorkout } from '@/types/outlier';
import { BLOCK_CATEGORIES } from '@/utils/categoryValidation';

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

// Opções de tipo de bloco - Usar fonte única de categoryValidation
const BLOCK_TYPE_OPTIONS = BLOCK_CATEGORIES.map(cat => ({
  value: cat.value,
  label: cat.label,
}));

export function TextModelImporter({ onImport }: TextModelImporterProps) {
  const [text, setText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [restDays, setRestDays] = useState<Record<number, boolean>>({});
  const [editingBlockTitle, setEditingBlockTitle] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [editingBlock, setEditingBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // MVP0: Modal de seleção de dia - abre APENAS quando necessário
  const [showDayModal, setShowDayModal] = useState(false);

  // Detectar dias distintos no texto (determinístico, sem IA)
  const detectDaysInText = (textContent: string): number => {
    const normalized = textContent.toLowerCase();
    const dayPatterns = [
      /\b(segunda|seg)\b/,
      /\b(terça|terca|ter)\b/,
      /\b(quarta|qua)\b/,
      /\b(quinta|qui)\b/,
      /\b(sexta|sex)\b/,
      /\b(sábado|sabado|sab)\b/,
      /\b(domingo|dom)\b/,
    ];
    
    let count = 0;
    for (const pattern of dayPatterns) {
      if (pattern.test(normalized)) {
        count++;
      }
    }
    return count;
  };

  // Salvar linhas editadas de um bloco
  const saveBlockLines = (dayIndex: number, blockIndex: number, newLines: any[]) => {
    if (!parseResult) return;
    const updated = { ...parseResult };
    updated.days[dayIndex].blocks[blockIndex].lines = newLines;
    setParseResult(updated);
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * CANÔNICO — "Validar e Visualizar" — ÚNICO PONTO DE ENTRADA PARA PARSING
   * ═══════════════════════════════════════════════════════════════════════════
   * 
   * 1. Pega o valor ATUAL do textarea (source of truth)
   * 2. Detecta dias no texto (sem IA, determinístico)
   * 3. Se 2+ dias → preview direto | Se 0-1 dia → modal de seleção
   * 4. Chama parseStructuredText(textareaValue) — NUNCA outro parser
   * 
   * NÃO CRIAR VARIAÇÕES DESTE FLUXO
   * ═══════════════════════════════════════════════════════════════════════════
   */
  const handleParse = () => {
    // Source of truth: valor atual do textarea
    const textareaValue = text.trim();
    if (!textareaValue) return;
    
    // ORDEM: primeiro analisar texto, depois decidir sobre modal
    const daysDetected = detectDaysInText(textareaValue);
    
    // Se 2+ dias detectados no texto → ir direto para preview (multi-dia)
    if (daysDetected >= 2) {
      executeParseMultiDay();
      return;
    }
    
    // Se 0 ou 1 dia e não tem dia selecionado → mostrar modal
    if (!selectedDay) {
      setShowDayModal(true);
      return;
    }
    
    // Parsear com dia já definido
    executeParseWithDay(selectedDay);
  };
  
  /**
   * CANÔNICO — Parse para texto multi-dia (2+ dias detectados)
   * NÃO CRIAR VARIAÇÕES
   */
  const executeParseMultiDay = () => {
    const textareaValue = text.trim();
    if (!textareaValue) return;
    
    // ═══ PARSER CANÔNICO: recebe APENAS o texto do textarea ═══
    const result = parseStructuredText(textareaValue);
    
    // Texto multi-dia não precisa de seleção de dia
    result.needsDaySelection = false;
    
    setParseResult(result);
    setShowPreview(true);
    setRestDays({});
  };
  
  /**
   * CANÔNICO — Parse com dia selecionado (0-1 dias detectados)
   * 
   * CONTRATO FIXO:
   * - Parser recebe SOMENTE o texto do textarea (sem inserir dia)
   * - O dia é aplicado como METADADO depois do parsing
   * - NUNCA inserir cabeçalho de dia no texto
   * 
   * NÃO CRIAR VARIAÇÕES
   */
  const executeParseWithDay = (day: DayOfWeek) => {
    const textareaValue = text.trim();
    if (!textareaValue) return;
    
    // ═══ PARSER CANÔNICO: recebe APENAS o texto do textarea ═══
    const result = parseStructuredText(textareaValue);
    
    // MVP0 Fallback: Se parser não detectou blocos, criar bloco "Treino" padrão
    if (result.days.length === 0 || result.days.every(d => d.blocks.length === 0)) {
      result.days = [{
        day: day,
        blocks: [{
          title: 'Treino',
          type: '' as any, // Categoria obrigatória - coach deve selecionar
          format: '',
          isMainWod: false,
          isBenchmark: false,
          optional: false,
          items: [],
          lines: text.split('\n').filter(line => line.trim()).map((line, idx) => ({
            id: `fallback-${idx}`,
            text: line.trim(),
            type: 'comment' as const,
          })),
          coachNotes: [],
          instructions: [],
          isAutoGenTitle: true,
        }],
        alerts: ['Estrutura não detectada automaticamente. Revise o bloco e defina a categoria.'],
      }];
      result.success = true;
      result.warnings.push('O parser não detectou blocos estruturados. Foi criado um bloco único "Treino" para revisão.');
    }
    
    // Aplicar dia selecionado como METADADO (não altera texto)
    result.days.forEach(d => {
      d.day = day;
    });
    
    // Marcar que NÃO precisa de seleção de dia (já foi selecionado)
    result.needsDaySelection = false;
    
    setParseResult(result);
    setShowPreview(true);
    setRestDays({});
  };
  
  // Handler quando usuário confirma dia no modal
  const handleDayConfirmed = (day: DayOfWeek) => {
    setSelectedDay(day);
    setShowDayModal(false);
    // Executar parse imediatamente após selecionar o dia
    executeParseWithDay(day);
  };
  
  // Fechar modal sem confirmar
  const handleDayModalClose = () => {
    setShowDayModal(false);
  };

  const handleImport = () => {
    if (!parseResult?.success) return;
    
    // Check if day is required and selected
    if (parseResult.needsDaySelection && !selectedDay) {
      return; // Block import without day selection
    }
    
    // MVP0: Aplicar restDays no parseResult antes de converter
    const resultWithRestDays = {
      ...parseResult,
      days: parseResult.days.map((day, idx) => ({
        ...day,
        isRestDay: restDays[idx] || false,
      })),
    };
    
    const workouts = parsedToDayWorkouts(resultWithRestDays, selectedDay || undefined);
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
    // Marcar que não é mais auto-gerado se editou manualmente
    updated.days[dayIndex].blocks[blockIndex].isAutoGenTitle = false;
    setParseResult(updated);
  };

  // Excluir bloco do preview
  const deleteBlock = (dayIndex: number, blockIndex: number) => {
    if (!parseResult) return;
    
    const updated = { ...parseResult };
    const day = updated.days[dayIndex];
    const blockToDelete = day.blocks[blockIndex];
    
    // Impedir exclusão de bloco principal
    if (blockToDelete.isMainWod) {
      return; // Não exclui - a UI deve mostrar mensagem
    }
    
    // Remove o bloco
    day.blocks.splice(blockIndex, 1);
    
    // Reindexar títulos auto-gerados ("BLOCO X") para manter ordem visual correta
    let autoGenCounter = 0;
    day.blocks.forEach((block) => {
      if (block.isAutoGenTitle && block.title.match(/^BLOCO \d+$/)) {
        autoGenCounter++;
        block.title = `BLOCO ${autoGenCounter}`;
      }
    });
    
    setParseResult(updated);
    setDeleteConfirm(null);
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

  // MVP0: Handler para upload de arquivo - OCR apenas preenche textarea
  // NÃO dispara parsing nem preview automaticamente
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Processar arquivos imediatamente (sem exigir dia antes)
    await processFilesToTextarea(files);
  };
  
  // MVP0: Processar arquivos e APENAS preencher o textarea
  // O dia será selecionado ao clicar "Validar e Visualizar"
  const processFilesToTextarea = async (files: FileList) => {
    setFileError(null);
    setIsProcessingFile(true);
    // Limpar preview anterior ao iniciar novo processamento
    setParseResult(null);
    setShowPreview(false);
    setSelectedDay(null);
    
    try {
      // Check file types
      const fileArray = Array.from(files);
      const textFiles = fileArray.filter(f => f.type === 'text/plain' || f.name.endsWith('.txt'));
      const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
      const pdfFiles = fileArray.filter(f => f.type === 'application/pdf');
      
      // Handle text files directly - apenas preenche textarea
      if (textFiles.length > 0 && imageFiles.length === 0 && pdfFiles.length === 0) {
        const content = await textFiles[0].text();
        setText(content);
        setIsProcessingFile(false);
        // Limpa o input para permitir re-upload do mesmo arquivo
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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
        // MVP0: Apenas preenche o textarea - SEM parsing automático
        // O coach deve clicar "Validar e Visualizar" para parsear
        setText(data.text);
        // NÃO chama parseStructuredText aqui
        // NÃO seta parseResult aqui
        // NÃO seta showPreview aqui
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

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDAÇÕES ANTI-BURRO — MVP0
  // ═══════════════════════════════════════════════════════════════════════════

  // REGRA MVP0: Bloquear se qualquer bloco tiver título inválido
  const hasInvalidTitles = parseResult?.days.some((day, idx) => {
    if (restDays[idx]) return false;
    return day.blocks.some(b => isInvalidBlockTitle(getDerivedTitle(b), b));
  }) ?? false;

  // REGRA MVP0: Bloquear se qualquer bloco não tiver categoria definida
  // Categoria é OBRIGATÓRIA e NUNCA inferida automaticamente
  const blocksWithoutCategory = parseResult?.days.reduce((acc, day, dayIdx) => {
    if (restDays[dayIdx]) return acc;
    const missing = day.blocks.filter(b => !b.type);
    return acc + missing.length;
  }, 0) ?? 0;
  
  const hasMissingCategory = blocksWithoutCategory > 0;

  const allTrainingDaysHaveWod = parseResult?.days.every((day, idx) => {
    if (restDays[idx]) return true;
    if (day.blocks.every(b => b.optional)) return true;
    return day.blocks.some(b => b.isMainWod);
  }) ?? false;

  // Pode publicar: todos os requisitos atendidos
  const canPublish = parseResult?.success && 
    allTrainingDaysHaveWod && 
    !hasInvalidTitles &&
    !hasMissingCategory &&
    (!parseResult.needsDaySelection || selectedDay !== null);

  // Pode importar (rascunho): precisa de treino válido, títulos e categorias corretos
  const canImport = parseResult?.success && 
    !hasInvalidTitles &&
    !hasMissingCategory &&
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

                {/* MVP0: Dia já foi selecionado no modal obrigatório - mostrar badge informativo */}
                {selectedDay && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">
                      Dia selecionado: <span className="font-semibold">{DAY_OPTIONS.find(d => d.value === selectedDay)?.label}</span>
                    </span>
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
                            
                            // Verificar títulos inválidos em cada bloco (usando derivedTitle)
                            day.blocks.forEach((block, blockIdx) => {
                              if (isInvalidBlockTitle(getDerivedTitle(block), block)) {
                                issues.push({ type: 'titulo_invalido', blockIndex: blockIdx });
                              }
                            });
                            
                            // MVP0: Verificar blocos sem categoria definida
                            day.blocks.forEach((block, blockIdx) => {
                              if (!block.type) {
                                issues.push({ type: 'categoria_faltando', blockIndex: blockIdx });
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
                                      {dayIssues.map((issue, issueIdx) => {
                                        let issueMessage = '';
                                        
                                        if (issue.type === 'wod_principal') {
                                          issueMessage = 'Marcar o WOD principal';
                                        } else if (issue.type === 'categoria_faltando' && issue.blockIndex !== undefined) {
                                          // MVP0: Categoria obrigatória
                                          issueMessage = `Bloco ${issue.blockIndex + 1}: Selecione a categoria`;
                                        } else if (issue.type === 'titulo_invalido' && issue.blockIndex !== undefined) {
                                          const blockWithIssue = day.blocks[issue.blockIndex];
                                          const derived = getDerivedTitle(blockWithIssue);
                                          if (!derived || derived.length === 0) {
                                            issueMessage = `Bloco ${issue.blockIndex + 1}: Adicionar título do bloco`;
                                          } else {
                                            issueMessage = `Bloco ${issue.blockIndex + 1}: Ajustar título (parece exercício)`;
                                          }
                                        } else if (issue.type === 'dia_semana') {
                                          issueMessage = 'Selecionar o dia da semana';
                                        }
                                        
                                        return (
                                          <li key={issueIdx} className="text-sm text-amber-700 flex items-start gap-2">
                                            <span className="text-amber-500">•</span>
                                            {issueMessage}
                                          </li>
                                        );
                                      })}
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
                                    // Usar getBlockHeader para título + categoria consistentes
                                    const { headerTitle, headerMeta } = getBlockHeader(block, blockIndex);
                                    const derivedTitle = getDerivedTitle(block);
                                    const hasTitleError = isInvalidBlockTitle(derivedTitle, block);
                                    const titleError = getBlockTitleError(derivedTitle, block);
                                    
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
                                          {/* Título do bloco - SEMPRE EDITÁVEL se inválido ou sem título */}
                                          {/* Usa derivedTitle para determinar se precisa edição */}
                                          {hasTitleError || editingBlockTitle?.dayIndex === dayIndex && editingBlockTitle?.blockIndex === blockIndex ? (
                                            <input
                                              type="text"
                                              value={block.title || ''}
                                              onChange={(e) => changeBlockTitle(dayIndex, blockIndex, e.target.value)}
                                              onBlur={() => setEditingBlockTitle(null)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') setEditingBlockTitle(null);
                                              }}
                                              className={`font-semibold text-base bg-transparent border-b-2 focus:outline-none px-1 min-w-[150px] max-w-[220px] ${
                                                hasTitleError 
                                                  ? 'border-amber-500 text-amber-700 placeholder:text-amber-500/60'
                                                  : 'border-primary text-foreground placeholder:text-muted-foreground'
                                              }`}
                                              placeholder="Digite: Aquecimento, Força, etc."
                                              autoFocus
                                            />
                                          ) : (
                                            <span className="font-semibold text-base">
                                              {headerTitle}
                                              {headerMeta && (
                                                <span className="text-muted-foreground font-normal ml-2">• {headerMeta}</span>
                                              )}
                                            </span>
                                          )}
                                        
                                        {/* Badge Principal - fixo quando marcado */}
                                        {block.isMainWod && (
                                          <Badge className="bg-primary text-primary-foreground text-xs px-2">
                                            <Star className="w-3 h-3 mr-1 fill-current" />
                                            Principal
                                          </Badge>
                                        )}
                                        
                                        {/* Chip formatDisplay - exibe "EMOM 30'" se presente */}
                                        {block.formatDisplay && (
                                          <Badge variant="secondary" className="text-xs px-2 bg-muted text-muted-foreground">
                                            {block.formatDisplay}
                                          </Badge>
                                        )}
                                        
                                        {/* Dropdown categoria - OBRIGATÓRIO (MVP0: sem valor default) */}
                                        <Select
                                          value={block.type || ''}
                                          onValueChange={(val) => changeBlockType(dayIndex, blockIndex, val)}
                                        >
                                          <SelectTrigger 
                                            className={`h-7 w-auto min-w-[140px] text-xs ${
                                              !block.type 
                                                ? 'border-amber-500 bg-amber-500/10 text-amber-700 border-2' 
                                                : 'border-dashed'
                                            }`}
                                          >
                                            <SelectValue placeholder="Selecione a categoria" />
                                          </SelectTrigger>
                                          <SelectContent className="bg-popover z-50">
                                            {BLOCK_TYPE_OPTIONS.map(opt => (
                                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        
                                        {/* Chip de formato - se aplicável e não tiver formatDisplay */}
                                        {!block.formatDisplay && block.format !== 'outro' && (
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
                                        
                                        {/* Menu de ações do bloco */}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                              <MoreVertical className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem 
                                              onClick={() => setEditingBlockTitle({ dayIndex, blockIndex })}
                                              className="text-sm"
                                            >
                                              <Pencil className="w-4 h-4 mr-2" />
                                              Editar título
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => setEditingBlock({ dayIndex, blockIndex })}
                                              className="text-sm"
                                            >
                                              <Settings2 className="w-4 h-4 mr-2" />
                                              Editar bloco
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={() => setDeleteConfirm({ dayIndex, blockIndex })}
                                              className="text-sm text-destructive focus:text-destructive"
                                            >
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Excluir bloco
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      
                                      {/* ================================================
                                         LEGACY GUARD RAIL:
                                         block.instruction / block.instructions are DEPRECATED.
                                         Source of truth is block.lines.
                                         Do NOT render/use instruction(s) anywhere.
                                         ================================================ */}
                                      
                                      {/* DEV GUARD: Log legacy fields if present (dev only) */}
                                      {(() => {
                                        if (process.env.NODE_ENV === 'development') {
                                          const legacyInstruction = (block as any).instruction;
                                          const legacyInstructions = (block as any).instructions;
                                          if (legacyInstruction || (legacyInstructions && legacyInstructions.length > 0)) {
                                            console.debug('[LEGACY] instruction(s) present but ignored', { 
                                              blockIndex, 
                                              title: block.title,
                                              hasInstruction: !!legacyInstruction,
                                              hasInstructions: !!(legacyInstructions && legacyInstructions.length > 0)
                                            });
                                          }
                                        }
                                        return null;
                                      })()}
                                      
                                      {/* Exercícios - FONTE ÚNICA: block.lines (type==='exercise') */}
                                      {block.lines && block.lines.filter(l => l.type === 'exercise').length > 0 && (
                                        <div className="text-sm text-foreground mt-2 space-y-1 pl-2 border-l-2 border-primary/40">
                                          {block.lines.filter(l => l.type === 'exercise').map((line) => (
                                            <p key={line.id}>{line.text}</p>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* Comentários - FONTE ÚNICA: block.lines (type==='comment') com fail-safe anti-duplicação */}
                                      {(() => {
                                        const normalizedTitle = normalizeText(block.title);
                                        const normalizedFormat = block.formatDisplay ? normalizeText(block.formatDisplay) : '';
                                        const normalizedType = block.type ? normalizeText(block.type) : '';
                                        
                                        // Fail-safe: filtrar comentários que sejam iguais ao título, formato ou tipo
                                        // Também remove linhas vazias/whitespace
                                        const filteredComments = (block.lines || []).filter(l => {
                                          if (l.type !== 'comment') return false;
                                          const trimmed = l.text?.trim();
                                          if (!trimmed) return false; // Remove linhas vazias
                                          const normalized = normalizeText(l.text);
                                          if (normalized === normalizedTitle) return false;
                                          if (normalizedFormat && normalized === normalizedFormat) return false;
                                          if (normalizedType && normalized === normalizedType) return false;
                                          return true;
                                        });
                                        
                                        // Se não houver comentários após filtro, não renderizar a caixa
                                        if (filteredComments.length === 0) return null;
                                        
                                        return (
                                          <div className="text-xs text-muted-foreground mt-3 p-2 rounded bg-muted/30 border border-border/40 space-y-1">
                                            <span className="text-xs font-medium text-muted-foreground/70">💬 Comentários:</span>
                                            {filteredComments.map((line) => (
                                              <p key={line.id} className="italic">{line.text}</p>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>

                      {/* BANNER DE VALIDAÇÃO - STICKY E ANTI-BURRO */}
                      {parseResult.success && !canImport && (
                        <div className="sticky top-0 z-10 -mx-5 px-5 py-4 bg-amber-500/95 border-y-2 border-amber-600 shadow-lg">
                          <div className="space-y-2">
                            <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                              ⚠️ TREINO NÃO SALVO
                            </h3>
                            
                            {/* Mensagem prioritária: categoria faltando */}
                            {hasMissingCategory && (
                              <div className="space-y-1">
                                <p className="text-sm text-amber-900 font-medium">
                                  Falta definir a categoria de {blocksWithoutCategory} bloco{blocksWithoutCategory > 1 ? 's' : ''}.
                                </p>
                                <p className="text-xs text-amber-800/90">
                                  O OUTLIER não adivinha a categoria para não ajustar o treino errado para o atleta.
                                </p>
                                <p className="text-xs text-amber-800/90 font-medium">
                                  Selecione a categoria em cada bloco para continuar.
                                </p>
                              </div>
                            )}
                            
                            {/* Título inválido */}
                            {!hasMissingCategory && hasInvalidTitles && (
                              <p className="text-sm text-amber-900 font-medium">
                                Corrija os blocos com problemas de título antes de continuar.
                              </p>
                            )}
                            
                            {/* Dia da semana faltando */}
                            {!hasMissingCategory && !hasInvalidTitles && parseResult.needsDaySelection && !selectedDay && (
                              <p className="text-sm text-amber-900 font-medium">
                                Selecione o dia da semana para este treino.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* BANNER SECUNDÁRIO: WOD principal faltando (só aparece se canImport mas não canPublish) */}
                      {parseResult.success && canImport && !canPublish && (
                        <div className="sticky top-0 z-10 -mx-5 px-5 py-4 bg-blue-500/20 border-y border-blue-500/40">
                          <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                              💡 Dica: Marque o WOD principal
                            </h3>
                            <p className="text-xs text-blue-600">
                              Sem WOD principal definido, o treino será salvo como rascunho.
                            </p>
                          </div>
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm && parseResult?.days[deleteConfirm.dayIndex]?.blocks[deleteConfirm.blockIndex]?.isMainWod
                ? 'Não é possível excluir'
                : 'Excluir bloco?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && parseResult?.days[deleteConfirm.dayIndex]?.blocks[deleteConfirm.blockIndex]?.isMainWod
                ? 'Este bloco está marcado como WOD principal. Desmarque-o primeiro antes de excluir.'
                : 'Esta ação não pode ser desfeita. O bloco será removido do treino.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {deleteConfirm && !parseResult?.days[deleteConfirm.dayIndex]?.blocks[deleteConfirm.blockIndex]?.isMainWod && (
              <AlertDialogAction 
                onClick={() => deleteBlock(deleteConfirm.dayIndex, deleteConfirm.blockIndex)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de edição de linhas do bloco */}
      {editingBlock && parseResult && (
        <BlockEditorModal
          open={true}
          onOpenChange={(open) => !open && setEditingBlock(null)}
          blockTitle={getBlockHeader(parseResult.days[editingBlock.dayIndex].blocks[editingBlock.blockIndex], editingBlock.blockIndex).headerTitle}
          lines={parseResult.days[editingBlock.dayIndex].blocks[editingBlock.blockIndex].lines || []}
          onSave={(newLines) => saveBlockLines(editingBlock.dayIndex, editingBlock.blockIndex, newLines)}
        />
      )}

      {/* MVP0: Modal obrigatório de seleção de dia */}
      <DaySelectionModal
        open={showDayModal}
        onClose={handleDayModalClose}
        onConfirm={handleDayConfirmed}
      />
    </div>
  );
}
