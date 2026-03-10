import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play } from 'lucide-react';
import { DIVISION_OPTIONS } from './simulatorConstants';

interface SimulatorSetupModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (division: string) => void;
}

export function SimulatorSetupModal({ open, onClose, onStart }: SimulatorSetupModalProps) {
  const [division, setDivision] = useState<string>('HYROX Open Men');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo Simulado</DialogTitle>
          <DialogDescription>Escolha a divisão e comece a prova.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Divisão</label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIVISION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full h-12 text-lg gap-2" onClick={() => onStart(division)}>
            <Play className="w-5 h-5" />
            Começar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
