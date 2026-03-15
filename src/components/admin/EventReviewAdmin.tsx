/**
 * EventReviewAdmin — Admin panel for reviewing event submissions
 * With search trail, actions, edit and delete for each event
 */
import { useState, useEffect } from 'react';
import { Search, Check, X, Copy, ExternalLink, AlertTriangle, Clock, Loader2, ChevronDown, ChevronUp, FileText, MapPin, Calendar, Globe, Building2, Shield, Pencil, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEventReviewQueue, type ReviewQueueItem } from '@/hooks/useEventReviewQueue';
import { pendenciaLabel, TIPO_EVENTO_LABELS, ORIGEM_LABELS } from '@/utils/eventConfidence';
import { toast } from 'sonner';

export function EventReviewAdmin() {
  const { items, loading, fetchQueue, approveEvent, rejectEvent, markDuplicate, updateEventType, updateEvent, deleteEvent } = useEventReviewQueue();
  const [statusFilter, setStatusFilter] = useState('PENDENTE');

  useEffect(() => {
    fetchQueue(statusFilter);
  }, [fetchQueue, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fila de Revisão de Provas</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            <SelectItem value="PENDENTE">Pendentes</SelectItem>
            <SelectItem value="EM_ANALISE">Em análise</SelectItem>
            <SelectItem value="RESOLVIDO">Resolvidos</SelectItem>
            <SelectItem value="TODOS">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
            Nenhum item na fila.
          </CardContent>
        </Card>
      )}

      {!loading && items.map(item => (
        <ReviewCard
          key={item.id}
          item={item}
          onApprove={async (updates) => {
            if (!item.event_id) return;
            const ok = await approveEvent(item.id, item.event_id, updates);
            if (ok) {
              toast.success('Prova autorizada');
              fetchQueue(statusFilter);
            } else {
              toast.error('Erro ao autorizar');
            }
          }}
          onReject={async (reason) => {
            if (!item.event_id) return;
            const ok = await rejectEvent(item.id, item.event_id, reason);
            if (ok) {
              toast.success('Prova rejeitada');
              fetchQueue(statusFilter);
            } else {
              toast.error('Erro ao rejeitar');
            }
          }}
          onMarkDuplicate={async () => {
            if (!item.event_id) return;
            const ok = await markDuplicate(item.id, item.event_id);
            if (ok) {
              toast.success('Marcada como duplicada');
              fetchQueue(statusFilter);
            } else {
              toast.error('Erro');
            }
          }}
          onUpdateType={async (tipo) => {
            if (!item.event_id) return;
            const ok = await updateEventType(item.event_id, tipo);
            if (ok) {
              toast.success('Tipo atualizado');
              fetchQueue(statusFilter);
            }
          }}
          onUpdateEvent={async (updates) => {
            if (!item.event_id) return;
            const ok = await updateEvent(item.event_id, updates);
            if (ok) {
              toast.success('Prova atualizada');
              fetchQueue(statusFilter);
            } else {
              toast.error('Erro ao atualizar');
            }
          }}
          onDeleteEvent={async () => {
            if (!item.event_id) return;
            const ok = await deleteEvent(item.id, item.event_id);
            if (ok) {
              toast.success('Prova excluída');
              fetchQueue(statusFilter);
            } else {
              toast.error('Erro ao excluir');
            }
          }}
        />
      ))}
    </div>
  );
}

function ReviewCard({ item, onApprove, onReject, onMarkDuplicate, onUpdateType, onUpdateEvent, onDeleteEvent }: {
  item: ReviewQueueItem;
  onApprove: (updates?: any) => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onMarkDuplicate: () => Promise<void>;
  onUpdateType: (tipo: string) => Promise<void>;
  onUpdateEvent: (updates: any) => Promise<void>;
  onDeleteEvent: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const event = item.event;
  const log = item.log;
  const isResolved = item.status_fila === 'RESOLVIDO';

  // Editable fields
  const [editNome, setEditNome] = useState(event?.nome || '');
  const [editData, setEditData] = useState(event?.data_evento || '');
  const [editCidade, setEditCidade] = useState(event?.cidade || '');
  const [editEstado, setEditEstado] = useState(event?.estado || '');
  const [editOrganizador, setEditOrganizador] = useState(event?.organizador || '');
  const [editUrlOrigem, setEditUrlOrigem] = useState(event?.url_origem || '');
  const [editUrlInscricao, setEditUrlInscricao] = useState(event?.url_inscricao || '');

  const handleStartEdit = () => {
    setEditNome(event?.nome || '');
    setEditData(event?.data_evento || '');
    setEditCidade(event?.cidade || '');
    setEditEstado(event?.estado || '');
    setEditOrganizador(event?.organizador || '');
    setEditUrlOrigem(event?.url_origem || '');
    setEditUrlInscricao(event?.url_inscricao || '');
    setEditing(true);
    if (!expanded) setExpanded(true);
  };

  const handleSaveEdit = async () => {
    setIsProcessing(true);
    await onUpdateEvent({
      nome: editNome || undefined,
      data_evento: editData || undefined,
      cidade: editCidade || undefined,
      estado: editEstado || undefined,
      organizador: editOrganizador || undefined,
      url_origem: editUrlOrigem || undefined,
      url_inscricao: editUrlInscricao || undefined,
    });
    setEditing(false);
    setIsProcessing(false);
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    await onApprove({ admin_notes: adminNotes || undefined });
    setIsProcessing(false);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject(rejectReason || undefined);
    setIsProcessing(false);
  };

  return (
    <Card className={isResolved ? 'opacity-60' : 'border-yellow-500/30'}>
      <CardContent className="py-3 px-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{event?.nome || 'Evento desconhecido'}</span>
              {event?.tipo_evento && (
                <Badge variant="secondary" className="text-[10px]">
                  {TIPO_EVENTO_LABELS[event.tipo_evento] || event.tipo_evento}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  item.status_fila === 'PENDENTE' ? 'border-yellow-500/50 text-yellow-600' :
                  item.status_fila === 'RESOLVIDO' ? 'border-green-500/50 text-green-600' :
                  'border-blue-500/50 text-blue-600'
                }`}
              >
                {item.status_fila}
              </Badge>
              {event?.possivel_duplicata && (
                <Badge variant="destructive" className="text-[10px]">Possível duplicata</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {event?.data_evento && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.data_evento}</span>}
              {(event?.cidade || event?.estado) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[event?.cidade, event?.estado].filter(Boolean).join(', ')}</span>}
              {event?.origem_principal && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{ORIGEM_LABELS[event.origem_principal] || event.origem_principal}</span>}
              <span>Confiança: {event?.grau_confianca || 0}%</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={handleStartEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir prova</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir "{event?.nome}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Pendências */}
        {item.motivo && (
          <div className="flex items-start gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
            <span className="text-muted-foreground">
              Pendências: {item.motivo.split(', ').map(p => pendenciaLabel(p)).join(' · ')}
            </span>
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            {/* A. Dados encontrados / Edit form */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                {editing ? 'EDITAR DADOS' : 'DADOS ENCONTRADOS'}
              </h4>
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="text-xs h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={editData} onChange={e => setEditData(e.target.value)} className="text-xs h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cidade</Label>
                    <Input value={editCidade} onChange={e => setEditCidade(e.target.value)} className="text-xs h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estado</Label>
                    <Input value={editEstado} onChange={e => setEditEstado(e.target.value)} className="text-xs h-8" maxLength={2} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Organizador</Label>
                    <Input value={editOrganizador} onChange={e => setEditOrganizador(e.target.value)} className="text-xs h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL Origem</Label>
                    <Input value={editUrlOrigem} onChange={e => setEditUrlOrigem(e.target.value)} className="text-xs h-8" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">URL Inscrição</Label>
                    <Input value={editUrlInscricao} onChange={e => setEditUrlInscricao(e.target.value)} className="text-xs h-8" />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button size="sm" className="gap-1 text-xs" onClick={handleSaveEdit} disabled={isProcessing}>
                      <Save className="w-3.5 h-3.5" /> Salvar
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditing(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Nome:</span> {event?.nome || '—'}</div>
                  <div><span className="text-muted-foreground">Data:</span> {event?.data_evento || '—'}</div>
                  <div><span className="text-muted-foreground">Cidade:</span> {event?.cidade || '—'}</div>
                  <div><span className="text-muted-foreground">Estado:</span> {event?.estado || '—'}</div>
                  <div><span className="text-muted-foreground">Organizador:</span> {event?.organizador || '—'}</div>
                  <div><span className="text-muted-foreground">Tipo sugerido:</span> {event?.tipo_evento || '—'}</div>
                  {event?.url_origem && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Link:</span>{' '}
                      <a href={event.url_origem} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                        {event.url_origem}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* B. Discovery log */}
            {log && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">LOG DE DESCOBERTA</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Termo busca:</span> {log.termo_busca || '—'}</div>
                  <div><span className="text-muted-foreground">Origem:</span> {log.origem || '—'}</div>
                  <div><span className="text-muted-foreground">Score:</span> {log.score}</div>
                  {log.raw_text && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Texto bruto:</span>
                      <div className="mt-1 p-2 bg-muted/50 rounded text-xs max-h-20 overflow-y-auto">{log.raw_text}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* C. Search suggestions */}
            {item.sugestoes_busca_json && item.sugestoes_busca_json.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">SUGESTÕES DE PESQUISA</h4>
                <div className="space-y-1">
                  {item.sugestoes_busca_json.map((sug, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded flex-1 truncate">{sug}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(sug);
                          toast.success('Copiado');
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(sug)}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Classify */}
            {!isResolved && !editing && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex gap-2 flex-wrap">
                  <Label className="text-xs w-full">Classificar como:</Label>
                  {['OFICIAL', 'PARALELA', 'SIMULADO'].map(tipo => (
                    <Button
                      key={tipo}
                      variant={event?.tipo_evento === tipo ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => onUpdateType(tipo)}
                    >
                      {TIPO_EVENTO_LABELS[tipo]}
                    </Button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Notas do admin</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="h-16 resize-none text-xs"
                    placeholder="Observações..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo da rejeição (se aplicável)</Label>
                  <Input
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="text-xs"
                    placeholder="Motivo..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="gap-1 text-xs" onClick={handleApprove} disabled={isProcessing}>
                    <Check className="w-3.5 h-3.5" /> Autorizar
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={handleReject} disabled={isProcessing}>
                    <X className="w-3.5 h-3.5" /> Rejeitar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={onMarkDuplicate} disabled={isProcessing}>
                    <FileText className="w-3.5 h-3.5" /> Duplicada
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
