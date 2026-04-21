import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoachApplicationsAdmin, type CoachApplication } from '@/hooks/useCoachApplication';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
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
  Filter,
  KeyRound,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function CoachApplicationsAdmin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { applications, loading, error, approveApplication, rejectApplication } = useCoachApplicationsAdmin();
  
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [selectedApp, setSelectedApp] = useState<CoachApplication | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [customPwd, setCustomPwd] = useState('');

  const handleResetPassword = async (app: CoachApplication, useCustom: boolean) => {
    if (!app.email) {
      toast.error('Aplicação sem email');
      return;
    }
    if (useCustom && customPwd.trim().length < 8) {
      toast.error('Senha precisa ter no mínimo 8 caracteres');
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-coach-password', {
        body: {
          email: app.email,
          ...(useCustom ? { password: customPwd.trim() } : {}),
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || 'Erro ao resetar senha');
        return;
      }
      setResetResult({ email: data.email, password: data.password });
      setCustomPwd('');
      toast.success('Senha redefinida');
    } catch (err: any) {
      toast.error(err?.message || 'Erro inesperado');
    } finally {
      setResetting(false);
    }
  };

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
      <div className="flex items-center justify-center p-4">
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
    <div className="space-y-6">
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
                  {selectedApp.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedApp.city}</span>
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

                {selectedApp.status === 'approved' && (
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="w-4 h-4 text-primary" />
                      Acesso do Coach
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Defina uma senha personalizada ou gere uma aleatória. Use quando o email de recuperação não chega.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Senha personalizada (mín. 8)"
                        value={customPwd}
                        onChange={(e) => setCustomPwd(e.target.value)}
                        disabled={resetting}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResetPassword(selectedApp, true)}
                        disabled={resetting || customPwd.trim().length < 8}
                      >
                        Definir
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => handleResetPassword(selectedApp, false)}
                      disabled={resetting}
                    >
                      {resetting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <KeyRound className="w-4 h-4 mr-2" />
                      )}
                      Gerar senha aleatória
                    </Button>
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

      {/* Reset password result */}
      <Dialog open={!!resetResult} onOpenChange={(open) => !open && setResetResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha redefinida</DialogTitle>
            <DialogDescription>
              Envie estas credenciais ao coach por canal seguro (WhatsApp/Instagram). Esta senha não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          {resetResult && (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <div className="flex gap-2">
                  <Input readOnly value={resetResult.email} />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(resetResult.email);
                      toast.success('Email copiado');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Senha</p>
                <div className="flex gap-2">
                  <Input readOnly value={resetResult.password} className="font-mono" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(resetResult.password);
                      toast.success('Senha copiada');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
