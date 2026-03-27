

## Plano: Adicionar título "Nível Competitivo" ao Visor de Ação

O visor unificado (SEU TEMPO / META / FALTAM / PREVISÃO) já aparece tanto no Dashboard quanto no Diagnóstico via `DiagnosticRadarBlock.tsx`. Falta apenas o título para diferenciá-lo da "Jornada Outlier".

### Mudança única em `src/components/DiagnosticRadarBlock.tsx`

Adicionar um **header** no topo do visor (mobile e desktop) com ícone + título:

```
🏅 NÍVEL COMPETITIVO
```

Formato: ícone Trophy + texto "NÍVEL COMPETITIVO" em uppercase tracking-widest, estilo similar ao header da Jornada Outlier.

**2 pontos de edição:**

1. **Visor mobile** (~linha 2358): Inserir header antes do grid de 4 colunas
2. **Visor desktop** (~linha 2484): Inserir header antes do grid de 4 colunas

Ambos recebem:
```html
<div className="flex items-center gap-2 pb-1.5 border-b border-border/15 mb-1">
  <Trophy className="w-3.5 h-3.5 text-primary" />
  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
    Nível Competitivo
  </span>
</div>
```

### O que não muda
- Lógica de cálculo (performanceSnapshot)
- Layout das 4 colunas, barra, frase de ação
- Nenhuma tabela no banco
- PerformanceStatusCard (não está em uso no Dashboard atualmente)

