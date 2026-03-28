

## Plano: Extrator semântico de linha + diferenciação visual no editor

### Problema
O sistema trata a linha inteira como um bloco de texto único. Não separa visualmente o que é exercício, duração, carga ou intensidade — nem no parser, nem na tela do coach.

### Parte 1 — Extrator semântico de linha (novo utilitário)

**Novo arquivo: `src/utils/lineSemanticExtractor.ts`**

Função `extractLineSemantics(line)` que decompõe qualquer linha em partes tipadas:

| Tipo | Exemplos | Cor na UI |
|------|----------|-----------|
| `movement` | Bike, Back Squat, Pull-ups | branco (texto normal) |
| `duration` | 30", 5min, 1:30 | azul |
| `distance` | 1000m, 5km | verde |
| `reps` | 10, 5x5, 3 rounds | laranja |
| `load` | 80kg, 32/24kg, 70% | vermelho |
| `intensity` | PSE 7, Zona 2, FC 150 | vermelho pulsante |
| `cadence` | 60-70 rpm, pace 4:30/km | roxo |
| `parenthetical` | (60-70 rpm), (leve) | cinza itálico |

Lógica:
1. Extrair todas as métricas conhecidas via regex (reutilizando patterns do `unitDetection.ts`)
2. Adicionar patterns novos para carga (`kg`, `lb`, `%`), cadência (`rpm`, `km/h`) e pace (`min/km`)
3. Remover métricas do texto bruto → o que sobra é o `movement`
4. Retornar array de `{ type, text, startIndex }` na ordem original

### Parte 2 — Componente visual `SemanticExerciseLine`

**Arquivo: `src/components/DSLBlockRenderer.tsx`**

Novo componente `SemanticExerciseLine` que substitui `ExerciseLine` na tela de edição:
- Chama `extractLineSemantics(line)`
- Renderiza cada segmento com cor/badge específico por tipo
- Exercício = texto normal
- Duração = badge azul com ícone de relógio
- Carga = badge vermelho com ícone de peso
- Intensidade = badge vermelho forte
- Cadência = badge roxo
- Parênteses = texto cinza itálico (sem badge)

### Parte 3 — Integrar no editor

**Arquivo: `src/components/TextModelImporter.tsx`**

- Na tela de edição (mode='edit'), trocar `<ExerciseLine>` e `<p>` por `<SemanticExerciseLine>`
- Na tela de preview e na view do atleta, manter `<ExerciseLine>` simples (sem poluição visual)

### Parte 4 — Corrigir lista de "Sugerir exercício"

**Arquivo: `src/utils/parsingCoverage.ts`**

- Usar `extractLineSemantics()` para extrair apenas o `movement`
- Comparar o `movement` contra o dicionário de exercícios (não a linha inteira)
- Linhas onde o movimento é conhecido + métricas extras = "interpretada" (não vai para sugestão)

### Resultado esperado
- Coach vê visualmente cada parte da linha com cor diferente no editor
- Sistema para de tratar "30" Bike (60-70 rpm)" como exercício desconhecido
- Lista de sugestão passa a mostrar apenas movimentos realmente desconhecidos
- Preview do atleta continua limpo (sem badges coloridos)

### Arquivos envolvidos
- `src/utils/lineSemanticExtractor.ts` (novo)
- `src/components/DSLBlockRenderer.tsx` (novo componente)
- `src/components/TextModelImporter.tsx` (trocar renderer na edição)
- `src/utils/parsingCoverage.ts` (usar movement extraído)

