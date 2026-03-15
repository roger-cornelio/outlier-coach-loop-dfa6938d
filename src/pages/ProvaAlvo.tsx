/**
 * ProvaAlvo - Página de gerenciamento de provas da temporada
 * 
 * Permite cadastrar:
 * - Prova Alvo: principal prova do ciclo competitivo
 * - Provas Satélite: provas secundárias para testar estratégia
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Orbit, Plus, Calendar, Users, Trophy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProvaFormModal } from '@/components/ProvaFormModal';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAthleteRaces, type AthleteRace } from '@/hooks/useAthleteRaces';
import { toast } from 'sonner';
import { deduplicateRaceName } from '@/utils/raceNameDedup';

export interface Prova {
  id: string;
  type: 'ALVO' | 'SATELITE';
  nome: string;
  categoria: string;
  data: Date;
  participationType: 'INDIVIDUAL' | 'DUPLA';
  partnerAthleteId?: string;
  partnerAthleteName?: string;
  partnerPhone?: string;
  partnerInstagram?: string;
  athleteId: string;
  coachId: string;
  createdAt: Date;
}

export default function ProvaAlvo() {
  const navigate = useNavigate();
  const { provaAlvo, provasSatelite, loading, addRace, deleteRace } = useAthleteRaces();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'ALVO' | 'SATELITE'>('ALVO');

  const handleOpenModal = (type: 'ALVO' | 'SATELITE') => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleSaveProva = async (prova: Omit<Prova, 'id' | 'createdAt' | 'athleteId' | 'coachId'>) => {
    const result = await addRace({
      race_type: prova.type,
      nome: prova.nome,
      categoria: prova.categoria,
      race_date: prova.data.toISOString().split('T')[0],
      participation_type: prova.participationType,
      partner_name: prova.partnerAthleteName,
      partner_phone: prova.partnerPhone,
      partner_instagram: prova.partnerInstagram,
    });

    if (result) {
      toast.success(prova.type === 'ALVO' ? 'Prova Alvo cadastrada!' : 'Prova Satélite cadastrada!');
    } else {
      toast.error('Erro ao cadastrar prova');
    }
    setModalOpen(false);
  };

  const handleDeleteProva = async (id: string) => {
    await deleteRace(id);
    toast.success('Prova removida');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full self-stretch bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full self-stretch bg-background p-3 sm:p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/app')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Provas da Temporada
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie suas provas alvo e satélites
            </p>
          </div>
        </div>

        {/* Explicação dos tipos de prova */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Prova Alvo da Temporada</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                É a principal prova do seu ciclo competitivo. Seu coach vai usar essa data como 
                referência para organizar a periodização e fazer você chegar no pico de performance.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-muted-foreground/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Orbit className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Prova Satélite</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                São provas secundárias para testar estratégia, ritmo e execução. Elas ajudam a 
                ajustar o plano para a sua Prova Alvo.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => handleOpenModal('ALVO')}
            className="flex-1 gap-2"
            variant={provaAlvo ? 'outline' : 'default'}
          >
            <Target className="h-4 w-4" />
            {provaAlvo ? 'Alterar Prova Alvo' : 'Cadastrar Prova Alvo da Temporada'}
          </Button>
          <Button 
            onClick={() => handleOpenModal('SATELITE')}
            variant="outline"
            className="flex-1 gap-2"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Prova Satélite
          </Button>
        </div>

        {/* Prova Alvo */}
        {provaAlvo && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Sua Prova Alvo
            </h2>
            <ProvaCardDB race={provaAlvo} onDelete={handleDeleteProva} isAlvo />
          </div>
        )}

        {/* Provas Satélite */}
        {provasSatelite.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Orbit className="h-5 w-5 text-muted-foreground" />
              Provas Satélite ({provasSatelite.length})
            </h2>
            <div className="space-y-3">
              {provasSatelite.map(race => (
                <ProvaCardDB key={race.id} race={race} onDelete={handleDeleteProva} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!provaAlvo && provasSatelite.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Você ainda não cadastrou nenhuma prova.
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Comece cadastrando sua Prova Alvo da temporada!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal */}
      <ProvaFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={modalType}
        onSave={handleSaveProva}
      />
    </div>
  );
}

function ProvaCardDB({ 
  race, 
  onDelete, 
  isAlvo = false 
}: { 
  race: AthleteRace; 
  onDelete: (id: string) => void;
  isAlvo?: boolean;
}) {
  return (
    <Card className={isAlvo ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{deduplicateRaceName(race.nome)}</span>
              <Badge variant={isAlvo ? 'default' : 'secondary'} className="text-xs">
                {race.categoria}
              </Badge>
              {race.participation_type === 'DUPLA' && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  Dupla
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(parseISO(race.race_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              {race.partner_name && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {race.partner_name}
                </span>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(race.id)}
          >
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
