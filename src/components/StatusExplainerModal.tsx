import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  HelpCircle, 
  Trophy, 
  TrendingUp, 
  Target,
  Dumbbell,
  Medal,
  Loader2,
  Zap,
  Crown,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { type AthleteStatus } from '@/types/outlier';

// Types matching database tables
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

interface JumpRule {
  jump_key: string;
  is_enabled: boolean;
  race_category: string;
  rank_scope: string;
  rank_top_n: number;
  target_level: string;
}

// Level colors for visual consistency
const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'text-cyan-400',
  INTERMEDIATE: 'text-green-400',
  ADVANCED: 'text-orange-400',
  OPEN: 'text-purple-400',
  PRO: 'text-amber-400',
  ELITE: 'text-yellow-400',
};

const LEVEL_BG_COLORS: Record<string, string> = {
  BEGINNER: 'bg-cyan-500/10 border-cyan-500/20',
  INTERMEDIATE: 'bg-green-500/10 border-green-500/20',
  ADVANCED: 'bg-orange-500/10 border-orange-500/20',
  OPEN: 'bg-purple-500/10 border-purple-500/20',
  PRO: 'bg-amber-500/10 border-amber-500/20',
  ELITE: 'bg-yellow-500/10 border-yellow-500/20',
};

// Map athlete status to level key
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
  const [jumpRules, setJumpRules] = useState<JumpRule[]>([]);
  
  const athleteStatus = useAthleteStatus();
  const currentLevelKey = statusToLevelKey(athleteStatus.status);
  
  // Fetch rules from Supabase
  useEffect(() => {
    if (!open) return;
    
    const fetchRules = async () => {
      setLoading(true);
      try {
        const [levelsRes, jumpsRes] = await Promise.all([
          supabase.from('status_level_rules').select('*').order('level_order'),
          supabase.from('status_jump_rules').select('*').eq('is_enabled', true),
        ]);
        
        if (levelsRes.data) setLevelRules(levelsRes.data);
        if (jumpsRes.data) setJumpRules(jumpsRes.data);
      } catch (error) {
        console.error('Error fetching status rules:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRules();
  }, [open]);
  
  // Get HYROX levels only (OPEN, PRO, ELITE)
  const hyroxLevels = useMemo(() => {
    return levelRules.filter(r => ['OPEN', 'PRO', 'ELITE'].includes(r.level_key))
      .sort((a, b) => a.level_order - b.level_order);
  }, [levelRules]);
  
  // Group jump rules by target level, sorted by level order (ascending)
  const jumpRulesByLevel = useMemo(() => {
    const grouped: Record<string, JumpRule[]> = {};
    jumpRules.forEach(rule => {
      if (!grouped[rule.target_level]) {
        grouped[rule.target_level] = [];
      }
      grouped[rule.target_level].push(rule);
    });
    return grouped;
  }, [jumpRules]);

  // Get jump rule description
  function getJumpRuleDescription(rule: JumpRule): string {
    const isWildcard = rule.race_category === 'OPEN' && rule.target_level === 'PRO';
    if (isWildcard) {
      return `Top ${rule.rank_top_n} em prova OPEN (wildcard)`;
    }
    return `Top ${rule.rank_top_n} em prova ${rule.race_category}`;
  }

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
            Como funciona seu Status?
          </SheetTitle>
        </SheetHeader>
        
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="ruler" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ruler" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">O que faz a</span> Régua subir
              </TabsTrigger>
              <TabsTrigger value="hyrox" className="gap-2">
                <Trophy className="w-4 h-4" />
                Status HYROX
              </TabsTrigger>
            </TabsList>
            
            {/* TAB 1: O que faz a régua subir */}
            <TabsContent value="ruler" className="overflow-y-auto h-[calc(85vh-160px)] pb-8">
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A régua sobe com <strong>treinos registrados</strong> + <strong>benchmarks OUTLIER</strong>.
                </p>
                
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
                  <p className="text-amber-300">
                    ⚠️ Benchmarks são testes internos do OUTLIER. <strong>Não são a prova oficial.</strong>
                  </p>
                </div>
                
                {/* All levels accordion - ascending order */}
                <div className="space-y-2">
                  <Accordion type="single" collapsible defaultValue={currentLevelKey} className="space-y-2">
                    {levelRules.map((rule) => {
                      const isCurrentLevel = rule.level_key === currentLevelKey;
                      const levelColor = LEVEL_COLORS[rule.level_key] || 'text-muted-foreground';
                      const levelBg = LEVEL_BG_COLORS[rule.level_key] || 'bg-secondary/30 border-border/50';
                      
                      return (
                        <AccordionItem 
                          key={rule.level_key} 
                          value={rule.level_key}
                          className={`border rounded-xl overflow-hidden ${levelBg} ${isCurrentLevel ? 'ring-2 ring-primary/50' : ''}`}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center gap-3 w-full">
                              <Target className={`w-4 h-4 ${levelColor}`} />
                              <span className={`font-semibold ${levelColor}`}>
                                {rule.label}
                              </span>
                              {isCurrentLevel && (
                                <Badge variant="outline" className="text-[10px] ml-auto mr-2 bg-primary/10 border-primary/30">
                                  Seu nível
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3 pt-2 border-t border-border/30">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <Dumbbell className="w-4 h-4" />
                                  Treinos
                                </span>
                                <span className="font-semibold">
                                  {rule.training_min_sessions} <span className="text-xs text-muted-foreground font-normal">em {rule.training_window_days} dias</span>
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <Target className="w-4 h-4" />
                                  Benchmarks
                                </span>
                                <span className="font-semibold">
                                  {rule.benchmarks_required}
                                </span>
                              </div>
                              
                              {rule.official_race_required && (
                                <div className="flex items-center justify-between text-sm pt-2 border-t border-border/20">
                                  <span className="flex items-center gap-2 text-muted-foreground">
                                    <Trophy className="w-4 h-4" />
                                    Sem prova oficial
                                  </span>
                                  <span className="text-amber-400 font-semibold">
                                    Cap em {rule.cap_without_official_race_percent}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                  📊 <strong>Peso no cálculo:</strong> 60% treinos + 40% benchmarks
                </div>
              </div>
            </TabsContent>
            
            {/* TAB 2: Status HYROX */}
            <TabsContent value="hyrox" className="overflow-y-auto h-[calc(85vh-160px)] pb-8">
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Os níveis HYROX são definidos pela sua <strong>prova oficial</strong> e ranking na faixa de idade.
                </p>
                
                {/* HYROX levels - ascending order: OPEN → PRO → ELITE */}
                <div className="space-y-3">
                  {hyroxLevels.map((level) => {
                    const rules = jumpRulesByLevel[level.level_key] || [];
                    const levelColor = LEVEL_COLORS[level.level_key];
                    const levelBg = LEVEL_BG_COLORS[level.level_key];
                    const isCurrentLevel = level.level_key === currentLevelKey;
                    
                    return (
                      <div 
                        key={level.level_key}
                        className={`p-4 rounded-xl border ${levelBg} ${isCurrentLevel ? 'ring-2 ring-primary/50' : ''}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {level.level_key === 'ELITE' ? (
                            <Crown className={`w-5 h-5 ${levelColor}`} />
                          ) : (
                            <Medal className={`w-5 h-5 ${levelColor}`} />
                          )}
                          <span className={`font-bold text-lg ${levelColor}`}>
                            {level.label}
                          </span>
                          {isCurrentLevel && (
                            <Badge variant="outline" className="text-[10px] ml-auto bg-primary/10 border-primary/30">
                              Seu nível
                            </Badge>
                          )}
                        </div>
                        
                        {rules.length > 0 ? (
                          <ul className="space-y-2">
                            {rules.map(rule => (
                              <li key={rule.jump_key} className="text-sm text-muted-foreground flex items-center gap-2">
                                <ChevronRight className="w-3 h-3 text-primary" />
                                {getJumpRuleDescription(rule)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma regra configurada.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                  💡 <strong>Regra de ouro:</strong> Se mais de uma regra bater, vale sempre o <strong>nível mais alto</strong>.
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                  <p className="text-blue-300">
                    <strong>Sem prova oficial?</strong> Seu nível máximo é <strong>Avançado</strong>.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
