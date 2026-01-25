/**
 * AthleteBenchmarkAdmin - Seção administrativa para lançar/visualizar benchmarks de atletas
 * 
 * Permite ao Admin:
 * - Visualizar todos os benchmarks realizados pelos atletas
 * - Inserir manualmente um benchmark (data + score/tempo + nível derivado)
 * - Usar o mesmo cálculo de status existente
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Clock, 
  Plus, 
  Search, 
  Loader2, 
  User,
  Trophy,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LEVEL_NAMES, type AthleteStatus } from '@/types/outlier';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AthleteProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
}

interface BenchmarkResult {
  id: string;
  user_id: string;
  created_at: string;
  athlete_level: string | null;
  score: number | null;
  time_in_seconds: number | null;
  result_type: string;
  athlete_name?: string;
  athlete_email?: string;
}

const LEVEL_OPTIONS: { value: AthleteStatus; label: string }[] = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediário' },
  { value: 'avancado', label: 'Avançado' },
  { value: 'hyrox_open', label: 'HYROX OPEN' },
  { value: 'hyrox_pro', label: 'HYROX PRO' },
];

export function AthleteBenchmarkAdmin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([]);
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [benchmarkDate, setBenchmarkDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');
  const [derivedLevel, setDerivedLevel] = useState<AthleteStatus>('intermediario');
  const [saving, setSaving] = useState(false);
  
  // Fetch athletes and benchmark results
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch all profiles (athletes)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, name, email')
          .order('name', { ascending: true });
        
        if (profilesError) throw profilesError;
        setAthletes(profilesData || []);
        
        // Fetch all benchmark results of type 'benchmark'
        const { data: resultsData, error: resultsError } = await supabase
          .from('benchmark_results')
          .select('id, user_id, created_at, athlete_level, score, time_in_seconds, result_type')
          .eq('result_type', 'benchmark')
          .order('created_at', { ascending: false });
        
        if (resultsError) throw resultsError;
        
        // Enrich results with athlete info
        const enrichedResults = (resultsData || []).map((result) => {
          const athlete = profilesData?.find((p) => p.user_id === result.user_id);
          return {
            ...result,
            athlete_name: athlete?.name || 'N/A',
            athlete_email: athlete?.email || 'N/A',
          };
        });
        
        setBenchmarkResults(enrichedResults);
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  // Filter athletes based on search
  const filteredAthletes = useMemo(() => {
    if (!searchTerm.trim()) return athletes;
    const term = searchTerm.toLowerCase();
    return athletes.filter(
      (a) =>
        a.name?.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term)
    );
  }, [athletes, searchTerm]);
  
  // Filter benchmark results based on search
  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return benchmarkResults;
    const term = searchTerm.toLowerCase();
    return benchmarkResults.filter(
      (r) =>
        r.athlete_name?.toLowerCase().includes(term) ||
        r.athlete_email?.toLowerCase().includes(term)
    );
  }, [benchmarkResults, searchTerm]);
  
  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (dateStr: string): string => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };
  
  const handleAddBenchmark = async () => {
    if (!selectedAthlete) {
      toast.error('Selecione um atleta');
      return;
    }
    
    const athlete = athletes.find((a) => a.user_id === selectedAthlete);
    if (!athlete) {
      toast.error('Atleta não encontrado');
      return;
    }
    
    const totalSeconds = (parseInt(timeMinutes || '0') * 60) + parseInt(timeSeconds || '0');
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .insert({
          user_id: selectedAthlete,
          block_id: 'admin_benchmark',
          workout_id: 'admin_benchmark',
          result_type: 'benchmark',
          athlete_level: derivedLevel,
          time_in_seconds: totalSeconds > 0 ? totalSeconds : null,
          score: totalSeconds > 0 ? Math.max(0, 100 - (totalSeconds / 60)) : null,
          completed: true,
          event_date: benchmarkDate,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to local state
      setBenchmarkResults((prev) => [
        {
          ...data,
          athlete_name: athlete.name || 'N/A',
          athlete_email: athlete.email,
        },
        ...prev,
      ]);
      
      toast.success('Benchmark registrado com sucesso');
      setIsAddModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error adding benchmark:', err);
      toast.error('Erro ao registrar benchmark');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteBenchmark = async (id: string) => {
    try {
      const { error } = await supabase
        .from('benchmark_results')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setBenchmarkResults((prev) => prev.filter((r) => r.id !== id));
      toast.success('Benchmark removido');
    } catch (err) {
      console.error('Error deleting benchmark:', err);
      toast.error('Erro ao remover benchmark');
    }
  };
  
  const resetForm = () => {
    setSelectedAthlete('');
    setBenchmarkDate(format(new Date(), 'yyyy-MM-dd'));
    setTimeMinutes('');
    setTimeSeconds('');
    setDerivedLevel('intermediario');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Benchmarks (Certificação)</CardTitle>
                <CardDescription>
                  Gerencie os benchmarks de certificação dos atletas
                </CardDescription>
              </div>
            </div>
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Benchmark
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Registrar Benchmark</DialogTitle>
                  <DialogDescription>
                    Insira manualmente um benchmark para um atleta
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Athlete Selection */}
                  <div className="space-y-2">
                    <Label>Atleta</Label>
                    <Select value={selectedAthlete} onValueChange={setSelectedAthlete}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um atleta" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAthletes.map((athlete) => (
                          <SelectItem key={athlete.user_id} value={athlete.user_id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{athlete.name || athlete.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Date */}
                  <div className="space-y-2">
                    <Label>Data do Benchmark</Label>
                    <Input
                      type="date"
                      value={benchmarkDate}
                      onChange={(e) => setBenchmarkDate(e.target.value)}
                    />
                  </div>
                  
                  {/* Time */}
                  <div className="space-y-2">
                    <Label>Tempo (opcional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(e.target.value)}
                        min={0}
                        className="w-20"
                      />
                      <span className="text-muted-foreground">:</span>
                      <Input
                        type="number"
                        placeholder="Seg"
                        value={timeSeconds}
                        onChange={(e) => setTimeSeconds(e.target.value)}
                        min={0}
                        max={59}
                        className="w-20"
                      />
                    </div>
                  </div>
                  
                  {/* Derived Level */}
                  <div className="space-y-2">
                    <Label>Nível Certificado</Label>
                    <Select 
                      value={derivedLevel} 
                      onValueChange={(v) => setDerivedLevel(v as AthleteStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4" />
                              <span>{level.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddBenchmark} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por atleta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Results Table */}
          {filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum benchmark encontrado</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Clique em "Novo Benchmark" para registrar um.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atleta</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{result.athlete_name}</p>
                        <p className="text-xs text-muted-foreground">{result.athlete_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {formatDate(result.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{formatTime(result.time_in_seconds)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.athlete_level ? (
                        <Badge variant="outline">
                          {LEVEL_NAMES[result.athlete_level as AthleteStatus] || result.athlete_level}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover benchmark?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteBenchmark(result.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
