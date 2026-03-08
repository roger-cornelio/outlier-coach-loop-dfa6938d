/**
 * ManualEventForm — Fallback form for manual event submission
 * Used when no event is found via search
 */
import { useState, useMemo } from 'react';
import { ArrowLeft, Send, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getCitiesByState } from '@/config/brazilianCities';

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

interface ManualEventFormProps {
  onSubmit: (data: {
    nome: string;
    data_evento?: string;
    cidade?: string;
    estado?: string;
    url_origem?: string;
    observacao?: string;
  }) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function ManualEventForm({ onSubmit, onBack, isSubmitting }: ManualEventFormProps) {
  const [nome, setNome] = useState('');
  const [data, setData] = useState<Date | undefined>();
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [url, setUrl] = useState('');
  const [obs, setObs] = useState('');
  const [cityOpen, setCityOpen] = useState(false);

  const availableCities = useMemo(() => {
    if (!estado) return [];
    return getCitiesByState(estado);
  }, [estado]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSubmit({
      nome: nome.trim().toUpperCase(),
      data_evento: data ? data.toISOString().split('T')[0] : undefined,
      cidade: cidade || undefined,
      estado: estado || undefined,
      url_origem: url.trim() || undefined,
      observacao: obs.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Voltar à busca
      </Button>

      <div className="text-sm text-muted-foreground">
        Preencha o que souber. Se a prova não tiver dados mínimos, ela entrará para análise do admin.
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nome da prova *</Label>
          <Input
            value={nome}
            onChange={e => setNome(e.target.value.toUpperCase())}
            placeholder="Ex: SIMULADO HYROX ARENA FIT"
            required
            className="uppercase"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Data estimada</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal text-sm', !data && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data ? format(data, "dd/MM/yyyy", { locale: ptBR }) : 'Selecione a data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
              <Calendar
                mode="single"
                selected={data}
                onSelect={setData}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
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
          <div className="space-y-1.5">
            <Label className="text-xs">Cidade</Label>
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

        <div className="space-y-1.5">
          <Label className="text-xs">Link que encontrou</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Observação</Label>
          <Textarea
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Informações adicionais..."
            className="h-16 resize-none"
          />
        </div>

        <Button type="submit" className="w-full gap-2" disabled={!nome.trim() || isSubmitting}>
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Enviando...' : 'Solicitar inclusão'}
        </Button>
      </form>
    </div>
  );
}
