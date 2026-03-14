

# Relatório de Comissionamento Semântico do Parser

## Resumo

Criar uma função utilitária `calculateParsingCoverage` e integrá-la no fluxo pós-parse do `TextModelImporter`, exibindo um badge de cobertura na Tela 2 (Edição) e um `console.table` detalhado no DevTools.

## Arquitetura

```text
parseStructuredText (Worker)
        │
        ▼
  handleParse (TextModelImporter)
        │
        ├── convertToDayWorkout[]
        │
        ▼
  calculateParsingCoverage(parseResult, workouts)
        │
        ├── console.table (DevTools)
        └── setCoverageReport (state → Badge na UI)
```

## Implementação

### 1. Novo arquivo: `src/utils/parsingCoverage.ts`

Função `calculateParsingCoverage(parseResult: ParseResult, workouts: DayWorkout[])`:

- **Varredura**: Itera sobre `parseResult.days[].blocks[].lines[]` filtrando apenas `type === 'exercise'`
- **totalExercises**: Contagem de todas as linhas classificadas como exercício
- **recognizedMetrics**: Para cada linha de exercício, chama `detectUnits(line.text)` e conta quantas retornam `hasRecognizedUnit === true` (TIME, DISTANCE, REPS ou EFFORT detectados)
- **mappedToDatabase**: Não será incluído nesta fase — o mapeamento de slugs via `global_exercises` é feito pela Edge Function `parse-workout-blocks` (IA), que roda depois da publicação, não durante o parse local. Incluir aqui exigiria uma query async ao banco durante o parse, o que viola o design síncrono. Será adicionado como campo futuro.
- **Retorno**: `{ totalExercises, recognizedMetrics, unrecognized, successRate, unmatchedLines: string[] }`
- **console.table**: Imprime tabela formatada com as métricas e lista as linhas sem métricas para auditoria

### 2. Integração no `TextModelImporter.tsx`

- Após o parse com sucesso (linha ~394, dentro do `if (result.success)`), chamar `calculateParsingCoverage(result, workouts)`
- Armazenar resultado em `useState` local: `coverageReport`
- Limpar ao voltar para import (`goBackToImport`)

### 3. Badge na UI (Tela 2 — Edição)

- Posicionar entre os metadados obrigatórios (semana/nome) e o Accordion de dias (linha ~1051)
- Badge sutil com fundo verde/âmbar conforme taxa:
  - `≥ 90%` → verde: "🎯 Inteligência Outlier: X/Y exercícios interpretados (Z%)"
  - `< 90%` → âmbar: "⚠️ Inteligência Outlier: X/Y exercícios interpretados (Z%)"
- Desaparece automaticamente após 15s via `setTimeout` (temporário conforme solicitado)
- Tooltip com detalhes das linhas não reconhecidas

### 4. Sem alteração no Worker ou no parser

A função é chamada **depois** do parse, na thread principal, usando o resultado já pronto. Zero impacto em performance.

## Escopo excluído (futuro)

- `mappedToDatabase`: requer query ao banco de `global_exercises` — será adicionado quando o fluxo de parse-IA (Edge Function) rodar inline
- Persistência do relatório em banco — apenas console + UI temporária nesta fase

