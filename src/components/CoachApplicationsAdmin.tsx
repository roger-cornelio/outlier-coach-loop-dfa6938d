import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoachApplicationsAdmin, type CoachApplication } from '@/hooks/useCoachApplication';
import { useAuth } from '@/hooks/useAuth';
import { useOutlierStore } from '@/store/outlierStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Instagram,
  MapPin,
  Building2,
  MessageSquare,
  Loader2,
  AlertCircle,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function CoachApplicationsAdmin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { setCurrentView } = useOutlierStore();
  const { applications, loading, error, approveApplication, rejectApplication, refetch } = useCoachApplicationsAdmin();
  
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selectedApp, setSelectedApp] = useState<CoachApplication | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filter applications
  const filteredApps = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const handleApprove = async (app: CoachApplication) => {
    setProcessing(true);
    const success = await approveApplication(app.id);
    setProcessing(false);

    if (success) {
      toast.success('Coach aprovado!', {
        description: `${app.full_name || app.email} agora tem acesso ao painel de coach.`,
      });
      setSelectedApp(null);
    } else {
      toast.error('Erro ao aprovar');
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;

    setProcessing(true);
    const success = await rejectApplication(selectedApp.id, rejectReason || undefined);
    setProcessing(false);

    if (success) {
      toast.success('Solicitação rejeitada');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedApp(null);
    } else {
      toast.error('Erro ao rejeitar');
    }
  };

  if (!isAdmin && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">
              Acesso restrito a administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/30">Rejeitado</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView('admin')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Solicitações de Coach
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie as solicitações de acesso ao painel de coach
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="flex items-center gap-2"
            >
              {status === 'pending' && <Clock className="w-4 h-4" />}
              {status === 'approved' && <CheckCircle className="w-4 h-4" />}
              {status === 'rejected' && <XCircle className="w-4 h-4" />}
              {status === 'all' && <Filter className="w-4 h-4" />}
              <span className="capitalize">
                {status === 'all' ? 'Todas' : 
                 status === 'pending' ? 'Pendentes' :
                 status === 'approved' ? 'Aprovados' : 'Rejeitados'}
              </span>
              <span className="text-xs bg-secondary px-1.5 rounded">
                {counts[status]}
              </span>
            </Button>
          ))}
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : filteredApps.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filter === 'pending' 
                  ? 'Nenhuma solicitação pendente'
                  : 'Nenhuma solicitação encontrada'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredApps.map((app, idx) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className={`cursor-pointer hover:border-primary/50 transition-colors ${
                      app.status === 'pending' ? 'border-yellow-500/30' : ''
                    }`}
                    onClick={() => setSelectedApp(app)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-medium text-foreground">
                              {app.full_name || 'Nome não informado'}
                            </span>
                            {getStatusBadge(app.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            {app.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {app.email}
                              </span>
                            )}
                            {app.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {app.city}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Enviado em {new Date(app.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {app.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(app);
                              }}
                              disabled={processing}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedApp(app);
                                setRejectDialogOpen(true);
                              }}
                              disabled={processing}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Application Detail Dialog */}
        <Dialog open={!!selectedApp && !rejectDialogOpen} onOpenChange={(open) => !open && setSelectedApp(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes da Solicitação</DialogTitle>
            </DialogHeader>
            {selectedApp && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedApp.status)}
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedApp.full_name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedApp.email || '-'}</span>
                  </div>
                  {selectedApp.instagram && (
                    <div className="flex items-center gap-2">
                      <Instagram className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedApp.instagram}</span>
                    </div>
                  )}
                  {selectedApp.box_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedApp.box_name}</span>
                    </div>
                  )}
                  {selectedApp.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedApp.city}</span>
                    </div>
                  )}
                  {selectedApp.message && (
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">{selectedApp.message}</span>
                    </div>
                  )}
                </div>

                {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-500">
                      <strong>Motivo da rejeição:</strong> {selectedApp.rejection_reason}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Enviado em {new Date(selectedApp.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            <DialogFooter>
              {selectedApp?.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectDialogOpen(true);
                    }}
                    disabled={processing}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedApp)}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Aprovar
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeitar Solicitação</DialogTitle>
              <DialogDescription>
                Informe o motivo da rejeição (opcional). O usuário poderá ver este motivo e reenviar a solicitação.
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              className="w-full p-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Rejeitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
