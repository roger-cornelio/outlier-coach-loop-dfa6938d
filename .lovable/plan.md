

## Plano: Atualizar instruções, modelo recomendado e expandir mapa DSL de dias

### 1) Expandir mapa de dias no DSL
**Arquivo:** `src/utils/dslParser.ts` (linhas 48-59)

Adicionar variantes com `-FEIRA` ao `DSL_DAY_MAP`:
- `SEGUNDA-FEIRA`, `TERÇA-FEIRA`, `QUARTA-FEIRA`, `QUINTA-FEIRA`, `SEXTA-FEIRA`
- Também `TERCA-FEIRA` (sem acento)

Assim o coach pode escrever `DIA: SEGUNDA` ou `DIA: SEGUNDA-FEIRA` — ambos funcionam.

### 2) Atualizar modelo recomendado
**Arquivo:** `src/components/StructuredErrorDisplay.tsx` (linhas 129-150 e 207-224)

**Template novo** — exemplo realista com estrutura AMRAP, comentários entre `()`, métricas concretas:

```
DIA: SEGUNDA

BLOCO: AQUECIMENTO
- 800m Run Z2
- 3x10 Squat to Stand
(Foco na mobilidade de quadril)

BLOCO: WOD
**15' AMRAP**
- 10 Wall Ball 9kg
- 15 Cal Row
- 5 Bar Muscle-up
(Cap 5 rounds)

DIA: TERÇA

BLOCO: FORÇA
- Back Squat 5x5 @80%
- Romanian Deadlift 4x8
(Rest 2' entre séries)
```

**Legenda atualizada** — remover `=` e `>`, adicionar:
- `DIA:` → início do dia
- `BLOCO:` → início do bloco
- `**estrutura**` → AMRAP, EMOM, Rounds, For Time
- `-` exercício → cada exercício com métrica
- `( )` → comentário/observação (obrigatório)
- Aviso: "Texto solto sem ( ) será marcado como erro"

### 3) Atualizar sintaxe DSL no importador
**Arquivo:** `src/components/TextModelImporter.tsx` (linhas 923-931)

Adicionar linha de aviso:
- `⚠️ Texto solto sem ( ) será marcado como erro de interpretação`

### 4) Atualizar teste unitário
**Arquivo:** `src/utils/__tests__/dslParser.test.ts`

Adicionar teste para `DIA: SEGUNDA-FEIRA` ser reconhecido corretamente.

### Arquivos a alterar
- `src/utils/dslParser.ts` — expandir `DSL_DAY_MAP`
- `src/components/StructuredErrorDisplay.tsx` — template + legenda
- `src/components/TextModelImporter.tsx` — aviso na sintaxe
- `src/utils/__tests__/dslParser.test.ts` — teste para variantes com `-FEIRA`

