

## Plano: Detectar typos de termos estruturais na tela de edição

### Problema

Quando o coach escreve **"2r ounds"** (com espaço no meio), o sistema hoje classifica como exercício de baixa confiança. Como "r ounds" não existe no dicionário de exercícios nem tem unidades reconhecíveis, a linha deveria aparecer como erro — mas passa invisível.

### Como vamos resolver

#### 1) Interceptar no classificador — antes de virar "exercício"
**Arquivo:** `src/utils/structuredTextParser.ts`

Hoje a regra é: "linha começa com número → é exercício". Vamos adicionar uma checagem antes:

- Separar a parte numérica da parte textual (ex: `"2r ounds"` → número `2`, texto `"r ounds"`)
- Normalizar o texto (juntar espaços, lowercase)
- Comparar com termos estruturais conhecidos: `rounds`, `series`, `sets`, `rodadas`, `emom`, `amrap`, `tabata`
- Se a distância de Levenshtein for ≤ 2 → **não é exercício**, é uma nota solta com erro de digitação
- Classificar como `NOTE LOW` → cai na regra de "nota solta = borda amarela + erro"

#### 2) Mostrar sugestão "Você quis dizer…?"
**Arquivo:** `src/utils/parsingCoverage.ts`

- Adicionar campo `suggestion` na interface `UnmatchedLine`
- Quando uma nota solta é detectada como typo estrutural, preencher a sugestão (ex: *"Você quis dizer '2 Rounds'?"*)
- O modal de detalhes exibe essa dica para o coach corrigir

### Resultado esperado

O coach escreve `"2r ounds"` → o bloco fica com borda amarela → ao clicar, vê: **"Linha não interpretada: '2r ounds' — Você quis dizer '2 Rounds'?"**

### Arquivos a alterar
- `src/utils/structuredTextParser.ts` — regra de classificação
- `src/utils/parsingCoverage.ts` — sugestão fuzzy + campo `suggestion`

