

# Unificar Gap entre Dashboard e Diagnóstico

## Problema
- **Dashboard** (`DiagnosticRadarBlock.tsx`): calcula gap como `currentTime - targetSec` = **6:21**
- **Diagnóstico** (`EvolutionProjectionCard.tsx`): calcula gap como `sum(improvement_value)` = **6:15**

São fórmulas diferentes, resultando em valores inconsistentes.

## Solução
Passar o gap já calculado do Dashboard para o `EvolutionProjectionCard`, para que ambos usem a mesma fonte.

### Alterações

**`src/components/diagnostico/EvolutionProjectionCard.tsx`**
- Adicionar prop opcional `totalGapOverride?: number` (em segundos)
- Se presente, usar esse valor em vez de `diagnosticos.reduce(...)`
- Manter o cálculo por `diagnosticos` como fallback quando a prop não é passada (ex: uso no `RoxCoachDashboard`)

**`src/components/DiagnosticRadarBlock.tsx`**
- Onde o `EvolutionProjectionCard` é renderizado (se houver), passar `totalGapOverride={evolutionProjection.totalGap}`
- Nota: atualmente o `DiagnosticRadarBlock` renderiza a projeção inline (não usa o componente `EvolutionProjectionCard`), então o dashboard já está correto. O problema é no `RoxCoachDashboard`.

**`src/components/RoxCoachDashboard.tsx`** (linhas 402-410)
- Passar a mesma lógica de gap unificado: calcular `currentTime - targetSec` e enviar como `totalGapOverride`
- Alternativa mais simples: replicar a lógica de fallback chain (header gap → diagMelhorias sum) dentro do `RoxCoachDashboard`, ou importar `eliteTarget` / `useAthleteStatus` nesse contexto

### Abordagem mais limpa
Como o `RoxCoachDashboard` é a view de diagnóstico e não tem acesso fácil ao `eliteTarget`, a solução mais pragmática:
- Adicionar `totalGapOverride` como prop no `EvolutionProjectionCard`
- No `RoxCoachDashboard`, calcular o gap usando a mesma lógica: buscar o target do nível do atleta e subtrair do finish_time
- Se não houver target disponível, cair no fallback atual (soma dos improvement_value)

### Arquivos alterados
- `src/components/diagnostico/EvolutionProjectionCard.tsx`
- `src/components/RoxCoachDashboard.tsx`

