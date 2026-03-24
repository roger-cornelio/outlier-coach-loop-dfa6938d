

## Unificar "Seus Destaques" com dados do RoxCoach

### Problema atual

`strongStations` é calculado a partir de `scores` (percentis internos), pegando as 2 estações com maior `percentile_value`. Isso pode não coincidir com o que o RoxCoach considera destaque.

### Correção

**1 arquivo: `src/pages/DiagnosticoGratuito.tsx`** (linhas 339-341)

Quando `roxCoachDiagnosticos` tem dados, selecionar os destaques de lá — as estações onde o gap (`your_score - top_1`) é **menor** (ou seja, onde o atleta já está mais próximo do top 1%). Manter fallback para `scores` caso RoxCoach não tenha dados.

O objeto resultante terá `movement`, `metric`, `raw_time_sec` (= `your_score`) e `percentile_value` (cruzado com `scores`), mantendo compatibilidade com a renderização atual.

### O que NÃO muda
- Layout e visual das cards de destaque
- Texto narrativo e tom de venda
- Cálculo do "Top X%" geral

