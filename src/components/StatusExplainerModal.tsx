import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { 
  HelpCircle, 
  Trophy, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Target,
  Dumbbell,
  Medal,
  ChevronDown,
  Loader2,
  X,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';

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
    iniciante: 'BEGINNER',
    intermediario: 'INTERMEDIATE',
    avancado: 'ADVANCED',
    hyrox_open: 'OPEN',
    hyrox_pro: 'PRO',
  };
  return map[status] || 'BEGINNER';
}

// Human-readable race category descriptions
function getRaceDescription(raceCategory: string, rankTopN: number): string {
  const categoryLabel = raceCategory === 'PRO' ? 'PRO' : 'OPEN';
  return `Top ${rankTopN} na sua faixa de idade em prova ${categoryLabel}`;
}

// Jump rule descriptions
function getJumpRuleDescription(rule: JumpRule, levelLabel: string): string {
  if (rule.race_category === 'OPEN' && rule.rank_top_n <= 5) {
    return `Wildcard: Top ${rule.rank_top_n} em prova OPEN → ${levelLabel}`;
  }
  return `Top ${rule.rank_top_n} em prova ${rule.race_category} → ${levelLabel}`;
}

export function StatusExplainerModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  const [jumpRules, setJumpRules] = useState<JumpRule[]>([]);
  
  // Get athlete data
  const athleteStatus = useAthleteStatus();
  const { results } = useBenchmarkResults();
  
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
  
  // Get current level rule
  const currentLevelRule = useMemo(() => {
    return levelRules.find(r => r.level_key === currentLevelKey);
  }, [levelRules, currentLevelKey]);
  
  // Calculate "your case now" data
  const yourCase = useMemo(() => {
    if (!currentLevelRule) return null;
    
    // Count benchmarks completed (simplified - in real app would check within window)
    const benchmarksCompleted = results.length;
    
    // Training sessions would come from events/workout completions
    // For now, we'll estimate based on available data
    const trainingSessions = athleteStatus.benchmarksUsed * 4; // Rough estimate
    
    const hasOfficialRace = athleteStatus.statusSource === 'prova_oficial';
    
    const trainingProgress = Math.min(100, (trainingSessions / currentLevelRule.training_min_sessions) * 100);
    const benchmarkProgress = Math.min(100, (benchmarksCompleted / currentLevelRule.benchmarks_required) * 100);
    
    return {
      trainingSessions,
      trainingRequired: currentLevelRule.training_min_sessions,
      trainingWindow: currentLevelRule.training_window_days,
      trainingProgress,
      benchmarksCompleted,
      benchmarksRequired: currentLevelRule.benchmarks_required,
      benchmarkProgress,
      hasOfficialRace,
      officialRaceRequired: currentLevelRule.official_race_required,
      cap: currentLevelRule.cap_without_official_race_percent,
    };
  }, [currentLevelRule, results, athleteStatus]);
  
  // Group jump rules by target level
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
          <div className="overflow-y-auto h-[calc(85vh-80px)] pb-8">
            <Accordion type="single" collapsible defaultValue="level" className="mt-4">
              {/* Section A: O que define seu NÍVEL */}
              <AccordionItem value="level" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-base">O que define seu NÍVEL</h3>
                      <p className="text-xs text-muted-foreground">Sua melhor prova oficial</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-4 pl-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Seu nível é definido pela sua <strong>melhor prova oficial</strong>. 
                      Se você performa muito bem, seu nível sobe automaticamente.
                    </p>
                    
                    {/* Jump rules list */}
                    <div className="space-y-2">
                      {Object.entries(jumpRulesByLevel)
                        .sort((a, b) => {
                          const orderA = levelRules.find(l => l.level_key === a[0])?.level_order || 0;
                          const orderB = levelRules.find(l => l.level_key === b[0])?.level_order || 0;
                          return orderB - orderA;
                        })
                        .map(([level, rules]) => {
                          const levelRule = levelRules.find(l => l.level_key === level);
                          const isCurrentLevel = level === currentLevelKey;
                          
                          return (
                            <div 
                              key={level}
                              className={`p-3 rounded-xl border ${LEVEL_BG_COLORS[level]} ${isCurrentLevel ? 'ring-2 ring-primary/50' : ''}`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Medal className={`w-4 h-4 ${LEVEL_COLORS[level]}`} />
                                <span className={`font-semibold ${LEVEL_COLORS[level]}`}>
                                  {levelRule?.label || level}
                                </span>
                                {isCurrentLevel && (
                                  <Badge variant="outline" className="text-[10px] ml-auto">
                                    Seu nível
                                  </Badge>
                                )}
                              </div>
                              <ul className="space-y-1">
                                {rules.map(rule => (
                                  <li key={rule.jump_key} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <ChevronDown className="w-3 h-3 mt-1 rotate-[-90deg]" />
                                    {getJumpRuleDescription(rule, levelRule?.label || level)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                    </div>
                    
                    <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                      💡 <strong>Regra de ouro:</strong> Se mais de uma regra bater, 
                      vale sempre o <strong>nível mais alto</strong>.
                    </div>
                    
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                      <p className="text-blue-300">
                        <strong>Sem prova oficial?</strong> Seu nível máximo é <strong>Avançado</strong>. 
                        Participe de uma prova para desbloquear OPEN, PRO ou ELITE.
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section B: O que faz sua RÉGUA subir */}
              <AccordionItem value="ruler" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-base">O que faz sua RÉGUA subir</h3>
                      <p className="text-xs text-muted-foreground">Treinos + Benchmarks OUTLIER</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-4 pl-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A régua sobe com <strong>treinos registrados</strong> + <strong>benchmarks OUTLIER</strong> (testes internos).
                    </p>
                    
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm mb-4">
                      <p className="text-amber-300">
                        ⚠️ Benchmarks <strong>não são a prova oficial</strong>.
                      </p>
                    </div>
                    
                    {/* All levels - current level expanded, others collapsible */}
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
                                  {rule.official_race_required && (
                                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 border-purple-500/30 text-purple-300">
                                      Prova obrigatória
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
                                        Sem prova
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
                </AccordionContent>
              </AccordionItem>

              {/* Section C: O que pode travar seu progresso */}
              <AccordionItem value="blockers" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-base">O que pode travar seu progresso</h3>
                      <p className="text-xs text-muted-foreground">Bloqueios e requisitos</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-4 pl-2">
                    {currentLevelRule?.official_race_required ? (
                      <>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                            <div>
                              <p className="font-semibold text-red-300 mb-1">
                                Prova oficial obrigatória
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Para manter ou confirmar o nível <strong>{currentLevelRule.label}</strong>, 
                                você precisa de uma prova oficial válida.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                          <p className="text-sm text-amber-300">
                            🔒 <strong>Sem prova válida?</strong> Seu progresso fica travado em{' '}
                            <strong>{currentLevelRule.cap_without_official_race_percent}%</strong>.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                          <div>
                            <p className="font-semibold text-green-300 mb-1">
                              Sem travas!
                            </p>
                            <p className="text-sm text-muted-foreground">
                              O nível <strong>{currentLevelRule?.label}</strong> não exige prova oficial. 
                              Foque em treinos + benchmarks para progredir.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-secondary/30 rounded-lg p-3 text-sm text-muted-foreground">
                      💡 <strong>Lembre-se:</strong> A régua nunca sobe de nível sozinha. 
                      Ela só consolida sua posição. Para subir de nível, você precisa atingir 
                      as regras absolutas por prova.
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section D: Seu caso agora */}
              <AccordionItem value="your-case" className="border-none">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-base">Seu caso agora</h3>
                      <p className="text-xs text-muted-foreground">Checklist do seu progresso</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-4 pl-2">
                    {yourCase ? (
                      <>
                        {/* Current level badge */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${LEVEL_BG_COLORS[currentLevelKey]} border`}>
                          <Medal className={`w-4 h-4 ${LEVEL_COLORS[currentLevelKey]}`} />
                          <span className={`font-semibold text-sm ${LEVEL_COLORS[currentLevelKey]}`}>
                            {currentLevelRule?.label}
                          </span>
                        </div>
                        
                        {/* Checklist */}
                        <div className="space-y-3">
                          {/* Training */}
                          <div className="p-3 bg-secondary/30 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 text-sm">
                                <Dumbbell className="w-4 h-4" />
                                Treinos no período
                              </span>
                              <span className="text-sm font-semibold">
                                {yourCase.trainingSessions} / {yourCase.trainingRequired}
                              </span>
                            </div>
                            <Progress value={yourCase.trainingProgress} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              Últimos {yourCase.trainingWindow} dias
                            </p>
                          </div>
                          
                          {/* Benchmarks */}
                          <div className="p-3 bg-secondary/30 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="flex items-center gap-2 text-sm">
                                <Target className="w-4 h-4" />
                                Benchmarks concluídos
                              </span>
                              <span className="text-sm font-semibold">
                                {yourCase.benchmarksCompleted} / {yourCase.benchmarksRequired}
                              </span>
                            </div>
                            <Progress value={yourCase.benchmarkProgress} className="h-2" />
                          </div>
                          
                          {/* Official race */}
                          {yourCase.officialRaceRequired && (
                            <div className={`p-3 rounded-xl flex items-center justify-between ${
                              yourCase.hasOfficialRace 
                                ? 'bg-green-500/10 border border-green-500/20' 
                                : 'bg-red-500/10 border border-red-500/20'
                            }`}>
                              <span className="flex items-center gap-2 text-sm">
                                <Trophy className="w-4 h-4" />
                                Prova oficial
                              </span>
                              {yourCase.hasOfficialRace ? (
                                <span className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Validada
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-400 text-sm font-semibold">
                                  <XCircle className="w-4 h-4" />
                                  Faltando
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Status source */}
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">
                            <strong>Motivo do seu nível:</strong>{' '}
                            {athleteStatus.statusSource === 'prova_oficial' 
                              ? 'Validado por prova oficial'
                              : 'Estimado por benchmarks (sem prova oficial)'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <Target className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          Quando você registrar treinos, benchmarks e prova, 
                          este painel vai mostrar exatamente o que falta.
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
