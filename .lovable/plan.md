

## Diagnóstico: Linhas como "2x" e "6x" soltas no bloco

### O problema

O coach escreveu o treino assim:
```
Strength
6x
Sendo
2x 12 Back Squat
...
2x 8 Back Squat
...
(2' Rest a cada Round)
```

Aqui, "6x" e "2x" significam **número de rounds** — é a forma como esse coach escreve. Mas ele não seguiu o formato que o sistema reconhece como estrutura de rounds (que seria `**6 ROUNDS**`).

### O que acontece hoje

1. A linha "6x" sozinha é reconhecida pelo parser como "formato de exercício" (por causa do padrão `\d+x`), mas como ela não tem exercício ao lado (não é "6x10 Pull-ups"), ela fica num limbo — é classificada como categoria/formato e **perde o conteúdo**.

2. Linhas como "2x 12 Back Squat" funcionam bem — o parser entende como "2 séries de 12 Back Squat".

3. Mas a linha "6x" **sozinha** não vira rounds, não vira exercício, e acaba sumindo.

4. O sistema de estruturas (`workoutStructures.ts`) **só reconhece** o formato `**N ROUNDS**` entre asteriscos duplos. "6x" sozinho é invisível para ele.

### O que proponho

**Não tentar adivinhar** o que "6x" sozinho significa. Em vez disso:

1. **Preservar a linha "6x" no bloco** — ela não deve sumir. Mesmo que o sistema não saiba exatamente o que significa, o coach escreveu e o atleta precisa ver.

2. **Avisar o coach** com um warning amarelo (mesmo sistema de typos): _"6x" sozinho — Você quis dizer "**6 ROUNDS**"? Use o formato **N ROUNDS** para que o sistema calcule tempo e volume corretamente._

3. **Não bloquear o salvamento** — o treino salva normalmente, a linha aparece para o atleta, mas o coach sabe que o sistema não conseguiu interpretar como rounds.

### O que muda em cada arquivo

**`src/utils/structuredTextParser.ts`**:
- Na lógica de parsing, quando encontrar uma linha que é apenas `\d+x` (sem exercício depois), **manter como conteúdo do bloco** em vez de descartar.
- Adicionar um `typoWarning` específico: tipo "UNSTRUCTURED_ROUNDS" sugerindo o formato correto.

**`src/components/TextModelImporter.tsx`**:
- Exibir o warning de "rounds não estruturado" no mesmo estilo amarelo dos typos.

**`src/utils/blockDisplayUtils.ts`**:
- Garantir que o fallback de exibição inclua **todas** as linhas não-vazias (não só as com `-`), para que "6x", "Sendo", "(2' Rest...)" apareçam.

### O que NÃO muda
- O sistema de `**N ROUNDS**` continua funcionando normalmente para quem segue o formato.
- Nenhum cálculo é alterado — se o coach não usar o formato correto, o sistema não tenta adivinhar multiplicadores.
- O salvamento nunca é bloqueado.

### Resumo simples

| Situação | O que acontece |
|----------|---------------|
| Coach escreve `**6 ROUNDS**` | Sistema entende, calcula tempo × 6 |
| Coach escreve `6x` sozinho | Sistema **preserva** a linha, **avisa** o coach para usar o formato correto, mas **salva** normalmente |
| Coach escreve `2x 12 Back Squat` | Sistema entende como 2 séries de 12 reps (já funciona) |

**Nenhuma informação é perdida. Nenhum salvamento é bloqueado.**

