

## Plano: Banner compacto e dispensável para "treino não publicado"

### Alteração em `src/components/Dashboard.tsx` (linhas 380-390)

Substituir o card grande com borda tracejada por um banner inline compacto com botão de fechar:

- **Estado local** `dismissedNoWorkouts` controlado por `useState(false)`, resetado quando `hasAnyWorkouts` muda para true
- **Visual**: `bg-muted/20 border border-border rounded-xl px-4 py-3` — uma linha com ícone pequeno + texto + botão X
- **Ícone** `CalendarDays` reduzido para `w-4 h-4` inline
- **Texto em uma linha**: "Treino desta semana ainda não foi publicado"
- **Subtítulo** `text-xs`: "Aparecerá aqui quando seu coach publicar"
- **Botão fechar** (`X` icon, `w-4 h-4`) no canto direito, seta `dismissedNoWorkouts(true)`
- **Condição**: adicionar `&& !dismissedNoWorkouts` à renderização

Resultado: banner ocupa ~60px em vez de ~200px, atleta pode dispensar, e reaparece se navegar para outra semana sem treinos.

