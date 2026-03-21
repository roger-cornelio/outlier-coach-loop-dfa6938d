

## Correção: Relatório de cobertura reconhecer exercícios do dicionário sem métricas

### O que muda

**Arquivo:** `src/utils/parsingCoverage.ts` — função `calculateParsingCoverage`

Na verificação de cada linha de exercício (linha 316-326), adicionar um fallback antes de marcar como "não interpretado":

1. `detectUnits()` encontra métricas numéricas? → Interpretado ✅
2. Senão, o nome-base do exercício existe no dicionário global? → Interpretado ✅ (usa `extractBaseExerciseName` + `matchesDictionary` já existentes no arquivo)
3. Senão → Não interpretado ❌

### Impacto
- "Squat to Stand", "Pike Lunges" e similares deixam de aparecer como falha
- A taxa de cobertura reflete a realidade
- Nenhuma mudança no motor de cálculo — apenas no relatório

