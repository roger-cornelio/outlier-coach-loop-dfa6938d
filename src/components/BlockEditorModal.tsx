/**
 * BlockEditorModal - Editor de linhas do bloco (exercício/comentário)
 * 
 * Permite:
 * - Editar texto de cada linha
 * - Excluir linhas
 * - Mover linhas entre categorias (exercício <-> comentário)
 * - Adicionar novas linhas
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRight, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { ParsedLine, LineType } from '@/utils/structuredTextParser';
import { generateLineId } from '@/utils/structuredTextParser';

interface BlockEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockTitle: string;
  lines: ParsedLine[];
  onSave: (lines: ParsedLine[]) => void;
}

export function BlockEditorModal({
  open,
  onOpenChange,
  blockTitle,
  lines,
  onSave,
}: BlockEditorModalProps) {
  const [editedLines, setEditedLines] = useState<ParsedLine[]>([]);
  const [activeTab, setActiveTab] = useState<'exercise' | 'comment'>('exercise');

  // Sincronizar com lines quando abrir
  useEffect(() => {
    if (open) {
      setEditedLines([...lines]);
      setActiveTab('exercise');
    }
  }, [open, lines]);

  const exerciseLines = editedLines.filter(l => l.type === 'exercise');
  const commentLines = editedLines.filter(l => l.type === 'comment');

  // Editar texto de uma linha
  const handleEditLine = (lineId: string, newText: string) => {
    setEditedLines(prev =>
      prev.map(l => (l.id === lineId ? { ...l, text: newText } : l))
    );
  };

  // Excluir linha
  const handleDeleteLine = (lineId: string) => {
    setEditedLines(prev => prev.filter(l => l.id !== lineId));
  };

  // Mover linha para outra categoria
  const handleMoveLine = (lineId: string, newType: LineType) => {
    setEditedLines(prev =>
      prev.map(l => (l.id === lineId ? { ...l, type: newType } : l))
    );
  };

  // Adicionar nova linha
  const handleAddLine = (type: LineType) => {
    const newLine: ParsedLine = {
      id: generateLineId(),
      text: '',
      type,
    };
    setEditedLines(prev => [...prev, newLine]);
  };

  // Salvar e fechar
  const handleSave = () => {
    // Filtrar linhas vazias
    const cleanedLines = editedLines.filter(l => l.text.trim().length > 0);
    onSave(cleanedLines);
    onOpenChange(false);
  };

  const renderLineEditor = (line: ParsedLine, targetType: LineType) => (
    <div
      key={line.id}
      className="group flex gap-2 items-start p-2 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors"
    >
      <GripVertical className="w-4 h-4 text-muted-foreground/50 mt-2 flex-shrink-0" />
      
      <div className="flex-1 space-y-2">
        <Textarea
          value={line.text}
          onChange={(e) => handleEditLine(line.id, e.target.value)}
          placeholder={line.type === 'exercise' ? 'Ex: 10 Pull-ups' : 'Ex: Foco na técnica'}
          className="min-h-[60px] text-sm resize-none"
        />
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleMoveLine(line.id, targetType)}
          >
            <ArrowRight className="w-3 h-3 mr-1" />
            Mover para {targetType === 'exercise' ? 'Exercícios' : 'Comentários'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleDeleteLine(line.id)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar bloco: {blockTitle}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'exercise' | 'comment')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exercise" className="flex items-center gap-2">
              Exercícios
              <Badge variant="secondary" className="text-xs px-1.5">
                {exerciseLines.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="comment" className="flex items-center gap-2">
              Comentários
              <Badge variant="secondary" className="text-xs px-1.5">
                {commentLines.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exercise" className="flex-1 overflow-auto mt-4 space-y-2">
            {exerciseLines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum exercício neste bloco.
              </p>
            ) : (
              exerciseLines.map(line => renderLineEditor(line, 'comment'))
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => handleAddLine('exercise')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar exercício
            </Button>
          </TabsContent>

          <TabsContent value="comment" className="flex-1 overflow-auto mt-4 space-y-2">
            {commentLines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum comentário neste bloco.
              </p>
            ) : (
              commentLines.map(line => renderLineEditor(line, 'exercise'))
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => handleAddLine('comment')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar comentário
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
