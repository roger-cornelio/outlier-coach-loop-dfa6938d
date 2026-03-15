/**
 * EventSearchPanel — Assisted search for race registration
 * Shows validated events, pending events, and manual fallback
 * 
 * UI: Tabs (Oficial/Paralela) + Pills (Região) + Conditional Estado dropdown
 */
import { useState, useCallback, useEffect } from 'react';
import { Search, ExternalLink, AlertTriangle, CheckCircle2, Clock, MapPin, Calendar, Globe, ShieldAlert, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDiscoveredEvents, type DiscoveredEvent } from '@/hooks/useDiscoveredEvents';
import { TIPO_EVENTO_LABELS, ORIGEM_LABELS } from '@/utils/eventConfidence';

interface EventSearchPanelProps {
  onSelectEvent: (event: DiscoveredEvent) => void;
  onRequestManual: () => void;
  onRequestReview: (event: DiscoveredEvent) => void;
}

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

type TipoTab = 'OFICIAL' | 'PARALELA';
type RegiaoFilter = 'BRASIL' | 'INTERNACIONAL';

export function EventSearchPanel({ onSelectEvent, onRequestManual, onRequestReview }: EventSearchPanelProps) {
  const { events, loading, searchEvents } = useDiscoveredEvents();
  const [query, setQuery] = useState('');
  const [tipoEvento, setTipoEvento] = useState<TipoTab>('OFICIAL');
  const [regiao, setRegiao] = useState<RegiaoFilter>('BRASIL');
  const [estado, setEstado] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const buildFilters = useCallback(() => {
    const filters: Record<string, string | undefined> = {
      query: query || undefined,
      tipo_evento: tipoEvento,
    };
    if (tipoEvento === 'PARALELA') {
      // Não oficiais: sempre Brasil, com filtro de estado opcional
      filters.pais = 'BR';
      if (estado && estado !== 'ALL') filters.estado = estado;
    } else {
      // Oficiais: respeitar filtro de região
      if (regiao === 'BRASIL') {
        filters.pais = 'BR';
        if (estado && estado !== 'ALL') filters.estado = estado;
      } else {
        filters.pais_neq = 'BR';
      }
    }
    return filters;
  }, [query, tipoEvento, regiao, estado]);

  const handleSearch = useCallback(() => {
    setHasSearched(true);
    searchEvents(buildFilters());
  }, [buildFilters, searchEvents]);

  // Auto-search on mount
  useEffect(() => {
    searchEvents({ tipo_evento: 'OFICIAL', pais: 'BR' });
    setHasSearched(true);
  }, [searchEvents]);

  // Debounced search on filter change
  useEffect(() => {
    const timer = setTimeout(handleSearch, 400);
    return () => clearTimeout(timer);
  }, [query, tipoEvento, regiao, estado, handleSearch]);

  // Reset estado when leaving Brasil filter
  useEffect(() => {
    if (regiao !== 'BRASIL') setEstado('');
  }, [regiao]);

  const REGIAO_OPTIONS: { key: RegiaoFilter; label: string }[] = [
    { key: 'BRASIL', label: 'Brasil' },
    { key: 'INTERNACIONAL', label: '✈️ Internacional' },
  ];

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar prova por nome, cidade ou organizador"
          className="pl-9"
        />
      </div>

      {/* Tabs: Oficial / Não Oficial */}
      <div className="flex border-b border-border">
        {(['OFICIAL', 'PARALELA'] as const).map(tipo => (
          <button
            key={tipo}
            onClick={() => setTipoEvento(tipo)}
            className={`flex-1 py-2 text-sm font-medium text-center transition-colors border-b-2 ${
              tipoEvento === tipo
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tipo === 'OFICIAL' ? 'Oficial HYROX' : 'Não Oficial'}
          </button>
        ))}
      </div>

      {/* Pills: Região — para Oficial */}
      {tipoEvento === 'OFICIAL' && (
        <div className="flex items-center gap-2 flex-wrap">
          {REGIAO_OPTIONS.map(r => (
            <button
              key={r.key}
              onClick={() => setRegiao(r.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                regiao === r.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Estado filter for Não Oficial */}
      {tipoEvento === 'PARALELA' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="w-[110px] h-7 text-xs rounded-full">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50 max-h-60">
              <SelectItem value="ALL">Todos</SelectItem>
              {ESTADOS.map(uf => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && (
        <div className="space-y-2">
          {events.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Search className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Nenhuma prova encontrada.
                </p>
                <Button
                  variant="link"
                  onClick={onRequestManual}
                  className="mt-2"
                >
                  Cadastrar manualmente
                </Button>
              </CardContent>
            </Card>
          ) : (
            events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={() => onSelectEvent(event)}
                onRequestReview={() => onRequestReview(event)}
              />
            ))
          )}
        </div>
      )}

      {/* Fallback */}
      {!loading && hasSearched && events.length > 0 && (
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Não encontrou a prova que procura?
          </p>
          <Button variant="link" size="sm" onClick={onRequestManual}>
            Cadastrar manualmente
          </Button>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onSelect, onRequestReview }: {
  event: DiscoveredEvent;
  onSelect: () => void;
  onRequestReview: () => void;
}) {
  const isValidated = event.status_validacao === 'VALIDADA';
  const isPending = event.status_validacao === 'AGUARDANDO_AUTORIZACAO_ADMIN';
  const isOwnManual = event.origem_principal === 'MANUAL';

  return (
    <Card className={isPending ? 'border-yellow-500/40 bg-yellow-500/5' : ''}>
      <CardContent className="py-3 px-4">
        <div className="flex flex-col gap-2">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground truncate">{event.nome}</span>
                <Badge
                  variant={event.tipo_evento === 'OFICIAL' ? 'default' : 'secondary'}
                  className="text-[10px] shrink-0"
                >
                  {TIPO_EVENTO_LABELS[event.tipo_evento] || event.tipo_evento}
                </Badge>
                {isPending && (
                  <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-600 shrink-0">
                    <Clock className="w-3 h-3 mr-1" />
                    Pendente
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Details row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {event.data_evento && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(event.data_evento), "dd/MM/yyyy")}
              </span>
            )}
            {(event.cidade || event.estado || event.pais) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[event.cidade, event.estado, event.pais !== 'BR' ? event.pais : null].filter(Boolean).join(', ')}
              </span>
            )}
            {event.origem_principal && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {ORIGEM_LABELS[event.origem_principal] || event.origem_principal}
              </span>
            )}
          </div>

          {/* Confidence bar — hide for own manual events */}
          {!isOwnManual && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    event.grau_confianca >= 70 ? 'bg-green-500' :
                    event.grau_confianca >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${event.grau_confianca}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-8 text-right">{event.grau_confianca}%</span>
            </div>
          )}

          {/* Insufficient data warning — hide for own manual events */}
          {isPending && !isOwnManual && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Esta prova foi encontrada, mas ainda não possui informações mínimas suficientes para entrar na base validada.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {(isValidated || isOwnManual) ? (
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={onSelect}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Selecionar
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={onRequestReview}>
                <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                Solicitar análise
              </Button>
            )}
            {event.url_origem && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                onClick={() => window.open(event.url_origem!, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
