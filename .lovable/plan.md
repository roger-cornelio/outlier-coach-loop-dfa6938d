
## Plano: fazer `2r ounds` aparecer como erro imediatamente na edição

### Diagnóstico exato

Hoje existe um falso negativo na regra de typo estrutural:

- no `structuredTextParser`, a lógica pega `2r ounds`, remove o número e normaliza a parte textual para `rounds`
- depois compara com `rounds` por Levenshtein
- como a distância fica `0`, a regra atual **não entra** no detector porque exige `dist > 0`
- resultado: a linha **não vira `NOTE LOW`**, cai no fallback e vira `EXERCISE LOW`
- por isso:
  - o bloco pode não ganhar o alerta correto na edição
  - o coach não recebe a sugestão “Você quis dizer `2 Rounds`?”

Em resumo: o sistema está “normalizando demais” antes de decidir se houve erro de escrita.

### O que vou ajustar

#### 1) Corrigir a detecção de typo estrutural no parser
**Arquivo:** `src/utils/structuredTextParser.ts`

Trocar a regra atual por uma verificação em duas etapas:

- comparar o texto original pós-número (`r ounds`) com termos estruturais
- tratar como erro também quando:
  - a versão sem espaços bate exatamente com `rounds`, `emom`, `amrap`, etc.
  - mas a versão original contém separação interna inválida (`r ounds`, `a mrap`, `e mom`)

Assim `2r ounds` será classificado como `NOTE LOW` e não como exercício.

#### 2) Reforçar a sugestão de correção na cobertura
**Arquivo:** `src/utils/parsingCoverage.ts`

Ajustar `detectStructuralTypo` para também considerar:
- “match exato após colapsar espaços” como **erro de escrita estrutural**
- sugestão explícita:
  - `2r ounds` → `2 Rounds`
  - `15a mrap` → `15 AMRAP`

Hoje a função sofre do mesmo problema: ao virar `rounds`, entende como “sem erro” e não sugere nada.

#### 3) Garantir que a UI mostre a dica ao coach
**Arquivo:** `src/components/TextModelImporter.tsx`

Hoje o modal lista a linha não interpretada, mas não renderiza `line.suggestion`.

Vou incluir a sugestão visual no detalhe do erro, por exemplo:
- `"2r ounds"`
- `Você quis dizer "2 Rounds"?`

Isso deixa a correção óbvia na própria tela de edição.

#### 4) Garantir que o bloco fique amarelo por esse caso
**Arquivo:** `src/components/TextModelImporter.tsx`

Validar a regra de borda amarela para esse fluxo específico:
- depois que `2r ounds` passar a virar `NOTE LOW`, o `hasLooseNotes` já deve marcar o bloco
- se houver qualquer brecha, amarrar também com `coverageReport.unmatchedLines` por bloco para não depender só do `kind`

### Testes que vou cobrir

**Arquivos de teste:**
- `src/utils/__tests__/dslParser.test.ts` ou teste equivalente do parser
- se necessário, novo teste para cobertura em `parsingCoverage`

Casos:
- `2r ounds` → erro de interpretação + sugestão `2 Rounds`
- `2 rounds` solto → erro de interpretação + sugestão `2 Rounds`
- `**2 ROUNDS**` → válido, sem erro
- `(2' Rest a cada Round)` → comentário válido, sem erro
- `2' Rest a cada Round` solto → erro de interpretação

### Resultado esperado

Depois da correção, na tela de edição:
- `2r ounds` será marcado como erro
- o bloco ficará amarelo
- o modal mostrará a linha problemática
- o coach verá a sugestão correta para ajustar antes de salvar/publicar

### Arquivos a alterar
- `src/utils/structuredTextParser.ts`
- `src/utils/parsingCoverage.ts`
- `src/components/TextModelImporter.tsx`
- arquivo(s) de teste do parser/cobertura
