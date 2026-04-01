

## Plano: Unificar o cálculo de potencial de melhoria

### O problema
O mesmo atleta vê **dois números diferentes** de potencial de melhoria na mesma tela:
- **Parecer OUTLIER**: "cortar 03:13" — soma real dos gaps de tempo das 3 piores estações (seu tempo - meta OUTLIER)
- **Potencial Escondido / Ganho Total**: "0:48" — calculado por uma fórmula abstrata `(80 - percentil) × 1.2` que não tem relação direta com segundos reais

O "Potencial Escondido" e o "Ganho em 12m" usam essa fórmula de percentil que gera um número artificial. O correto seria usar o **gap real** (a soma dos improvement_value dos diagnósticos), que é exatamente o que o Parecer já usa.

### Solução

**1. Usar o gap real como base da projeção** (`DiagnosticoGratuito.tsx`)

Trocar o `totalGap` de:
```
scores.reduce((sum, s) => sum + Math.max(0, (80 - s.percentile_value) * 1.2), 0)
```
Para:
```
diagnosticos.reduce((sum, d) => sum + d.improvement_value, 0)
```

Isso é a soma real em segundos de todos os gaps entre o tempo do atleta e a meta OUTLIER — o mesmo dado que o Parecer já usa.

**2. Ajustar o EvolutionProjectionCard** (se necessário)

O card de projeção já aceita `totalGapOverride` como prop. Passar o gap real garante consistência.

**3. Resultado esperado**

- O "Potencial Escondido" vai mostrar **03:13** (mesmo valor do Parecer)
- O gráfico de evolução vai projetar baseado no gap real
- O "Ganho em 12m" vai refletir quanto tempo o atleta pode realmente cortar
- Todos os números na tela serão consistentes entre si

### Resumo
- 1 arquivo principal alterado (`DiagnosticoGratuito.tsx`) — trocar fórmula do totalGap
- Números unificados em toda a tela de diagnóstico

