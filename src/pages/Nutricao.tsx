/**
 * Nutrição - Página informativa sobre feature futura
 * 
 * Esta página explica o fluxo de nutrição personalizada
 * que será implementado no futuro.
 */

import { useNavigate } from 'react-router-dom';
import { Apple, ClipboardList, TrendingUp, Clock, Utensils, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const steps = [
  {
    icon: ClipboardList,
    title: 'Avaliação Inicial',
    description: 'Nutricionista avalia seus dados, objetivos e histórico de treinos para entender suas necessidades.',
  },
  {
    icon: Utensils,
    title: 'Plano Personalizado',
    description: 'Plano alimentar criado especificamente para sua rotina, preferências e metas de performance.',
  },
  {
    icon: TrendingUp,
    title: 'Ajustes Contínuos',
    description: 'Acompanhamento constante com ajustes conforme evolução dos treinos e resultados em provas.',
  },
];

export default function Nutricao() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full self-stretch bg-background p-3 sm:p-6 md:p-8 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Apple className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Nutrição Personalizada
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Plano alimentar individualizado para potencializar sua performance e acelerar sua evolução.
          </p>
          <Badge variant="secondary" className="mt-4">
            <Clock className="w-3 h-3 mr-1" />
            Funcionalidade em breve
          </Badge>
        </div>

        {/* Como vai funcionar */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xl">Como vai funcionar</CardTitle>
            <CardDescription>
              Um processo simples e eficiente para otimizar sua alimentação
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

        {/* Info adicional */}
        <Card className="border-dashed border-2 border-border/50 bg-transparent">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Estamos trabalhando para trazer esta funcionalidade em breve.
              <br />
              <span className="text-sm">
                Você será notificado assim que estiver disponível.
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
