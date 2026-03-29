

## Plano: Adicionar categorias "Mobilidade" e "Técnica"

### Resumo
Adicionar duas novas categorias de bloco ao sistema, com emojis, e trocar o emoji de Acessório para evitar duplicação.

### Categorias finais (8 total)
| Emoji | Categoria | Pode ser principal? |
|-------|-----------|-------------------|
| 🔥 | Aquecimento | Não |
| 💪 | Força | Sim |
| ⚡ | Metcon | Sim |
| 🛷 | Específico (HYROX) | Sim |
| 🏃 | Corrida | Não |
| 🔧 | Acessório | Não |
| 🧘 | **Mobilidade** | Não |
| 🎯 | **Técnica** | Não |

### Comportamento
- Ambas sem validação de conteúdo (coach escreve livremente)
- Motor de adaptação **não escala** esses blocos (preserva original)
- IA recebe labels `[MOBILIDADE]` e `[TÉCNICA]` nos prompts

### Arquivos alterados
1. **`src/utils/categoryValidation.ts`** — adicionar 2 categorias no array, trocar emoji de acessório, adicionar 2 cases no switch
2. **`src/utils/mandatoryAdaptationEngine.ts`** — adicionar types e cases (sem scaling)
3. **`src/utils/workoutCalculations.ts`** — tempos estimados (mobilidade: 10min, técnica: 15min)
4. **`src/utils/workoutEstimation.ts`** — fallback de estimativa
5. **`src/utils/intelligentTimeAdaptation.ts`** — tempos mínimos
6. **`src/utils/mainBlockIdentifier.ts`** — pesos de prioridade baixos

