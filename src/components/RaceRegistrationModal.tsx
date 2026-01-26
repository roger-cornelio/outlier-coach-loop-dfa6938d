import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, Target, Compass, Users, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Race } from './SeasonRacesSection';

// Mock data for HYROX categories
const HYROX_CATEGORIES = [
  { value: 'open-men', label: 'HYROX Open Masculino' },
  { value: 'open-women', label: 'HYROX Open Feminino' },
  { value: 'pro-men', label: 'HYROX Pro Masculino' },
  { value: 'pro-women', label: 'HYROX Pro Feminino' },
  { value: 'doubles-men', label: 'HYROX Doubles Masculino' },
  { value: 'doubles-women', label: 'HYROX Doubles Feminino' },
  { value: 'doubles-mixed', label: 'HYROX Doubles Misto' },
  { value: 'relay-4', label: 'HYROX Relay (4 pessoas)' },
];

// Mock data for available partners
const MOCK_PARTNERS = [
  { id: 'partner-1', name: 'João Silva' },
  { id: 'partner-2', name: 'Maria Santos' },
  { id: 'partner-3', name: 'Pedro Costa' },
  { id: 'partner-4', name: 'Ana Oliveira' },
  { id: 'partner-5', name: 'Lucas Ferreira' },
];

interface RaceRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (race: Omit<Race, 'id' | 'raceType'>) => void;
  raceType: 'target' | 'satellite';
}

export function RaceRegistrationModal({ isOpen, onClose, onSubmit, raceType }: RaceRegistrationModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState<Date>();
  const [type, setType] = useState<'individual' | 'doubles'>('individual');
  const [partnerId, setPartnerId] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isTarget = raceType === 'target';
  const isFormValid = name.trim() && category && date && (type === 'individual' || partnerId);

  const handleSubmit = () => {
    if (!isFormValid || !date) return;

    const selectedPartner = MOCK_PARTNERS.find(p => p.id === partnerId);

    onSubmit({
      name: name.trim(),
      category: HYROX_CATEGORIES.find(c => c.value === category)?.label || category,
      date,
      type,
      partnerId: type === 'doubles' ? partnerId : undefined,
      partnerName: type === 'doubles' ? selectedPartner?.name : undefined,
    });

    // Reset form
    setName('');
    setCategory('');
    setDate(undefined);
    setType('individual');
    setPartnerId('');
  };

  const handleClose = () => {
    setName('');
    setCategory('');
    setDate(undefined);
    setType('individual');
    setPartnerId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isTarget ? "bg-primary/10" : "bg-muted"
            )}>
              {isTarget ? (
                <Target className="w-5 h-5 text-primary" />
              ) : (
                <Compass className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <DialogTitle>
                {isTarget ? 'Cadastrar Prova Alvo' : 'Cadastrar Prova Satélite'}
              </DialogTitle>
              <DialogDescription>
                {isTarget 
                  ? 'Defina sua principal prova da temporada'
                  : 'Adicione uma prova preparatória'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome da Prova */}
          <div className="space-y-2">
            <Label htmlFor="race-name">Nome da Prova</Label>
            <Input
              id="race-name"
              placeholder="Ex: HYROX São Paulo 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background"
            />
          </div>

          {/* Categoria HYROX */}
          <div className="space-y-2">
            <Label>Categoria HYROX</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {HYROX_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data da Prova */}
          <div className="space-y-2">
            <Label>Data da Prova</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tipo de Prova */}
          <div className="space-y-3">
            <Label>Tipo de Prova</Label>
            <RadioGroup 
              value={type} 
              onValueChange={(value) => setType(value as 'individual' | 'doubles')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer font-normal">
                  <User className="w-4 h-4" />
                  Individual
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="doubles" id="doubles" />
                <Label htmlFor="doubles" className="flex items-center gap-2 cursor-pointer font-normal">
                  <Users className="w-4 h-4" />
                  Dupla
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Partner Selection (conditional) */}
          {type === 'doubles' && (
            <div className="space-y-2">
              <Label>Parceiro(a) de Dupla</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione seu parceiro(a)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {MOCK_PARTNERS.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A dupla ficará vinculada para sincronização de treinos
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid}
            className={isTarget ? '' : 'bg-muted-foreground hover:bg-muted-foreground/90'}
          >
            Cadastrar Prova
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
