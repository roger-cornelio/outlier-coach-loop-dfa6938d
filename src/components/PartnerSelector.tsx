/**
 * PartnerSelector — Search registered OUTLIER users or register external partner
 */
import { useState, useCallback } from 'react';
import { Search, UserPlus, Users, Phone, Instagram } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface RegisteredPartner {
  id: string;
  name: string;
}

export interface PartnerData {
  type: 'registered' | 'external';
  id?: string;
  name: string;
  phone?: string;
  instagram?: string;
}

interface PartnerSelectorProps {
  value: PartnerData | null;
  onChange: (partner: PartnerData | null) => void;
}

export function PartnerSelector({ value, onChange }: PartnerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<RegisteredPartner[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showExternalForm, setShowExternalForm] = useState(false);

  // External partner fields
  const [extName, setExtName] = useState('');
  const [extPhone, setExtPhone] = useState('');
  const [extInstagram, setExtInstagram] = useState('');

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.rpc('search_public_athletes', {
        search_term: searchTerm.trim(),
      });
      if (!error && data) {
        setResults(data as RegisteredPartner[]);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelectRegistered = (athlete: RegisteredPartner) => {
    onChange({ type: 'registered', id: athlete.id, name: athlete.name });
    setResults([]);
    setSearchTerm('');
    setHasSearched(false);
  };

  const handleSaveExternal = () => {
    if (!extName.trim() || !extPhone.trim()) return;
    onChange({
      type: 'external',
      name: extName.trim(),
      phone: extPhone.trim(),
      instagram: extInstagram.trim() || undefined,
    });
    setShowExternalForm(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
    setResults([]);
    setHasSearched(false);
    setShowExternalForm(false);
    setExtName('');
    setExtPhone('');
    setExtInstagram('');
  };

  // If partner is already selected, show summary
  if (value) {
    return (
      <div className="space-y-2">
        <Label>Parceiro(a) de dupla</Label>
        <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{value.name}</p>
              {value.type === 'external' && value.phone && (
                <p className="text-[10px] text-muted-foreground">{value.phone}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs shrink-0">
            Alterar
          </Button>
        </div>
      </div>
    );
  }

  // External partner registration form
  if (showExternalForm) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Cadastrar parceiro(a)</Label>
          <Button variant="ghost" size="sm" onClick={() => setShowExternalForm(false)} className="text-xs">
            Voltar à busca
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Seu parceiro(a) não tem conta no OUTLIER? Cadastre os dados abaixo.
        </p>
        <div className="space-y-2">
          <Label className="text-xs">Nome completo *</Label>
          <Input
            value={extName}
            onChange={e => setExtName(e.target.value)}
            placeholder="Nome completo do parceiro(a)"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Phone className="w-3 h-3" />
            Telefone *
          </Label>
          <Input
            value={extPhone}
            onChange={e => setExtPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Instagram className="w-3 h-3" />
            Instagram (opcional)
          </Label>
          <Input
            value={extInstagram}
            onChange={e => setExtInstagram(e.target.value)}
            placeholder="@usuario"
          />
        </div>
        <Button
          className="w-full"
          size="sm"
          disabled={!extName.trim() || !extPhone.trim()}
          onClick={handleSaveExternal}
        >
          Confirmar parceiro(a)
        </Button>
      </div>
    );
  }

  // Search mode
  return (
    <div className="space-y-2">
      <Label>Parceiro(a) de dupla</Label>
      <div className="flex gap-2">
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por nome ou email..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={!searchTerm.trim() || searchTerm.trim().length < 2 || searching}
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {searching && (
        <p className="text-xs text-muted-foreground">Buscando...</p>
      )}

      {hasSearched && !searching && results.length > 0 && (
        <div className="border rounded-lg overflow-hidden divide-y">
          {results.map(athlete => (
            <button
              key={athlete.id}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              onClick={() => handleSelectRegistered(athlete)}
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{athlete.name}</span>
            </button>
          ))}
        </div>
      )}

      {hasSearched && !searching && results.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum atleta encontrado com "{searchTerm}".
        </p>
      )}

      <Button
        type="button"
        variant="link"
        size="sm"
        className="text-xs gap-1 px-0"
        onClick={() => setShowExternalForm(true)}
      >
        <UserPlus className="w-3 h-3" />
        Meu parceiro(a) não tem conta no OUTLIER
      </Button>
    </div>
  );
}
