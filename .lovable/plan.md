

## Plano: Corrigir Projeção de Evolução ao trocar de prova

### Problema identificado

A `EvolutionProjectionCard` (Projeção de Evolução) está fixada no `latestResumo` (prova mais recente) em vez de acompanhar a prova selecionada. Quando o usuário clica em outra prova:

- **Splits** (`SplitTimesGrid`) e **Resultado Oficial** (`PerformanceHighlights`) atualizam corretamente — ambos usam `selectedResumoId`
- **Projeção de Evolução** NÃO atualiza — usa `latestResumo.finish_time` fixo, misturando o tempo da prova mais recente com os diagnósticos da prova selecionada

### Causa raiz

Linha 315-317 de `RoxCoachDashboard.tsx`:
```
{latestResumo.finish_time && diagnosticos.length > 0 && (
  <EvolutionProjectionCard finishTime={latestResumo.finish_time} diagnosticos={diagnosticos} />
)}
```

Deveria usar `selectedResumo.finish_time` e estar posicionado junto com os outros componentes que reagem à seleção.

### Alteração

**`src/components/RoxCoachDashboard.tsx`**
- Mover o `EvolutionProjectionCard` para dentro do bloco que renderiza os dados da prova selecionada (junto com `PerformanceHighlights`, `SplitTimesGrid`, etc.)
- Trocar `latestResumo.finish_time` por `selectedResumo.finish_time`
- Usar `selectedResumo` como fonte dos dados de finish_time

Isso garante que ao trocar de prova, **todos** os componentes (Resultado Oficial, Tempos & Parciais, Projeção de Evolução, Parecer) reflitam os dados da prova correta.

