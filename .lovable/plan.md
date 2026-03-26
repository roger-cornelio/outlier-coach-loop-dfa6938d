

## Plano: Remover Calculadora de Pace da aba Provas

### Mudança
Remover o componente `TargetSplitsTable` da aba **Provas** (`src/components/ProvasTab.tsx`), mantendo-o apenas na tela de **Simulados** (`SimulatorScreen.tsx`).

### O que muda
**`src/components/ProvasTab.tsx`**:
- Remover o import de `TargetSplitsTable` e do tipo `Split`
- Remover todo o bloco de fetch de splits para a calculadora (~L94-140)
- Remover os estados `splits` e `finishTime`
- Remover a renderização da `TargetSplitsTable` (~L769-770)

### O que NÃO muda
- `SimulatorScreen.tsx` — continua com a Calculadora de Pace funcionando normalmente
- `EvolutionTab.tsx` — continua com a tabela na aba Evolução
- Componente `TargetSplitsTable` — permanece intacto

