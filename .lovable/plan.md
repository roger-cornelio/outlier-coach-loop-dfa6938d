

## Plano: Auto-detecção de categoria de bloco pelo parser

### Viabilidade e Assertividade Estimada

O parser já extrai título do bloco, formato (AMRAP/EMOM/Rounds/Tabata), e conteúdo dos exercícios. Com essas 3 fontes de sinal, a detecção automática alcança diferentes níveis de assertividade por categoria:

| Categoria | Sinal principal | Assertividade estimada |
|-----------|----------------|----------------------|
| **Aquecimento** | Título contém "warm up", "aquecimento", "ativação" | **95%** |
| **Metcon** | Formato AMRAP/EMOM/Tabata/For Time detectado | **95%** |
| **Força** | Padrão "4x8", "5x3" sem AMRAP/EMOM + título "força/strength" | **85%** |
| **Corrida** | Conteúdo só tem running/corrida + distância/tempo | **90%** |
| **Específico (HYROX)** | Título contém "HYROX", "específico", ou tem estações HYROX (sled, wall balls + running) | **80%** |
| **Acessório** | Título contém "acessório", "accessory", "complementar" | **90%** |
| **Mobilidade** | Título contém "mobilidade", "mobility", "alongamento", "stretching" | **95%** |
| **Técnica** | Título contém "técnica", "skill", "drill" | **90%** |

**Assertividade geral ponderada: ~88-90%**

Os 10% de erro são casos ambíguos como:
- "Força" vs "Acessório" (supino pesado 3x5 vs supino leve 3x15 — mesma estrutura, intenção diferente)
- "Metcon" vs "Específico" (circuito com estações HYROX misturadas)
- Blocos sem título claro

### Como funciona

1. Parser processa o texto normalmente (já faz hoje)
2. Ao finalizar cada bloco, uma função `inferBlockCategory()` analisa:
   - **Título** (prioridade 1): match por keywords em PT/EN
   - **Formato** (prioridade 2): AMRAP/EMOM/Tabata → metcon
   - **Conteúdo** (prioridade 3): tipos de exercício encontrados
3. O resultado preenche `block.type` automaticamente
4. Coach vê a categoria pré-selecionada no dropdown e pode alterar manualmente

### Arquivos alterados

1. **`src/utils/structuredTextParser.ts`** — Criar função `inferBlockCategory()` que retorna a categoria mais provável. Remover o comentário "MVP0: NÃO refinar tipo automaticamente" e ativar a inferência. Retorna `{ category: string, confidence: 'high' | 'medium' | 'low' }`.

2. **`src/utils/categoryValidation.ts`** — Adicionar dicionário `CATEGORY_KEYWORDS` com as keywords por categoria (PT e EN) usado pela inferência.

3. **`src/components/StructuredWorkoutEditor.tsx`** — Nenhuma mudança funcional. O dropdown já permite alteração manual. Opcionalmente, mostrar um indicador visual (ex: borda amarela) quando a confiança é "low" para sugerir revisão ao coach.

### Regra de fallback

Se nenhum sinal forte é encontrado → `block.type = 'conditioning'` (comportamento atual mantido). Coach altera manualmente.

