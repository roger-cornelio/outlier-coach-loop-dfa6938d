

## Plano: Melhorar apresentação dos coaches + badge "RECOMENDADO" no #1 + filtrar box_name inválido

### Alterações em `src/components/OnboardingCoachSelection.tsx`

**1. Badge "RECOMENDADO" no coach #1**
- Quando `rank === 1`, exibir badge `"RECOMENDADO"` acima ou ao lado do nome (similar ao badge do plano Performance)
- Estilo: `bg-primary/20 text-primary text-[10px] font-display tracking-widest px-2 py-0.5 rounded-full`
- O card do #1 ganha borda destacada: `border-primary/40` ao invés de `border-border/50`

**2. Melhorar visual do card #1**
- Fundo levemente diferenciado: `bg-primary/5` ao invés de `bg-secondary/30`
- Número do rank #1 maior e mais destacado com ícone Trophy ao invés do número

**3. Filtrar box_name inválido (fix do "0")**
- Condição: `coach.box_name && coach.box_name !== '0' && coach.box_name.trim().length > 1`

**4. Nome do coach mais destacado**
- Aumentar fonte do nome para `text-lg` e adicionar `font-semibold` para todos os coaches

