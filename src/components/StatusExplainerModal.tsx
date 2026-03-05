import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  HelpCircle, 
  Trophy, 
  TrendingUp, 
  Target,
  Dumbbell,
  Loader2,
  Zap,
  Crown,
  ChevronRight,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Flag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { type AthleteStatus } from '@/types/outlier';

interface LevelRule {
  level_key: string;
  level_order: number;
  label: string;
  training_min_sessions: number;
  training_window_days: number;
  benchmarks_required: number;
  official_race_required: boolean;
  cap_without_official_race_percent: number;
}

const LEVEL_COLORS: Record<string, string> = {
  OPEN: 'text-purple-400',
  PRO: 'text-amber-400',
  ELITE: 'text-yellow-300',
};

const LEVEL_BG_COLORS: Record<string, string> = {
  OPEN: 'bg-purple-500/10 border-purple-500/20',
  PRO: 'bg-amber-500/10 border-amber-500/20',
  ELITE: 'bg-yellow-500/10 border-yellow-500/20',
};

function statusToLevelKey(status: AthleteStatus): string {
  const map: Record<AthleteStatus, string> = {
    open: 'OPEN',
    pro: 'PRO',
    elite: 'ELITE',
  };
  return map[status] || 'OPEN';
}

export function StatusExplainerModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  
  const athleteStatus = useAthleteStatus();
  const currentLevelKey = statusToLevelKey(athleteStatus.status);
  
  useEffect(() => {
    if (!open) return;
    
    const fetchRules = async () => {
      setLoading(true);
      try {
        const levelsRes = await supabase
          .from('status_level_rules')
          .select('*')
          .order('level_order');
        
        if (levelsRes.data) {
          setLevelRules(
            levelsRes.data
              .filter(l => ['OPEN', 'PRO', 'ELITE'].includes(l.level_key))
              .sort((a, b) => a.level_order - b.level_order)
          );
        }
      } catch (error) {
        console.error('Error fetching status rules:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRules();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1.5 text-muted-foreground hover:text-primary"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="text-sm">Como funciona?</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Zap className="w-5 h-5 text-primary" />
            Jornada OUTLIER
          </SheetTitle>
        </SheetHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="jornada" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="jornada" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Jornada
              </TabsTrigger>
              <TabsTrigger value="categoria" className="gap-2">
                <Trophy className="w-4 h-4" />
                Categoria
              </TabsTrigger>
            </TabsList>
            
            {/* TAB 1: Jornada OUTLIER */}
            <TabsContent value="jornada" className="overflow-y-auto h-[calc(85vh-160px)] pb-8">
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sua jornada avança com <strong>treinos concluídos</strong> e <strong>benchmarks OUTLIER</strong> realizados.
                  O objetivo é conquistar o título <strong className="text-primary">ATLETA OUTLIER</strong> na sua categoria.
                </p>

                {/* How it works */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Como a régua sobe
                  </h3>
                  
                  <div className="grid gap-2">
                    <div className="bg-secondary/30 rounded-lg p-3 text-sm flex items-start gap-3">
                      <Dumbbell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <strong>Treinos</strong>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          Cada dia treinado conta como 1 sessão (máximo 1 por dia). 
                          Válidos por <strong>12 meses</strong> — sessões mais antigas expiram.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-secondary/30 rounded-lg p-3 text-sm flex items-start gap-3">
                      <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <strong>Benchmarks</strong>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          Testes internos do OUTLIER. Cada benchmark único completado conta.
                          Válidos por <strong>12 meses</strong>.
                          <strong className="text-amber-400"> Não são a prova oficial.</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirements per level */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Flag className="w-4 h-4 text-primary" />
                    Requisitos por nível
                  </h3>
                  
                  <div className="space-y-2">
                    {levelRules.map((rule) => {
                      const isCurrentLevel = rule.level_key === currentLevelKey;
                      const levelColor = LEVEL_COLORS[rule.level_key] || 'text-muted-foreground';
                      const levelBg = LEVEL_BG_COLORS[rule.level_key] || 'bg-secondary/30 border-border/50';
                      
                      return (
                        <div
                          key={rule.level_key}
                          className={`border rounded-xl p-4 ${levelBg} ${isCurrentLevel ? 'ring-2 ring-primary/50' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Crown className={`w-4 h-4 ${levelColor}`} />
                            <span className={`font-bold ${levelColor}`}>
                              OUTLIER {rule.level_key}
                            </span>
                            {isCurrentLevel && (
                              <Badge variant="outline" className="text-[10px] ml-auto bg-primary/10 border-primary/30">
                                Sua jornada
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Dumbbell className="w-3.5 h-3.5" />
                              <span>{rule.training_min_sessions} treinos</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Target className="w-3.5 h-3.5" />
                              <span>{rule.benchmarks_required} benchmarks</span>
                            </div>
                          </div>

                          {rule.level_key !== 'OPEN' && (
                            <div className="mt-2 pt-2 border-t border-border/20 text-xs text-amber-400 flex items-center gap-1.5">
                              <Trophy className="w-3.5 h-3.5" />
                              Requer prova oficial na categoria {rule.level_key}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Flow explanation */}
                <div className="bg-secondary/30 rounded-lg p-3 text-sm space-y-2">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-primary" />
                    Fluxo de evolução
                  </p>
                  <div className="text-muted-foreground text-xs space-y-1">
                    <p>1. Comece como <strong className="text-purple-400">OPEN</strong> e avance para <strong className="text-purple-400">OUTLIER OPEN</strong> completando treinos + benchmarks.</p>
                    <p>2. Para subir de categoria (ex: OPEN → PRO), registre uma <strong className="text-amber-400">prova oficial</strong> com tempo compatível.</p>
                    <p>3. Na nova categoria, complete os requisitos para se tornar <strong>OUTLIER</strong> nela.</p>
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                  📊 <strong>Cálculo:</strong> 50% treinos + 50% benchmarks (média simples)
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-sm">
                  <p className="text-orange-300 flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>Validade de 12 meses:</strong> Treinos e benchmarks expiram após 12 meses. 
                      Após esse período, a régua de jornada zera e você precisa acumular novamente. 
                      Porém, sua <strong>categoria</strong> (OPEN/PRO/ELITE) permanece — ela é definida pela prova oficial e não expira.
                    </span>
                  </p>
                </div>
              </div>
            </TabsContent>
            
            {/* TAB 2: Categoria */}
            <TabsContent value="categoria" className="overflow-y-auto h-[calc(85vh-160px)] pb-8">
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sua <strong>categoria</strong> é definida exclusivamente pelo seu tempo em <strong>prova oficial</strong> HYROX.
                </p>
                
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
                  <p className="text-amber-300">
                    ⚠️ Sem prova oficial registrada, sua categoria é <strong>OPEN</strong>.
                  </p>
                </div>

                {/* Category cards */}
                <div className="space-y-2">
                  {levelRules.map((level) => {
                    const levelColor = LEVEL_COLORS[level.level_key];
                    const levelBg = LEVEL_BG_COLORS[level.level_key];
                    const isCurrentLevel = level.level_key === currentLevelKey;
                    
                    return (
                      <div 
                        key={level.level_key}
                        className={`p-4 rounded-xl border ${levelBg} ${isCurrentLevel ? 'ring-2 ring-primary/50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Crown className={`w-5 h-5 ${levelColor}`} />
                          <span className={`font-bold text-lg ${levelColor}`}>
                            {level.level_key}
                          </span>
                          {isCurrentLevel && (
                            <Badge variant="outline" className="text-[10px] ml-auto bg-primary/10 border-primary/30">
                              Sua categoria
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          {level.level_key === 'OPEN' && 'Categoria inicial. Todos os atletas começam aqui.'}
                          {level.level_key === 'PRO' && 'Requer prova oficial com tempo na faixa PRO.'}
                          {level.level_key === 'ELITE' && 'Requer prova oficial com tempo na faixa ELITE.'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Como mudar de categoria
                  </h3>
                  
                  <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground space-y-2">
                    <p className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      Registre sua prova oficial na aba <strong>"Prova Alvo"</strong>.
                    </p>
                    <p className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      Seu tempo determina automaticamente se você é OPEN, PRO ou ELITE.
                    </p>
                    <p className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      A mudança de categoria <strong>não reseta</strong> seus treinos e benchmarks. Porém, treinos e benchmarks expiram após <strong>12 meses</strong>.
                    </p>
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                  💡 <strong>Importante:</strong> Jornada (treinos + benchmarks) e Categoria (prova) são <strong>independentes</strong>. 
                  Você pode ser OUTLIER OPEN sem nunca ter feito uma prova oficial.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
