/**
 * Medicina do Esporte - Página informativa sobre feature futura
 * 
 * Esta página explica o fluxo de acompanhamento médico especializado
 * que será implementado no futuro.
 */

import { Stethoscope, ClipboardList, FlaskConical, TrendingUp, Clock, FileText, Activity, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const capabilities = [
  {
    icon: FlaskConical,
    title: 'Exames Laboratoriais',
    description: 'Solicitação de exames específicos para atletas',
  },
  {
    icon: Activity,
    title: 'Marcadores Fisiológicos',
    description: 'Avaliação de indicadores relevantes para performance',
  },
  {
    icon: Stethoscope,
    title: 'Acompanhamento Médico',
    description: 'Consultas e orientações com médico do esporte',
  },
  {
    icon: History,
    title: 'Histórico Clínico',
    description: 'Registro voltado à prática esportiva',
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: 'Solicitação de Avaliação',
    description: 'Atleta solicita avaliação médica através da plataforma.',
  },
  {
    icon: FileText,
    title: 'Análise do Histórico',
    description: 'Médico do esporte analisa histórico e objetivos do atleta.',
  },
  {
    icon: FlaskConical,
    title: 'Exames e Marcadores',
    description: 'Exames laboratoriais e marcadores fisiológicos são solicitados conforme necessidade.',
  },
  {
    icon: TrendingUp,
    title: 'Acompanhamento Contínuo',
    description: 'Resultados são acompanhados ao longo do tempo com orientações personalizadas.',
  },
];

export default function MedicinaDoEsporte() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Medicina do Esporte
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Acompanhamento médico especializado para atletas, com foco em saúde e performance.
          </p>
          <Badge variant="secondary" className="mt-4">
            <Clock className="w-3 h-3 mr-1" />
            Funcionalidade em breve
          </Badge>
        </div>

        {/* O que será possível */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xl">O que será possível</CardTitle>
            <CardDescription>
              Recursos disponíveis com acompanhamento de médico do esporte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {capabilities.map((item, index) => (
                <div key={index} className="flex gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Como vai funcionar */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xl">Como vai funcionar</CardTitle>
            <CardDescription>
              Fluxo de acompanhamento médico especializado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      PASSO {index + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Aviso */}
        <Card className="border-dashed border-2 border-border/50 bg-transparent">
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-muted-foreground">
              Esta funcionalidade será conduzida por <span className="text-foreground font-medium">médico do esporte</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Estamos trabalhando para disponibilizar em breve.
              <br />
              Você será notificado assim que estiver disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
