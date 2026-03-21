

## Plano: Atualizar Preview do Importador com UI idêntica à tela do atleta

### Problema

A tela de preview dentro do `TextModelImporter.tsx` (step 3 do fluxo de importação) ainda usa layout simples: texto puro, sem cards coloridos por tipo, sem cálculos de tempo e calorias, sem badges de estrutura. O coach não consegue conferir como o treino vai aparecer para o atleta.

O `WorkoutDetailModal` no `CoachProgramsTab.tsx` já foi atualizado, mas o preview do importador (que o coach vê ANTES de salvar) continua com a UI antiga.

### Solução

Reescrever a seção de preview do `TextModelImporter.tsx` (linhas ~1870-2004) para usar a mesma estrutura visual já implementada no `WorkoutDetailModal`:

#### 1) Cada dia como card colapsável
- Header com nome do dia + badge de totais (`~Xmin`, `~X kcal`)
- Colapsável com animação

#### 2) Blocos com UI do atleta
- Card com `border-l-4` colorido por tipo (aquecimento=amber, conditioning=primary, força=red, etc.)
- `CategoryChip` para tipo do bloco
- Badge "WOD Principal" quando aplicável
- `StructureBadge` para estruturas (ROUNDS, EMOM, AMRAP)
- `ExerciseLine` para exercícios
- `CommentSubBlock` para comentários

#### 3) Métricas por bloco
- Footer com tempo e calorias usando `computeBlockMetrics` + `getBlockTimeMeta`
- Biometrics padrão: masculino, 75kg, 170cm (mesmo do `WorkoutDetailModal`)
- Nota discreta: "Valores estimados para atleta padrão (masculino, 75kg, 170cm)"

#### 4) Totais por dia no header colapsável
- `Clock` icon + `~Xmin`
- `Flame` icon + `~X kcal`

### Detalhes técnicos

- Reutilizar os imports já presentes: `StructureBadge`, `CategoryChip`, `ExerciseLine`, `CommentSubBlock`, `getBlockDisplayDataFromParsed`
- Adicionar imports: `computeBlockMetrics`, `getBlockTimeMeta`, `formatEstimatedTime`, `formatEstimatedKcal`, `estimateWorkout`, `Flame`, `Collapsible`
- Usar constantes `COACH_PREVIEW_BIOMETRICS` / `blockTypeColors` (extrair do `CoachProgramsTab` ou duplicar localmente)
- Manter botões "Voltar para edição" e "Salvar e ir para Programações" intactos

### Arquivo a alterar
- `src/components/TextModelImporter.tsx` — reescrever seção de preview (linhas ~1870-2004)

