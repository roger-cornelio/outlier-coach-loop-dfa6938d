/**
 * ErrorBoundary - Captura crashes de render e mostra UI de recuperação
 * Usado para proteger o TextModelImporter contra tela cinza
 */

import React from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onClearDraft?: () => void;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ERROR_BOUNDARY] Crash capturado:', error.message);
    console.error('[ERROR_BOUNDARY] Stack:', error.stack);
    console.error('[ERROR_BOUNDARY] Component stack:', errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    this.props.onClearDraft?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/50">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {this.props.fallbackTitle || 'Erro ao renderizar'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ocorreu um erro inesperado. Tente limpar o rascunho ou recarregar a página.
                </p>
              </div>
              {this.state.error && (
                <pre className="text-xs text-destructive/70 bg-destructive/5 p-3 rounded-lg overflow-auto max-h-32 text-left">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex gap-3 justify-center">
                {this.props.onClearDraft && (
                  <Button variant="outline" onClick={this.handleClearAndReload} className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Limpar rascunho
                  </Button>
                )}
                <Button variant="outline" onClick={this.handleReload} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Recarregar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
