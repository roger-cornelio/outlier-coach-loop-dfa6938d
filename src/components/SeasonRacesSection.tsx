import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Compass, Calendar, Users, Trophy, Info } from 'lucide-react';
import { RaceRegistrationModal } from './RaceRegistrationModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Race {
  id: string;
  name: string;
  category: string;
  date: Date;
  type: 'individual' | 'doubles';
  partnerId?: string;
  partnerName?: string;
  raceType: 'target' | 'satellite';
}

// Mock data for registered races (empty initially)
const initialRaces: Race[] = [];

export function SeasonRacesSection() {
  const [races, setRaces] = useState<Race[]>(initialRaces);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRaceType, setModalRaceType] = useState<'target' | 'satellite'>('target');

  const targetRace = races.find(r => r.raceType === 'target');
  const satelliteRaces = races.filter(r => r.raceType === 'satellite');

  const handleOpenModal = (type: 'target' | 'satellite') => {
    setModalRaceType(type);
    setIsModalOpen(true);
  };

  const handleRegisterRace = (race: Omit<Race, 'id' | 'raceType'>) => {
    const newRace: Race = {
      ...race,
      id: crypto.randomUUID(),
      raceType: modalRaceType,
    };
    
    // If registering a target race, replace existing one
    if (modalRaceType === 'target') {
      setRaces(prev => [...prev.filter(r => r.raceType !== 'target'), newRace]);
    } else {
      setRaces(prev => [...prev, newRace]);
    }
    
    setIsModalOpen(false);
  };

  const handleRemoveRace = (raceId: string) => {
    setRaces(prev => prev.filter(r => r.id !== raceId));
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-6"
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Provas da Temporada</CardTitle>
              <CardDescription>
                Cadastre suas provas para otimizar sua periodização
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Prova Alvo Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Prova Alvo da Temporada</h3>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  É a principal prova do seu ciclo competitivo. Todo o planejamento de treinos 
                  será priorizado para que você chegue no melhor pico de performance nesta data.
                </p>
              </div>
            </div>

            {targetRace ? (
              <RaceCard race={targetRace} onRemove={handleRemoveRace} />
            ) : (
              <Button
                variant="outline"
                className="w-full h-14 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => handleOpenModal('target')}
              >
                <Target className="w-5 h-5 mr-2" />
                Cadastrar Prova Alvo
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Provas Satélite Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Provas Satélite</h3>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  São provas secundárias usadas como preparação, teste de estratégia ou 
                  ajuste de ritmo para a sua Prova Alvo.
                </p>
              </div>
            </div>

            {satelliteRaces.length > 0 && (
              <div className="space-y-2">
                {satelliteRaces.map(race => (
                  <RaceCard key={race.id} race={race} onRemove={handleRemoveRace} />
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full h-14 border-dashed border-2 hover:border-muted-foreground/50 hover:bg-muted/10 transition-all"
              onClick={() => handleOpenModal('satellite')}
            >
              <Compass className="w-5 h-5 mr-2" />
              Cadastrar Prova Satélite
            </Button>
          </div>
        </CardContent>
      </Card>

      <RaceRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRegisterRace}
        raceType={modalRaceType}
      />
    </motion.section>
  );
}

interface RaceCardProps {
  race: Race;
  onRemove: (id: string) => void;
}

function RaceCard({ race, onRemove }: RaceCardProps) {
  const isTarget = race.raceType === 'target';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-4 rounded-lg border ${
        isTarget 
          ? 'bg-primary/5 border-primary/30' 
          : 'bg-muted/20 border-border/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground truncate">{race.name}</h4>
            <Badge variant={isTarget ? "default" : "secondary"} className="shrink-0">
              {race.category}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(race.date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
            
            {race.type === 'doubles' && race.partnerName && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Dupla com {race.partnerName}
              </span>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onRemove(race.id)}
        >
          Remover
        </Button>
      </div>
    </motion.div>
  );
}
