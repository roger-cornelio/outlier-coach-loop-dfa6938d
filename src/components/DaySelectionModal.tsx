/**
 * DaySelectionModal - Modal obrigatório de seleção de dia para importação
 * 
 * MVP0 Anti-Burro:
 * - O sistema NUNCA tenta inferir dia da semana
 * - O sistema NUNCA salva conteúdo sem dia definido
 * - Todo conteúdo importado deve estar vinculado a um dia ANTES do upload
 */

import { useState } from 'react';
import { Calendar, Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import type { DayOfWeek } from '@/types/outlier';

// Lista de dias da semana com labels completos (MVP0)
const DAY_OPTIONS_FULL: { value: DayOfWeek; label: string }[] = [
  { value: 'seg', label: 'Segunda-feira' },
  { value: 'ter', label: 'Terça-feira' },
  { value: 'qua', label: 'Quarta-feira' },
  { value: 'qui', label: 'Quinta-feira' },
  { value: 'sex', label: 'Sexta-feira' },
  { value: 'sab', label: 'Sábado' },
  { value: 'dom', label: 'Domingo' },
];

interface DaySelectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (day: DayOfWeek) => void;
}

export function DaySelectionModal({ open, onClose, onConfirm }: DaySelectionModalProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | ''>('');

  const handleConfirm = () => {
    if (selectedDay) {
      onConfirm(selectedDay as DayOfWeek);
      setSelectedDay(''); // Reset para próximo uso
    }
  };

  const handleClose = () => {
    setSelectedDay(''); // Reset ao fechar
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5 text-primary" />
            Este treino é de qual dia?
          </DialogTitle>
          <DialogDescription>
            Selecione o dia da semana para continuar com a importação.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Dropdown de seleção de dia */}
          <Select 
            value={selectedDay} 
            onValueChange={(val) => setSelectedDay(val as DayOfWeek)}
          >
            <SelectTrigger className="w-full h-12 text-base">
              <SelectValue placeholder="Selecione o dia do treino" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {DAY_OPTIONS_FULL.map(opt => (
                <SelectItem 
                  key={opt.value} 
                  value={opt.value}
                  className="py-3 text-base"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Dica de UX */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Se um treino ocupar mais de um print, selecione o mesmo dia e envie todos os arquivos juntos.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedDay}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
