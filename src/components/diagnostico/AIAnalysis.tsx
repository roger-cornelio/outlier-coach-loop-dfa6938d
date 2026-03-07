import { Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  textoIa: string;
}

export default function AIAnalysis({ textoIa }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        Parecer do Treinador IA
      </h3>
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {textoIa}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
