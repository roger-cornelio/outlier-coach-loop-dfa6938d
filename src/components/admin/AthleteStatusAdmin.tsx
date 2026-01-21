import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Trophy, 
  Target, 
  Users, 
  RotateCcw, 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Settings,
  Zap,
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

interface JumpRule {
  jump_key: string;
  is_enabled: boolean;
  race_category: string;
  rank_scope: string;
  rank_top_n: number;
  target_level: string;
}

interface StatusConfig {
  id: number;
  progress_model: string;
  elite_requires_recency: boolean;
  elite_recency_days: number;
  downgrade_elite_to_level: string;
}

interface AthleteSimulation {
  trainingSessions: number;
  benchmarksCompleted: number;
  hasOfficialRace: boolean;
  raceCategory: string | null;
  ageGroupRank: number | null;
}

// Default seeds
const DEFAULT_LEVEL_RULES: LevelRule[] = [
  { level_key: 'BEGINNER', level_order: 1, label: 'Iniciante', training_min_sessions: 36, training_window_days: 90, benchmarks_required: 3, benchmarks_source: 'ADMIN_DEFINED', official_race_required: false, cap_without_official_race_percent: 89 },
  { level_key: 'INTERMEDIATE', level_order: 2, label: 'Intermediário', training_min_sessions: 100, training_window_days: 180, benchmarks_required: 5, benchmarks_source: 'ADMIN_DEFINED', official_race_required: false, cap_without_official_race_percent: 89 },
  { level_key: 'ADVANCED', level_order: 3, label: 'Avançado', training_min_sessions: 200, training_window_days: 365, benchmarks_required: 10, benchmarks_source: 'ADMIN_DEFINED', official_race_required: false, cap_without_official_race_percent: 89 },
  { level_key: 'OPEN', level_order: 4, label: 'HYROX OPEN', training_min_sessions: 220, training_window_days: 365, benchmarks_required: 10, benchmarks_source: 'ADMIN_DEFINED', official_race_required: true, cap_without_official_race_percent: 89 },
  { level_key: 'PRO', level_order: 5, label: 'HYROX PRO', training_min_sessions: 250, training_window_days: 365, benchmarks_required: 12, benchmarks_source: 'ADMIN_DEFINED', official_race_required: true, cap_without_official_race_percent: 89 },
  { level_key: 'ELITE', level_order: 6, label: 'HYROX ELITE', training_min_sessions: 250, training_window_days: 365, benchmarks_required: 12, benchmarks_source: 'ADMIN_DEFINED', official_race_required: true, cap_without_official_race_percent: 89 },
];

const DEFAULT_JUMP_RULES: JumpRule[] = [
  { jump_key: 'RACE_OPEN_TOP20_TO_OPEN', is_enabled: true, race_category: 'OPEN', rank_scope: 'AGE_GROUP', rank_top_n: 20, target_level: 'OPEN' },
  { jump_key: 'RACE_PRO_TOP20_TO_PRO', is_enabled: true, race_category: 'PRO', rank_scope: 'AGE_GROUP', rank_top_n: 20, target_level: 'PRO' },
  { jump_key: 'RACE_OPEN_TOP5_TO_PRO', is_enabled: true, race_category: 'OPEN', rank_scope: 'AGE_GROUP', rank_top_n: 5, target_level: 'PRO' },
  { jump_key: 'RACE_PRO_TOP5_TO_ELITE', is_enabled: true, race_category: 'PRO', rank_scope: 'AGE_GROUP', rank_top_n: 5, target_level: 'ELITE' },
];

const DEFAULT_CONFIG: StatusConfig = {
  id: 1,
  progress_model: 'CHECKLIST',
  elite_requires_recency: true,
  elite_recency_days: 365,
  downgrade_elite_to_level: 'PRO',
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'bg-slate-500',
  INTERMEDIATE: 'bg-blue-500',
  ADVANCED: 'bg-purple-500',
  OPEN: 'bg-orange-500',
  PRO: 'bg-red-500',
  ELITE: 'bg-yellow-500',
};

export function AthleteStatusAdmin() {
  const [activeTab, setActiveTab] = useState('levels');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [levelRules, setLevelRules] = useState<LevelRule[]>([]);
  const [jumpRules, setJumpRules] = useState<JumpRule[]>([]);
  const [config, setConfig] = useState<StatusConfig | null>(null);
  
  // Simulation state
  const [simulation, setSimulation] = useState<AthleteSimulation>({
    trainingSessions: 50,
    benchmarksCompleted: 4,
    hasOfficialRace: false,
    raceCategory: null,
    ageGroupRank: null,
  });

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch level rules
      const { data: levels, error: levelsError } = await supabase
        .from('status_level_rules')
        .select('*')
        .order('level_order');
      
      if (levelsError) throw levelsError;
      setLevelRules(levels || DEFAULT_LEVEL_RULES);

      // Fetch jump rules
      const { data: jumps, error: jumpsError } = await supabase
        .from('status_jump_rules')
        .select('*');
      
      if (jumpsError) throw jumpsError;
      setJumpRules(jumps || DEFAULT_JUMP_RULES);

      // Fetch config
      const { data: configData, error: configError } = await supabase
        .from('status_config')
        .select('*')
        .single();
      
      if (configError && configError.code !== 'PGRST116') throw configError;
      setConfig(configData || DEFAULT_CONFIG);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  // Save level rules
  const saveLevelRules = async () => {
    setSaving(true);
    try {
      for (const rule of levelRules) {
        const { error } = await supabase
          .from('status_level_rules')
          .upsert(rule, { onConflict: 'level_key' });
        
        if (error) throw error;
      }
      toast.success('Regras de nível salvas!');
    } catch (error) {
      console.error('Error saving level rules:', error);
      toast.error('Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  // Save jump rules
  const saveJumpRules = async () => {
    setSaving(true);
    try {
      for (const rule of jumpRules) {
        const { error } = await supabase
          .from('status_jump_rules')
          .upsert(rule, { onConflict: 'jump_key' });
        
        if (error) throw error;
      }
      toast.success('Regras de salto salvas!');
    } catch (error) {
      console.error('Error saving jump rules:', error);
      toast.error('Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetLevelRules = () => {
    setLevelRules([...DEFAULT_LEVEL_RULES]);
    toast.info('Valores resetados para padrão');
  };

  const resetJumpRules = () => {
    setJumpRules([...DEFAULT_JUMP_RULES]);
    toast.info('Valores resetados para padrão');
  };

  // Update level rule field
  const updateLevelRule = (levelKey: string, field: keyof LevelRule, value: any) => {
    setLevelRules(prev => prev.map(rule => 
      rule.level_key === levelKey ? { ...rule, [field]: value } : rule
    ));
  };

  // Update jump rule field
  const updateJumpRule = (jumpKey: string, field: keyof JumpRule, value: any) => {
    setJumpRules(prev => prev.map(rule => 
      rule.jump_key === jumpKey ? { ...rule, [field]: value } : rule
    ));
  };

  // Simulation calculations
  const simulationResult = useMemo(() => {
    const { trainingSessions, benchmarksCompleted, hasOfficialRace, raceCategory, ageGroupRank } = simulation;
    
    // 1. Check for absolute level from official race
    let absoluteLevel: string | null = null;
    let triggeredRule: JumpRule | null = null;
    
    if (hasOfficialRace && raceCategory && ageGroupRank !== null) {
      // Find matching jump rules (sorted by target level order - highest first)
      const matchingRules = jumpRules
        .filter(rule => 
          rule.is_enabled && 
          rule.race_category === raceCategory && 
          ageGroupRank <= rule.rank_top_n
        )
        .sort((a, b) => {
          const levelA = levelRules.find(l => l.level_key === a.target_level);
          const levelB = levelRules.find(l => l.level_key === b.target_level);
          return (levelB?.level_order || 0) - (levelA?.level_order || 0);
        });
      
      if (matchingRules.length > 0) {
        triggeredRule = matchingRules[0];
        absoluteLevel = triggeredRule.target_level;
      }
    }
    
    // 2. Calculate max level without race (ADVANCED)
    const maxLevelWithoutRace = absoluteLevel || 'ADVANCED';
    
    // 3. Find current level to calculate progress
    const currentLevelRule = absoluteLevel 
      ? levelRules.find(l => l.level_key === absoluteLevel)
      : levelRules.find(l => l.level_key === 'ADVANCED');
    
    if (!currentLevelRule) {
      return { level: 'BEGINNER', progress: 0, details: [], blockedReason: null };
    }
    
    // 4. Calculate progress components
    const progressTraining = Math.min(1, trainingSessions / currentLevelRule.training_min_sessions);
    const progressBenchmarks = Math.min(1, benchmarksCompleted / currentLevelRule.benchmarks_required);
    
    // 5. Apply progress formula
    let progressLevel: number;
    let blockedReason: string | null = null;
    
    if (!currentLevelRule.official_race_required) {
      progressLevel = 0.6 * progressTraining + 0.4 * progressBenchmarks;
    } else if (currentLevelRule.official_race_required && !hasOfficialRace) {
      progressLevel = Math.min(
        0.6 * progressTraining + 0.4 * progressBenchmarks,
        currentLevelRule.cap_without_official_race_percent / 100
      );
      blockedReason = `Prova oficial obrigatória (cap ${currentLevelRule.cap_without_official_race_percent}%)`;
    } else {
      progressLevel = 0.6 * progressTraining + 0.4 * progressBenchmarks;
    }
    
    const details = [
      {
        label: 'Treinos',
        current: trainingSessions,
        required: currentLevelRule.training_min_sessions,
        progress: progressTraining,
        weight: 0.6,
      },
      {
        label: 'Benchmarks',
        current: benchmarksCompleted,
        required: currentLevelRule.benchmarks_required,
        progress: progressBenchmarks,
        weight: 0.4,
      },
    ];
    
    return {
      level: absoluteLevel || maxLevelWithoutRace,
      progress: Math.round(progressLevel * 100),
      details,
      blockedReason,
      triggeredRule,
    };
  }, [simulation, levelRules, jumpRules]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-primary" />
            Status do Atleta
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure regras de nível absoluto e progressão
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="levels" className="gap-2">
            <Target className="w-4 h-4" />
            Regras por Nível
          </TabsTrigger>
          <TabsTrigger value="jumps" className="gap-2">
            <Zap className="w-4 h-4" />
            Nível Absoluto (Prova)
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Preview / Simulação
          </TabsTrigger>
        </TabsList>

        {/* Level Rules Tab */}
        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Regras por Nível</CardTitle>
                <CardDescription>
                  Defina requisitos de treinos, benchmarks e prova para cada nível
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetLevelRules}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset Defaults
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
                      <th className="text-center p-2">Janela (dias)</th>
                      <th className="text-center p-2">Benchmarks</th>
                      <th className="text-center p-2">Prova Obrig.</th>
                      <th className="text-center p-2">Cap sem Prova (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelRules.map((rule) => (
                      <tr key={rule.level_key} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${LEVEL_COLORS[rule.level_key]}`} />
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
                            value={rule.training_window_days}
                            onChange={(e) => updateLevelRule(rule.level_key, 'training_window_days', parseInt(e.target.value) || 0)}
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
                        <td className="p-2">
                          <Input
                            type="number"
                            value={rule.cap_without_official_race_percent}
                            onChange={(e) => updateLevelRule(rule.level_key, 'cap_without_official_race_percent', parseInt(e.target.value) || 0)}
                            className="w-20 text-center mx-auto"
                            disabled={!rule.official_race_required}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jump Rules Tab */}
        <TabsContent value="jumps" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Nível Absoluto por Prova Oficial</CardTitle>
                <CardDescription>
                  Regras que definem o nível absoluto baseado em ranking de prova oficial
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetJumpRules}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset Defaults
                </Button>
                <Button size="sm" onClick={saveJumpRules} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Salvar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {jumpRules.map((rule) => {
                  const targetLevel = levelRules.find(l => l.level_key === rule.target_level);
                  return (
                    <Card key={rule.jump_key} className={`${!rule.is_enabled ? 'opacity-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${LEVEL_COLORS[rule.target_level]}`} />
                            <span className="font-semibold">{targetLevel?.label}</span>
                          </div>
                          <Switch
                            checked={rule.is_enabled}
                            onCheckedChange={(checked) => updateJumpRule(rule.jump_key, 'is_enabled', checked)}
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={rule.race_category === 'PRO' ? 'destructive' : 'default'}>
                              {rule.race_category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Categoria da prova
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Top</Label>
                            <Input
                              type="number"
                              value={rule.rank_top_n}
                              onChange={(e) => updateJumpRule(rule.jump_key, 'rank_top_n', parseInt(e.target.value) || 0)}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">
                              na faixa etária
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                            {rule.race_category} → Top {rule.rank_top_n} → {targetLevel?.label}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulator Tab */}
        <TabsContent value="simulator" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Parâmetros do Atleta
                </CardTitle>
                <CardDescription>
                  Configure os dados do atleta para simular o nível e progresso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Training sessions */}
                <div className="space-y-2">
                  <Label>Treinos Registrados</Label>
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

                {/* Benchmarks */}
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

                {/* Official race toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Tem Prova Oficial?</Label>
                    <Switch
                      checked={simulation.hasOfficialRace}
                      onCheckedChange={(checked) => setSimulation(s => ({ 
                        ...s, 
                        hasOfficialRace: checked,
                        raceCategory: checked ? 'OPEN' : null,
                        ageGroupRank: checked ? 15 : null,
                      }))}
                    />
                  </div>

                  {simulation.hasOfficialRace && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary/30">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select
                          value={simulation.raceCategory || 'OPEN'}
                          onValueChange={(v) => setSimulation(s => ({ ...s, raceCategory: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">OPEN</SelectItem>
                            <SelectItem value="PRO">PRO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Ranking na Faixa Etária</Label>
                        <Input
                          type="number"
                          value={simulation.ageGroupRank || ''}
                          onChange={(e) => setSimulation(s => ({ ...s, ageGroupRank: parseInt(e.target.value) || null }))}
                          placeholder="Ex: 5"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Result Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Resultado da Simulação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Level Display */}
                <div className="text-center p-6 bg-gradient-to-br from-muted to-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className={`w-4 h-4 rounded-full ${LEVEL_COLORS[simulationResult.level]}`} />
                    <span className="text-2xl font-bold">
                      {levelRules.find(l => l.level_key === simulationResult.level)?.label}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {simulationResult.level}
                  </Badge>
                  
                  {simulationResult.triggeredRule && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Regra disparada:</span>
                      </div>
                      <p className="text-sm font-medium mt-1">
                        {simulationResult.triggeredRule.race_category} Top {simulationResult.triggeredRule.rank_top_n} → {levelRules.find(l => l.level_key === simulationResult.triggeredRule?.target_level)?.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progresso na Régua</span>
                    <span className="font-bold">{simulationResult.progress}%</span>
                  </div>
                  <Progress value={simulationResult.progress} className="h-3" />
                  
                  {simulationResult.blockedReason && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{simulationResult.blockedReason}</span>
                    </div>
                  )}
                </div>

                {/* Checklist */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Checklist de Progresso</h4>
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
                            {detail.current} / {detail.required} ({Math.round(detail.weight * 100)}% do peso)
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(detail.progress * 100)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Official race requirement */}
                {levelRules.find(l => l.level_key === simulationResult.level)?.official_race_required && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${simulation.hasOfficialRace ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                    {simulation.hasOfficialRace ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">Prova Oficial</div>
                      <div className="text-xs text-muted-foreground">
                        {simulation.hasOfficialRace ? 'Validada' : 'Obrigatória para este nível'}
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
