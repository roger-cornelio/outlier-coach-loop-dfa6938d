

## Plano: Corrigir exibição de "TABATA" como exercício

### Problema

Quando o coach escreve:
```
AQUECIMENTO
Squat to Stand
TABATA
Pike Lunges
```

A palavra "TABATA" aparece como se fosse um exercício entre "Squat to Stand" e "Pike Lunges". Isso acontece porque a função de exibição (`getBlockDisplayDataFromParsed`) só reconhece estruturas entre asteriscos duplos (ex: `**Tabata**`). Uma linha "TABATA" sem asteriscos cai na lista de exercícios.

### Solução

Na função `getBlockDisplayDataFromParsed` em `src/utils/blockDisplayUtils.ts`, adicionar uma verificação usando `isStructuralLine` (que já existe e reconhece "Tabata", "EMOM", "AMRAP", "For Time", etc.) **antes** de adicionar a linha como exercício. Se a linha for estrutural, ela vai para `structureDescription` (exibida como badge) em vez de `exerciseLines`.

### Arquivo alterado

| Arquivo | Alteração |
|---|---|
| `src/utils/blockDisplayUtils.ts` | Nos 3 pontos onde linhas são classificadas dentro de `getBlockDisplayDataFromParsed`, checar `isStructuralLine()` e rotear para `structureDescription` em vez de `exerciseLines` |

### O que muda para o usuário

- "TABATA" deixa de aparecer como exercício e passa a ser exibido como badge de estrutura (igual a "3 ROUNDS" ou "EMOM 10")
- Mesmo comportamento para AMRAP, For Time, EMOM quando escritos sem asteriscos
- Nenhuma alteração no parser ou banco de dados

