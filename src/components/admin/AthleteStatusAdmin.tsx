import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Trophy, 
  Target, 
  RotateCcw, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Settings,
  TrendingUp,
  Crown
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Types
interface LevelRule {
  level_key: string;
  level_order: number;
  label: string;
  training_min_sessions: number;
  training_window_days: number;
  benchmarks_required: number;
  benchmarks_source: string;
  official_race_required: boolean;
  cap_without_official_race_percent: number;
}

interface AthleteSimulation {
  trainingSessions: number;
  benchmarksCompleted: number;
  hasOfficialRace: boolean;
  validatedCategory: 'OPEN' | 'PRO' | 'ELITE';
}

/**
 * Jornada OUTLIER V1 — Only 3 active levels: OPEN, PRO, ELITE
 * 
 * Rules:
 * - Category (OPEN/PRO/ELITE) is determined by official race times via benchmarks_elite_pro + division_factors
 * - Journey progress = 50% training sessions + 50% benchmarks (no CAP, no window)
 * - Training sessions are permanent (no expiration), limited to 1/day
 * - Promotion to next category requires an official race result
 */

const DEFAULT_LEVEL_RULES: LevelRule[] = [
  { level_key: 'OPEN', level_order: 1, label: 'OPEN OUTLIER', training_min_sessions: 120, training_window_days: 99999, benchmarks_required: 3, benchmarks_source: 'ADMIN_DEFINED', official_race_required: false, cap_without_official_race_percent: 100 },
  { level_key: 'PRO', level_order: 2, label: 'PRO OUTLIER', training_min_sessions: 200, training_window_days: 99999, benchmarks_required: 5, benchmarks_source: 'ADMIN_DEFINED', official_race_required: true, cap_without_official_race_percent: 100 },
  { level_key: 'ELITE', level_order: 3, label: 'ELITE OUTLIER', training_min_sessions: 250, training_window_days: 99999, benchmarks_required: 8, benchmarks_source: 'ADMIN_DEFINED', official_race_required: true, cap_without_official_race_percent: 100 },
];

const LEVEL_COLORS: Record<string, string> = {
  OPEN: 'bg-emerald-500',
  PRO: 'bg-blue-500',
  ELITE: 'bg-yellow-500',
};

export function AthleteStatusAdmin() {
  const [activeTab, setActiveTab] = useState('levels');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  
  // Simulation state
  const [simulation, setSimulation] = useState<AthleteSimulation>({
    trainingSessions: 50,
    benchmarksCompleted: 2,
    hasOfficialRace: false,
    validatedCategory: 'PRO',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: levels, error } = await supabase
        .from('status_level_rules')
        .select('*')
        .order('level_order');
      
      if (error) throw error;
      
      // Filter to only active 3-level system
      const activeLevels = (levels || []).filter(
        l => ['OPEN', 'PRO', 'ELITE'].includes(l.level_key)
      );
      
      setLevelRules(activeLevels.length > 0 ? activeLevels : DEFAULT_LEVEL_RULES);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar configurações');
      setLevelRules(DEFAULT_LEVEL_RULES);
    } finally {
      setLoading(false);
    }
  };

  const saveLevelRules = async () => {
    setSaving(true);
    try {
      for (const rule of levelRules) {
        const { error } = await supabase
          .from('status_level_rules')
          .upsert(rule, { onConflict: 'level_key' });
        
        if (error) throw error;
      }
      toast.success('Regras de jornada salvas!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  const resetLevelRules = () => {
    setLevelRules([...DEFAULT_LEVEL_RULES]);
    toast.info('Valores resetados para padrão Jornada V1');
  };

  const updateLevelRule = (levelKey: string, field: keyof LevelRule, value: any) => {
    setLevelRules(prev => prev.map(rule => 
      rule.level_key === levelKey ? { ...rule, [field]: value } : rule
    ));
  };

  // Simulation: Jornada V1 — 50/50 training + benchmarks
  const simulationResult = useMemo(() => {
    const { trainingSessions, benchmarksCompleted, hasOfficialRace, validatedCategory } = simulation;
    
    // Categoria validada por prova oficial (sem prova: OPEN)
    const currentCategory = hasOfficialRace ? validatedCategory : 'OPEN';
    const currentRule = levelRules.find(l => l.level_key === currentCategory) || levelRules[0];
    
    if (!currentRule) {
      return { level: 'OPEN', progress: 0, details: [], isOutlier: false, outlierTitle: null };
    }
    
    const progressTraining = Math.min(1, trainingSessions / currentRule.training_min_sessions);
    const progressBenchmarks = Math.min(1, benchmarksCompleted / currentRule.benchmarks_required);
    
    // Jornada V1: 50/50 average, no CAP
    const overallProgress = (progressTraining + progressBenchmarks) / 2;
    const isOutlier = progressTraining >= 1 && progressBenchmarks >= 1;
    
    const details = [
      {
        label: 'Treinos (permanentes, 1/dia)',
        current: trainingSessions,
        required: currentRule.training_min_sessions,
        progress: progressTraining,
        weight: 0.5,
      },
      {
        label: 'Benchmarks internos',
        current: benchmarksCompleted,
        required: currentRule.benchmarks_required,
        progress: progressBenchmarks,
        weight: 0.5,
      },
    ];
    
    return {
      level: currentCategory,
      progress: Math.round(overallProgress * 100),
      details,
      isOutlier,
      outlierTitle: isOutlier ? `ATLETA OUTLIER — ${currentCategory}` : null,
    };
  }, [simulation, levelRules]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Crown className="w-6 h-6 text-primary" />
          Jornada OUTLIER
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure requisitos de treino e benchmarks por nível. A <strong>categoria</strong> (OPEN/PRO/ELITE) é definida por tempo de prova oficial na aba <strong>Classificação</strong>.
        </p>
      </div>

      {/* Rules explainer */}
      <div className="bg-muted/10 border border-border/20 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm mb-2">Regras Jornada V1</p>
        <p>1. <strong>Categoria</strong> (OPEN/PRO/ELITE) = tempo de prova oficial (benchmarks_elite_pro × fator_divisão)</p>
        <p>2. <strong>Progresso Jornada</strong> = 50% treinos + 50% benchmarks internos (sem CAP, sem janela)</p>
        <p>3. Treinos são <strong>permanentes</strong> (sem expiração), limitados a 1 por dia</p>
        <p>4. Título <strong>ATLETA OUTLIER — [Categoria]</strong> = jornada completa + categoria validada por prova</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="levels" className="gap-2">
            <Target className="w-4 h-4" />
            Requisitos por Nível
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Simulação
          </TabsTrigger>
        </TabsList>

        {/* Level Rules Tab */}
        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Requisitos por Nível</CardTitle>
                <CardDescription>
                  Treinos e benchmarks necessários para completar a jornada em cada nível
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetLevelRules}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset V1
                </Button>
                <Button size="sm" onClick={saveLevelRules} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Salvar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Nível</th>
                      <th className="text-center p-2">Treinos Min</th>
                      <th className="text-center p-2">Benchmarks</th>
                      <th className="text-center p-2">Prova Obrig.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelRules.map((rule) => (
                      <tr key={rule.level_key} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${LEVEL_COLORS[rule.level_key] || 'bg-muted'}`} />
                            <span className="font-medium">{rule.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {rule.level_key}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={rule.training_min_sessions}
                            onChange={(e) => updateLevelRule(rule.level_key, 'training_min_sessions', parseInt(e.target.value) || 0)}
                            className="w-20 text-center mx-auto"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={rule.benchmarks_required}
                            onChange={(e) => updateLevelRule(rule.level_key, 'benchmarks_required', parseInt(e.target.value) || 0)}
                            className="w-20 text-center mx-auto"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Switch
                            checked={rule.official_race_required}
                            onCheckedChange={(checked) => updateLevelRule(rule.level_key, 'official_race_required', checked)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Colunas removidas: Janela (dias) e Cap sem Prova (%) — não se aplicam na Jornada V1.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simulator" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Parâmetros do Atleta
                </CardTitle>
                <CardDescription>
                  Simule o progresso da jornada com diferentes dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Treinos Registrados (únicos por dia)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={simulation.trainingSessions}
                      onChange={(e) => setSimulation(s => ({ ...s, trainingSessions: parseInt(e.target.value) || 0 }))}
                      className="w-24"
                    />
                    <input
                      type="range"
                      min="0"
                      max="300"
                      value={simulation.trainingSessions}
                      onChange={(e) => setSimulation(s => ({ ...s, trainingSessions: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Benchmarks Concluídos</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={simulation.benchmarksCompleted}
                      onChange={(e) => setSimulation(s => ({ ...s, benchmarksCompleted: parseInt(e.target.value) || 0 }))}
                      className="w-24"
                    />
                    <input
                      type="range"
                      min="0"
                      max="15"
                      value={simulation.benchmarksCompleted}
                      onChange={(e) => setSimulation(s => ({ ...s, benchmarksCompleted: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Tem Prova Oficial?</Label>
                  <Switch
                    checked={simulation.hasOfficialRace}
                    onCheckedChange={(checked) => setSimulation(s => ({ ...s, hasOfficialRace: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria validada pela prova</Label>
                  <select
                    value={simulation.validatedCategory}
                    onChange={(e) => setSimulation(s => ({ ...s, validatedCategory: e.target.value as 'OPEN' | 'PRO' | 'ELITE' }))}
                    disabled={!simulation.hasOfficialRace}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="PRO">PRO</option>
                    <option value="ELITE">ELITE</option>
                  </select>
                </div>

                <p className="text-xs text-muted-foreground">
                  A categoria é definida pelo tempo da prova (aba Classificação). Aqui simulamos apenas o progresso da jornada.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Resultado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-6 bg-gradient-to-br from-muted to-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className={`w-4 h-4 rounded-full ${LEVEL_COLORS[simulationResult.level] || 'bg-muted'}`} />
                    <span className="text-2xl font-bold">
                      {simulationResult.isOutlier ? `OUTLIER ${simulationResult.level}` : simulationResult.level}
                    </span>
                  </div>
                  {simulationResult.outlierTitle && (
                    <Badge className="bg-primary/20 text-primary text-xs mt-2">
                      {simulationResult.outlierTitle}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progresso Jornada (50/50)</span>
                    <span className="font-bold">{simulationResult.progress}%</span>
                  </div>
                  <Progress value={simulationResult.progress} className="h-3" />
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Checklist</h4>
                  {simulationResult.details.map((detail, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {detail.progress >= 1 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium text-sm">{detail.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {detail.current} / {detail.required} ({Math.round(detail.weight * 100)}%)
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(detail.progress * 100)}%
                      </span>
                    </div>
                  ))}
                </div>

                {!simulation.hasOfficialRace && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="font-medium text-sm">Sem prova oficial</div>
                      <div className="text-xs text-muted-foreground">
                        Categoria permanece OPEN. Importe uma prova para classificação OUTLIER.
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
