/**
 * ProvaFormModal - Modal para cadastro de provas (Alvo ou Satélite)
 * Now with assisted search + manual fallback
 */

import { useState } from 'react';
import { Target, Orbit, Users, Info, Search, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { EventSearchPanel } from '@/components/EventSearchPanel';
import { ManualEventForm } from '@/components/ManualEventForm';
import { useDiscoveredEvents, type DiscoveredEvent } from '@/hooks/useDiscoveredEvents';
import { toast } from 'sonner';
import type { Prova } from '@/pages/ProvaAlvo';

const HYROX_CATEGORIAS = [
  { value: 'HYROX', label: 'HYROX' },
  { value: 'HYROX_PRO', label: 'HYROX Pro' },
  { value: 'HYROX_DOUBLES', label: 'HYROX Doubles' },
  { value: 'HYROX_PRO_DOUBLES', label: 'HYROX Pro Doubles' },
  { value: 'HYROX_RELAY', label: 'HYROX Relay' },
  { value: 'HYROX_ADAPTIVE', label: 'HYROX Adaptive' },
];

const MOCK_ATLETAS = [
  { id: 'athlete-1', name: 'João Silva' },
  { id: 'athlete-2', name: 'Maria Santos' },
  { id: 'athlete-3', name: 'Pedro Oliveira' },
  { id: 'athlete-4', name: 'Ana Costa' },
  { id: 'athlete-5', name: 'Lucas Ferreira' },
];

type EntryMode = 'choose' | 'search' | 'manual' | 'details';

interface ProvaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'ALVO' | 'SATELITE';
  onSave: (prova: Omit<Prova, 'id' | 'createdAt' | 'athleteId' | 'coachId'>) => void;
}

export function ProvaFormModal({ open, onOpenChange, type, onSave }: ProvaFormModalProps) {
  const [entryMode, setEntryMode] = useState<EntryMode>('choose');
  const [selectedEvent, setSelectedEvent] = useState<DiscoveredEvent | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const { requestEventReview } = useDiscoveredEvents();

  // Detail form state
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState<Date | undefined>();
  const [participationType, setParticipationType] = useState<'INDIVIDUAL' | 'DUPLA'>('INDIVIDUAL');
  const [partnerId, setPartnerId] = useState('');

  const isAlvo = type === 'ALVO';

  const resetAll = () => {
    setEntryMode('choose');
    setSelectedEvent(null);
    setIsSubmittingManual(false);
    setNome('');
    setCategoria('');
    setData(undefined);
    setParticipationType('INDIVIDUAL');
    setPartnerId('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetAll();
    onOpenChange(newOpen);
  };

  const handleSelectEvent = (event: DiscoveredEvent) => {
    setSelectedEvent(event);
    setNome(event.nome);
    setCategoria(event.categoria_hyrox || '');
    if (event.data_evento) {
      setData(new Date(event.data_evento + 'T12:00:00'));
    }
    setEntryMode('details');
  };

  const handleRequestReview = async (event: DiscoveredEvent) => {
    toast.success('Solicitação de análise enviada ao Admin');
  };

  const handleManualSubmit = async (data: {
    nome: string;
    data_evento?: string;
    cidade?: string;
    estado?: string;
    url_origem?: string;
    observacao?: string;
  }) => {
    setIsSubmittingManual(true);
    try {
      const event = await requestEventReview(data);
      if (event) {
        if (event.status_validacao === 'VALIDADA') {
          handleSelectEvent(event);
          toast.success('Prova incluída e validada automaticamente!');
        } else {
          toast.success('Solicitação enviada para análise do Admin');
          // Still allow the user to proceed with manual data for their planning
          setNome(data.nome);
          if (data.data_evento) setData(new Date(data.data_evento + 'T12:00:00'));
          setEntryMode('details');
        }
      } else {
        toast.error('Erro ao enviar solicitação');
      }
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !categoria || !data) return;

    const partner = MOCK_ATLETAS.find(a => a.id === partnerId);

    onSave({
      type,
      nome,
      categoria,
      data,
      participationType,
      partnerAthleteId: participationType === 'DUPLA' ? partnerId : undefined,
      partnerAthleteName: participationType === 'DUPLA' ? partner?.name : undefined,
    });

    resetAll();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAlvo ? (
              <>
                <Target className="h-5 w-5 text-primary" />
                Cadastrar Prova Alvo
              </>
            ) : (
              <>
                <Orbit className="h-5 w-5 text-muted-foreground" />
                Cadastrar Prova Satélite
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isAlvo
              ? 'Defina sua principal prova do ciclo competitivo.'
              : 'Adicione uma prova secundária para testar estratégia e ritmo.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Choose entry mode */}
        {entryMode === 'choose' && (
          <div className="space-y-3 mt-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => setEntryMode('search')}
            >
              <Search className="w-5 h-5 text-primary shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">Selecionar prova encontrada</div>
                <div className="text-xs text-muted-foreground">Buscar em provas oficiais, paralelas e simulados</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => setEntryMode('manual')}
            >
              <PenLine className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">Cadastrar manualmente</div>
                <div className="text-xs text-muted-foreground">Inserir dados da prova que você conhece</div>
              </div>
            </Button>
          </div>
        )}

        {/* Step 2a: Search */}
        {entryMode === 'search' && (
          <div className="mt-2">
            <EventSearchPanel
              onSelectEvent={handleSelectEvent}
              onRequestManual={() => setEntryMode('manual')}
              onRequestReview={handleRequestReview}
            />
          </div>
        )}

        {/* Step 2b: Manual form */}
        {entryMode === 'manual' && (
          <div className="mt-2">
            <ManualEventForm
              onSubmit={handleManualSubmit}
              onBack={() => setEntryMode('choose')}
              isSubmitting={isSubmittingManual}
            />
          </div>
        )}

        {/* Step 3: Details (after selecting or manual submission) */}
        {entryMode === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {selectedEvent && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Prova selecionada. Complete os dados abaixo.
              </div>
            )}

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da prova *</Label>
              <Input
                id="nome"
                placeholder="Ex: HYROX São Paulo 2025"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
              />
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria HYROX *</Label>
              <Select value={categoria} onValueChange={setCategoria} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {HYROX_CATEGORIAS.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label>Data da prova *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !data && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={data}
                    onSelect={setData}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Participação */}
            <div className="space-y-3">
              <Label>Tipo de participação *</Label>
              <RadioGroup
                value={participationType}
                onValueChange={(value) => setParticipationType(value as 'INDIVIDUAL' | 'DUPLA')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="INDIVIDUAL" id="individual" />
                  <Label htmlFor="individual" className="font-normal cursor-pointer">Individual</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="DUPLA" id="dupla" />
                  <Label htmlFor="dupla" className="font-normal cursor-pointer flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Dupla
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {participationType === 'DUPLA' && (
              <div className="space-y-2">
                <Label>Parceiro(a) de dupla</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu parceiro(a)" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {MOCK_ATLETAS.map(atleta => (
                      <SelectItem key={atleta.id} value={atleta.id}>
                        {atleta.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-2">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Ao vincular sua dupla, seu coach poderá sincronizar os treinos para ambos.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setEntryMode('choose')}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!nome || !categoria || !data}
              >
                Salvar Prova
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
