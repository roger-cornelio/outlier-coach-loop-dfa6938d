

## O que está acontecendo hoje

Quando o coach escreve um treino com 3 seções de "2 ROUNDS" no mesmo bloco (ex: FORÇA), o sistema só mostra **1 badge** no topo e lista todos os exercícios embaixo, sem separação. O atleta não consegue ver onde começa e termina cada grupo de rounds.

## Por que isso acontece

Dois problemas:

1. **O título do bloco ("FORÇA") está sendo incluído na lista de exercícios** — ele aparece como uma linha fantasma misturada com os exercícios reais.

2. **O detector de "2 ROUNDS" é rígido demais** — se a linha tiver um espaço invisível no final ou qualquer caractere extra, o sistema não reconhece como estrutura e trata como exercício normal.

## O que vamos corrigir

| Problema | Correção |
|---|---|
| Título do bloco aparecendo como exercício | Filtrar a linha que é igual ao título antes de montar a lista de exercícios |
| Detector rígido de "N ROUNDS" | Tornar a detecção mais tolerante a espaços extras no final da linha |
| Fallback sobrescrevendo dados | Garantir que quando já detectamos múltiplos badges, o sistema não descarte essa informação ao usar um caminho alternativo de exibição |

## Resultado esperado

O atleta verá o bloco FORÇA assim:

- **[badge] 2 ROUNDS**
- 12 Back Squat
- 20m Double DB Lunges
- 10m Broad Jump
- **[badge] 2 ROUNDS**
- 8 Back Squat
- 20m Double DB Lunges
- 10m Broad Jump
- **[badge] 2 ROUNDS**
- 4 Back Squat
- 20m Double DB Lunges
- 10m Broad Jump

Cada grupo de rounds fica visualmente separado com seu badge, na ordem que o coach escreveu. Sem mudanças no banco de dados.

