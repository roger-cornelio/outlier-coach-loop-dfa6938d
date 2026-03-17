

## Plano: Corrigir a ordem dos badges "2 ROUNDS"

### O que está acontecendo

Os badges "2 ROUNDS" agora aparecem, mas ficam **todos agrupados no topo** do bloco, em vez de intercalados com os exercícios. O atleta vê:

```
[2 ROUNDS] [2 ROUNDS] [2 ROUNDS]
12 Back Squat
20m Double DB Lunges
10m Broad Jump
8 Back Squat
...
```

### Por que isso acontece

Quando o parser monta o conteúdo final do bloco (`block.content`), ele junta todas as instruções ("2 ROUNDS") primeiro e depois todos os exercícios. Isso acontece na função `formatBlockContent` em `structuredTextParser.ts`, que concatena `instructions` + `items` separadamente, perdendo a intercalação original.

O bloco tem um campo `rawLines` (linhas originais do coach) que preserva a ordem correta. Mas o `content` gerado não usa essa ordem — e quando a UI lê o `content`, os badges ficam todos no topo.

### O que vamos corrigir

| O quê | Como |
|---|---|
| `formatBlockContent` em `structuredTextParser.ts` | Reconstruir o `content` usando `rawLines` como guia de ordem, intercalando estruturas e exercícios na sequência original |

É uma correção cirúrgica em **1 função**. O resto do sistema já sabe renderizar `__STRUCT:` como badges — o problema é exclusivamente o input desordenado.

### Resultado esperado

```
[badge] 2 ROUNDS
  12 Back Squat
  20m Double DB Lunges
  10m Broad Jump
[badge] 2 ROUNDS
  8 Back Squat
  20m Double DB Lunges
  10m Broad Jump
[badge] 2 ROUNDS
  4 Back Squat
  20m Double DB Lunges
  10m Broad Jump
```

Sem mudanças no banco de dados.

