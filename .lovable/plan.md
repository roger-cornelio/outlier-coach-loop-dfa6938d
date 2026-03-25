

## Plano: Frase 01 com tempo real de melhoria na corrida

### Mudança

**Arquivo: `src/pages/DiagnosticoGratuito.tsx` (~linha 846-852)**

A frase 01 do "Plano de Ataque" atualmente diz algo como _"Treinos específicos para tirar você dos 88% mais lentos..."_ — texto baseado num percentil que não faz sentido claro para o atleta.

**Nova frase 01:**
- **Título**: mantém `"Corrigir {nome da 1ª estação mais fraca}"`
- **Descrição**: muda para `"Treinos específicos para diminuir seu pace total em {XX:XX}"`, onde `XX:XX` é o `improvement_value` da estação `run_avg` (ou a soma dos runs) encontrado em `roxCoachDiagnosticos`
- **Fallback**: se não encontrar dados de run no RoxCoach, usar o `improvement_value` da própria `weakStations[0]` (ex: "diminuir seu tempo de Sled Push em 01:23")

### Dados

O `roxCoachDiagnosticos` já contém uma linha com `metric === 'run_avg'` cujo `improvement_value` é a diferença em segundos entre o run total do atleta e a meta OUTLIER. Basta localizar essa linha e formatar o valor com `formatTimeSec()`.

### O que NÃO muda
- Título da frase 01
- Frases 02 e 03
- Nenhum componente ou hook alterado

