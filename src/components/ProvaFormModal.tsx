/**
 * ProvaFormModal - Modal para cadastro de provas (Alvo ou Satélite)
 * Now with assisted search + manual fallback
 * 
 * Regras:
 * - Nome é composto: Nome base + Cidade + Ano (derivado da data)
 * - Tipo de participação é inferido da categoria (Doubles = DUPLA)
 * - Cidade obrigatória, vinda de lista validada por estado
 */

import { useState, useMemo } from 'react';
import { Target, Orbit, Users, Info, Search, PenLine } from 'lucide-react';
import { PartnerSelector, type PartnerData } from '@/components/PartnerSelector';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { EventSearchPanel } from '@/components/EventSearchPanel';
import { ManualEventForm } from '@/components/ManualEventForm';
import { useDiscoveredEvents, type DiscoveredEvent } from '@/hooks/useDiscoveredEvents';
import { toast } from 'sonner';
import type { Prova } from '@/pages/ProvaAlvo';
import { getCitiesByState } from '@/config/brazilianCities';

const HYROX_CATEGORIAS = [
  { value: 'HYROX', label: 'HYROX' },
  { value: 'HYROX_PRO', label: 'HYROX Pro' },
  { value: 'HYROX_DOUBLES', label: 'HYROX Doubles' },
  { value: 'HYROX_PRO_DOUBLES', label: 'HYROX Pro Doubles' },
  { value: 'HYROX_RELAY', label: 'HYROX Relay' },
  { value: 'HYROX_ADAPTIVE', label: 'HYROX Adaptive' },
];

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const DOUBLES_CATEGORIES = ['HYROX_DOUBLES', 'HYROX_PRO_DOUBLES'];

type EntryMode = 'search' | 'manual' | 'details' | 'confirm';

interface ProvaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'ALVO' | 'SATELITE';
  onSave: (prova: Omit<Prova, 'id' | 'createdAt' | 'athleteId' | 'coachId'>) => void;
}

export function ProvaFormModal({ open, onOpenChange, type, onSave }: ProvaFormModalProps) {
  const [entryMode, setEntryMode] = useState<EntryMode>('search');
  const [selectedEvent, setSelectedEvent] = useState<DiscoveredEvent | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const { requestEventReview } = useDiscoveredEvents();

  // Structured name fields
  const [nomeBase, setNomeBase] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [cityOpen, setCityOpen] = useState(false);

  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState<Date | undefined>();
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);

  const isAlvo = type === 'ALVO';
  const isDupla = DOUBLES_CATEGORIES.includes(categoria);

  const availableCities = useMemo(() => {
    if (!estado) return [];
    return getCitiesByState(estado);
  }, [estado]);

  // Build full race name: "HYROX SÃO PAULO 2026" (Anti-burro: remove redundâncias)
  const nomeCompleto = useMemo(() => {
    let base = nomeBase.trim().toUpperCase();
    const cityUpper = cidade ? cidade.toUpperCase() : '';
    const yearStr = data ? data.getFullYear().toString() : '';

    // Normaliza para comparação sem acentos
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    
    let baseNorm = normalize(base);
    const cityNorm = normalize(cityUpper);
    const stateNorm = normalize(estado);

    // Remove cidade da base se o usuário digitou (ex: "HYROX SAO PAULO" → "HYROX")
    if (cityNorm && baseNorm.includes(cityNorm)) {
      base = base.replace(new RegExp(cityNorm, 'gi'), '').trim();
      baseNorm = normalize(base);
    }
    
    // Remove estado (UF) da base se digitado (ex: "HYROX SP" → "HYROX")
    if (stateNorm && new RegExp(`\\b${stateNorm}\\b`, 'i').test(baseNorm)) {
      base = base.replace(new RegExp(`\\b${stateNorm}\\b`, 'gi'), '').trim();
      baseNorm = normalize(base);
    }

    // Remove ano da base se digitado (ex: "HYROX 2026" → "HYROX")
    if (yearStr && baseNorm.includes(yearStr)) {
      base = base.replace(new RegExp(yearStr, 'g'), '').trim();
    }

    // Limpa espaços extras, hífens ou vírgulas perdidas
    base = base.replace(/^[\s,\-]+|[\s,-]+$/g, '').replace(/[\s-]+/g, ' ').trim();

    const parts = [base];
    if (cityUpper) parts.push(cityUpper);
    if (yearStr) parts.push(yearStr);

    return parts.filter(Boolean).join(' ');
  }, [nomeBase, cidade, estado, data]);

  const resetAll = () => {
    setEntryMode('search');
    setSelectedEvent(null);
    setIsSubmittingManual(false);
    setNomeBase('');
    setEstado('');
    setCidade('');
    setCityOpen(false);
    setCategoria('');
    setData(undefined);
    setPartnerData(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetAll();
    onOpenChange(newOpen);
  };

  const handleSelectEvent = (event: DiscoveredEvent) => {
    setSelectedEvent(event);
    setNomeBase(event.nome);
    setCategoria(event.categoria_hyrox || '');
    if (event.data_evento) {
      setData(new Date(event.data_evento + 'T12:00:00'));
    }
    if (event.estado) setEstado(event.estado);
    if (event.cidade) setCidade(event.cidade);

    // Official events with complete data → confirm mode (read-only)
    const isComplete = event.nome && event.data_evento && event.cidade;
    setEntryMode(isComplete ? 'confirm' : 'details');
  };

  const handleRequestReview = async (_event: DiscoveredEvent) => {
    toast.success('Solicitação de análise enviada ao Admin');
  };

  const handleManualSubmit = async (formData: {
    nome: string;
    data_evento?: string;
    cidade?: string;
    estado?: string;
    url_origem?: string;
    observacao?: string;
  }) => {
    setIsSubmittingManual(true);
    try {
      const event = await requestEventReview(formData);
      if (event) {
        handleSelectEvent(event);
        toast.success('Prova cadastrada com sucesso!');
      } else {
        toast.error('Erro ao cadastrar prova');
      }
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Build confirm name from selected event (avoids duplication)
  const confirmName = useMemo(() => {
    if (!selectedEvent) return '';
    const base = selectedEvent.nome.trim().toUpperCase();
    const city = selectedEvent.cidade?.toUpperCase() || '';
    const year = selectedEvent.data_evento ? new Date(selectedEvent.data_evento + 'T12:00:00').getFullYear().toString() : '';
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    let clean = base;
    if (city && normalize(clean).includes(normalize(city))) {
      // City already in name, just append year
      return [clean, year].filter(Boolean).join(' ');
    }
    return [clean, city, year].filter(Boolean).join(' ');
  }, [selectedEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeBase.trim() || !categoria || !data || !cidade) return;

    const participationType = isDupla ? 'DUPLA' as const : 'INDIVIDUAL' as const;
    const partner = MOCK_ATLETAS.find(a => a.id === partnerId);

    onSave({
      type,
      nome: nomeCompleto,
      categoria,
      data,
      participationType,
      partnerAthleteId: isDupla ? partnerId : undefined,
      partnerAthleteName: isDupla ? partner?.name : undefined,
    });

    resetAll();
  };

  const handleConfirmSubmit = () => {
    if (!selectedEvent || !categoria || !data) return;

    const participationType = isDupla ? 'DUPLA' as const : 'INDIVIDUAL' as const;
    const partner = MOCK_ATLETAS.find(a => a.id === partnerId);

    onSave({
      type,
      nome: confirmName,
      categoria,
      data,
      participationType,
      partnerAthleteId: isDupla ? partnerId : undefined,
      partnerAthleteName: isDupla ? partner?.name : undefined,
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

        {/* Step: Search */}
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
              onBack={() => setEntryMode('search')}
              isSubmitting={isSubmittingManual}
            />
          </div>
        )}

        {/* Step 3a: Confirm mode — official event, read-only summary */}
        {entryMode === 'confirm' && selectedEvent && (
          <div className="space-y-4 mt-2">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-foreground text-base">{confirmName}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                📍 {selectedEvent.cidade}{selectedEvent.pais ? `, ${selectedEvent.pais}` : ''}
              </p>
              {data && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  📅 {format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categoria HYROX *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
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

            {isDupla && (
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
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setSelectedEvent(null); setEntryMode('search'); }}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!categoria}
                onClick={handleConfirmSubmit}
              >
                Salvar Prova
              </Button>
            </div>
          </div>
        )}

        {/* Step 3b: Details (after selecting or manual submission) */}
        {entryMode === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {selectedEvent && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Prova selecionada. Complete os dados abaixo.
              </div>
            )}

            {/* Nome da prova */}
            <div className="space-y-2">
              <Label htmlFor="nomeBase">Qual evento? *</Label>
              <Input
                id="nomeBase"
                placeholder="Ex: HYROX, BTD, WOD League"
                value={nomeBase}
                onChange={e => setNomeBase(e.target.value.toUpperCase())}
                className="uppercase"
                required
              />
            </div>

            {/* Estado + Cidade */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label className="text-xs">Estado *</Label>
                <Select value={estado} onValueChange={(v) => { setEstado(v); setCidade(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50 max-h-60">
                    {ESTADOS.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cidade *</Label>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityOpen}
                      className={cn('w-full justify-start text-left font-normal text-sm truncate', !cidade && 'text-muted-foreground')}
                      disabled={!estado}
                    >
                      {cidade || (estado ? 'Selecione' : 'Escolha UF')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0 bg-background border z-50" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cidade..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                        <CommandGroup>
                          {availableCities.map(c => (
                            <CommandItem
                              key={c}
                              value={c}
                              onSelect={() => { setCidade(c); setCityOpen(false); }}
                            >
                              {c}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Preview do nome completo */}
            {nomeBase.trim() && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                Nome salvo: <span className="font-semibold text-foreground">{nomeCompleto}</span>
              </div>
            )}

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

            {/* Parceiro de dupla — aparece automaticamente se categoria é Doubles */}
            {isDupla && (
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
                onClick={() => setEntryMode('search')}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!nomeBase.trim() || !categoria || !data || !cidade}
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
