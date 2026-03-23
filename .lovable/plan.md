

## Plano: Reconhecimento inteligente de exercícios sem métricas + Backup interativo para linhas não interpretadas

### Problema

Linhas como "Shoulder Taps" ou "Calf Raises" (sem reps/sets/carga) são ignoradas pelo parser local porque `hasMeasurableStimulus()` retorna `false`. A IA (Edge Function) já sabe lidar com esses casos (tem até few-shot example), mas o relatório de cobertura local classifica essas linhas como "não interpretadas" e o coach não tem como agir sobre elas facilmente.

### Solução em 2 partes

**Parte 1: Melhorar o parser local para reconhecer exercícios sem métricas**

No `parsingCoverage.ts`, adicionar uma heurística: se uma linha contém **apenas um nome que se parece com exercício** (2+ palavras com letra, sem ser título/comentário/narrativa), e está dentro de um bloco de treino, considerar como exercício reconhecido — mesmo sem número. Isso usa o dicionário `global_exercises` como referência: se o nome faz match fuzzy com o dicionário, conta como interpretado.

Também melhorar `hasMeasurableStimulus()` no `structuredTextParser.ts` para aceitar linhas que sejam **nomes puros de exercício** quando estão dentro de contexto de bloco estruturado (ex: após um rep scheme "40,30,20,10").

**Parte 2: Backup — na modal de cobertura, linhas vermelhas ganham botão "É um exercício"**

Nas linhas classificadas como `uninterpretable` (vermelhas), adicionar um botão **"É um exercício → Sugerir"** que:
1. Move a linha da seção vermelha para amarela (exercício novo)
2. Envia como sugestão para o admin via `exercise_suggestions` (reusa o hook `useExerciseSuggestionSubmit` que já existe)
3. Marca como "✓ Enviado"

### Alterações

| Arquivo | O que muda |
|---|---|
| `src/utils/parsingCoverage.ts` | Na função `classifyUnmatchedLine`, antes de retornar `uninterpretable`, verificar se a linha se parece com nome de exercício (2+ palavras alfabéticas, sem números puros, sem narrativa) — se sim, classificar como `new_exercise` em vez de `uninterpretable` |
| `src/utils/structuredTextParser.ts` | Adicionar detecção de contexto pós-rep-scheme: se a linha anterior era um rep scheme ("40,30,20,10") e a linha atual tem apenas texto alfabético, marcar como exercício implícito |
| `src/components/TextModelImporter.tsx` | Na seção vermelha (linhas não interpretadas), adicionar botão "É um exercício → Sugerir" que reclassifica a linha e chama `submitSuggestion` |

### Resultado

- "Shoulder Taps" dentro de um bloco = classificado como `new_exercise` (amarelo) com opção de sugerir
- Linhas vermelhas ganham escape: o coach pode dizer "isso é um exercício" e enviar para aprovação
- Zero impacto no motor de cálculo (a IA já sabe interpretar)

