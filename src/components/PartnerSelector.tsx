/**
 * PartnerSelector — List all registered OUTLIER athletes or register external partner
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, UserPlus, Users, Phone, Instagram, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

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
  const [allAthletes, setAllAthletes] = useState<RegisteredPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('');
  const [showExternalForm, setShowExternalForm] = useState(false);

  // External partner fields
  const [extName, setExtName] = useState('');
  const [extPhone, setExtPhone] = useState('');
  const [extInstagram, setExtInstagram] = useState('');

  // Load all athletes on mount
  useEffect(() => {
    async function loadAthletes() {
      setLoading(true);
      try {
        // Use a broad search to get all athletes (the RPC returns up to 20 per call)
        // We'll query profiles directly for the full list
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, name, email')
          .order('name', { ascending: true });

        if (!error && data) {
          const athletes: RegisteredPartner[] = data.map(p => ({
            id: p.user_id,
            name: p.name || p.email?.split('@')[0] || 'Sem nome',
          }));
          setAllAthletes(athletes);
        }
      } catch {
        setAllAthletes([]);
      } finally {
        setLoading(false);
      }
    }
    loadAthletes();
  }, []);

  // Filter athletes locally
  const filteredAthletes = useMemo(() => {
    if (!filterTerm.trim()) return allAthletes;
    const term = filterTerm.toLowerCase();
    return allAthletes.filter(a => a.name.toLowerCase().includes(term));
  }, [allAthletes, filterTerm]);

  const handleSelectRegistered = (athlete: RegisteredPartner) => {
    onChange({ type: 'registered', id: athlete.id, name: athlete.name });
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
    setFilterTerm('');
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
            Voltar à lista
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

  // List mode with filter
  return (
    <div className="space-y-2">
      <Label>Parceiro(a) de dupla</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={filterTerm}
          onChange={e => setFilterTerm(e.target.value)}
          placeholder="Filtrar por nome..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground ml-2">Carregando atletas...</span>
        </div>
      ) : filteredAthletes.length > 0 ? (
        <ScrollArea className="h-[200px] border rounded-lg">
          <div className="divide-y">
            {filteredAthletes.map(athlete => (
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
        </ScrollArea>
      ) : (
        <p className="text-xs text-muted-foreground py-2">
          {filterTerm ? `Nenhum atleta encontrado com "${filterTerm}".` : 'Nenhum atleta cadastrado.'}
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
