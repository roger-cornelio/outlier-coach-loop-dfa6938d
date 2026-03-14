

# Correção: Alinhar Prioridades de Treino com o Diagnóstico

## Problema
O bloco "Prioridades de Treino" usa o fallback por **percentil** (menor percentil = pior), mas o "Parecer Outlier" usa **improvement_value** (maior gap em segundos = pior). Isso gera rankings contraditórios na mesma tela.

## Solução
Alterar o fallback heurístico do `TrainingPrioritiesBlock` para priorizar pelo `improvement_value` da tabela `diagnostico_melhoria` (mesma fonte que o Parecer Outlier), caindo para percentil apenas quando não houver dados de melhoria.

## Mudança (1 arquivo)

### `src/components/DiagnosticRadarBlock.tsx` — TrainingPrioritiesBlock

Linha ~1502, no bloco "Fallback: heuristic based on percentiles":

**Antes**: Ordena `scores` por `percentile_value` (ascendente).

**Depois**:
1. Se `diagMelhorias` tem dados, ordena por `improvement_value` (descendente — maior gap primeiro), usando os labels e gaps reais.
2. Se não tem `diagMelhorias`, aí sim cai para o ranking por percentil como último recurso.

Isso garante que o bloco de Prioridades mostre **as mesmas estações críticas** que o Parecer Outlier (Run Total, Sandbag Lunges, Ski Erg), pois ambos usarão a mesma fonte de verdade (`diagnostico_melhoria.improvement_value`).

