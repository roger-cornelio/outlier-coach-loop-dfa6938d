

## Plano: Modal do olhinho mostra treino completo expandido (visão do atleta)

### Problema
Ao clicar no ícone de olho (👁️) na aba Programações, o modal abre com todos os dias colapsados. O coach precisa expandir cada dia manualmente. O esperado é que o treino apareça todo aberto, como o atleta vê.

### Alterações

**Arquivo:** `src/components/CoachProgramsTab.tsx`

#### 1) Iniciar todos os dias expandidos no modal
No `WorkoutDetailModal`, mudar o estado `expandedDays` para iniciar com todos os dias abertos em vez de um `Set` vazio:

```typescript
const [expandedDays, setExpandedDays] = useState<Set<string>>(() => {
  const allDays = new Set<string>();
  workoutDays.forEach(d => allDays.add(d.day));
  return allDays;
});
```

Resetar quando o workout mudar (via `useEffect` ou key).

#### 2) Ampliar o modal para tela quase cheia
Mudar `max-w-2xl lg:max-w-4xl` para `max-w-5xl` para dar mais espaço horizontal e mostrar o conteúdo confortavelmente (similar ao `max-w-6xl` da tela do atleta).

### Não alterar
- Nenhuma lógica de cálculo, hooks ou integrações
- Layout mobile inalterado
- Nenhum texto, cor ou ícone

### Arquivos
- `src/components/CoachProgramsTab.tsx` — estado inicial expandido + largura do modal

