import { useEffect, useState } from 'react';
import { useExerciseSuggestionsAdmin } from '@/hooks/useExerciseSuggestions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Loader2, Dumbbell, Clock } from 'lucide-react';

interface MovementPattern {
  id: string;
  name: string;
  formula_type: string;
}

export function ExerciseSuggestionsAdmin() {
  const { suggestions, loading, fetchSuggestions, approveSuggestion, rejectSuggestion } = useExerciseSuggestionsAdmin();
  const [patterns, setPatterns] = useState<MovementPattern[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<Record<string, string>>({});
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetchSuggestions();
    supabase.from('movement_patterns').select('id, name, formula_type').order('name').then(({ data }) => {
      if (data) setPatterns(data);
    });
  }, [fetchSuggestions]);

  const filtered = filter === 'pending'
    ? suggestions.filter(s => s.status === 'pending')
    : suggestions;

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  const handleApprove = async (id: string, name: string) => {
    const patternId = selectedPatterns[id];
    if (!patternId) return;
    await approveSuggestion(id, patternId, name);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await rejectSuggestion(rejectModal.id, rejectReason || undefined);
    setRejectModal(null);
    setRejectReason('');
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pendente</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Aprovado</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejeitado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              Sugestões de Exercícios
              {pendingCount > 0 && (
                <Badge className="bg-amber-500 text-white ml-2">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pendentes
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>{filter === 'pending' ? 'Nenhuma sugestão pendente' : 'Nenhuma sugestão encontrada'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercício</TableHead>
                  <TableHead>Contexto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Padrão de Movimento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.exercise_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.context_block_title || '—'}
                    </TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell>
                      {s.status === 'pending' ? (
                        <Select
                          value={selectedPatterns[s.id] || ''}
                          onValueChange={(v) => setSelectedPatterns(prev => ({ ...prev, [s.id]: v }))}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Selecionar padrão..." />
                          </SelectTrigger>
                          <SelectContent>
                            {patterns.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                                <span className="text-xs text-muted-foreground ml-1">({p.formula_type})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {s.movement_pattern_id
                            ? patterns.find(p => p.id === s.movement_pattern_id)?.name || '—'
                            : '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === 'pending' && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(s.id, s.exercise_name)}
                            disabled={!selectedPatterns[s.id]}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectModal({ id: s.id, name: s.exercise_name })}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                      {s.status === 'rejected' && s.admin_notes && (
                        <span className="text-xs text-muted-foreground italic">
                          {s.admin_notes}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject modal */}
      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar sugestão</DialogTitle>
            <DialogDescription>
              Rejeitar "{rejectModal?.name}"? Você pode informar o motivo (opcional).
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Motivo da rejeição (opcional)"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject}>Rejeitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
