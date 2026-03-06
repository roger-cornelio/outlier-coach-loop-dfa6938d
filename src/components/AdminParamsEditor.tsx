import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft, Settings2, ShieldAlert, LogIn, AlertTriangle, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FriendlyParamsEditor } from '@/components/FriendlyParamsEditor';

export function AdminParamsEditor() {
  const { setCurrentView } = useOutlierStore();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center">
          <p className="text-muted-foreground">Verificando acesso…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-primary/60" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Área restrita</h1>
          <p className="text-muted-foreground mb-6">
            Faça login com uma conta de administrador.
          </p>
          <button
            onClick={() => navigate('/auth?next=params')}
            className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Fazer login
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-elevated p-8 rounded-xl text-center max-w-md w-full">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-destructive/60" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Acesso negado</h1>
          <p className="text-muted-foreground mb-6">
            Apenas administradores podem editar parâmetros do sistema.
          </p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="w-full px-6 py-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('admin')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wide flex items-center gap-2">
                <Settings2 className="w-6 h-6" />
                REGRAS DO JOGO
              </h1>
              <p className="text-sm text-muted-foreground">
                Scoring, estimativas de tempo, progressão e regras de prioridade
              </p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Warning banner */}
        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-500">Atenção: Parâmetros globais</p>
              <p className="text-xs text-muted-foreground mt-1">
                Alterações aqui afetam scoring, estimativas de tempo e progressão.
                Para outros domínios: <strong>Motor Físico</strong> (Kcal), <strong>Jornada</strong> (status de nível), <strong>Classificação</strong> (benchmarks HYROX).
              </p>
            </div>
          </div>
        </div>
        
        {/* Database-backed editor */}
        <div className="card-elevated rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <Database className="w-5 h-5" />
                Configurações do Sistema
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Todas as alterações são persistidas no banco de dados e auditadas automaticamente.
              </p>
            </div>
          </div>
          
          <FriendlyParamsEditor />
        </div>
      </main>
    </div>
  );
}
