

## Plano: Rounds semânticos + ordem visual preservada

### O problema

Quando o coach escreve um treino com vários marcadores de rounds no mesmo bloco, duas coisas falham:

1. **Visual**: Os badges "2 ROUNDS" aparecem todos juntos no topo em vez de ficarem onde o coach colocou
2. **Cálculos**: O sistema não entende que cada "2 ROUNDS" se aplica só aos exercícios logo abaixo dele — ele pega o primeiro número de rounds e multiplica tudo de uma vez

### O que vamos fazer

**Parte 1 — Corrigir a ordem visual (1 arquivo)**

A função que monta a tela do treino recebe as linhas originais do coach numa lista separada, mas ignora essa lista e usa outra que já vem reorganizada. Vamos fazer ela priorizar as linhas originais. Isso corrige a ordem em todas as telas — editor do coach, visão semanal do atleta e tela de execução.

Nenhuma mudança de design, cores ou layout.

**Parte 2 — Criar a lógica de grupos de rounds (1 arquivo novo)**

Vamos criar uma função que lê o conteúdo do bloco e divide em grupos. A regra é simples: cada marcador de rounds "pertence" aos exercícios que vêm logo abaixo dele, até o próximo marcador ou o fim do bloco. Exercícios sem marcador acima contam uma vez só.

Exemplo prático:
- "2 ROUNDS" seguido de Back Squat e Air Squat → esse par repete 2 vezes
- "3 ROUNDS" seguido de Burpee e Row → esse par repete 3 vezes
- Os dois grupos são independentes

**Parte 3 — Tempo usa os grupos (1 arquivo)**

Hoje o estimador de tempo procura um único número de rounds no bloco inteiro. Vamos trocar para usar os grupos da Parte 2, somando o tempo de cada grupo multiplicado pelo seu próprio número de repetições.

**Parte 4 — Calorias usam os grupos (1 arquivo)**

Mesma lógica: o cálculo de calorias vai multiplicar o gasto de cada exercício pelo número de rounds do grupo a que ele pertence, em vez de ignorar os rounds.

### O que NÃO muda

- Design, cores e layout — tudo igual
- Banco de dados — sem alterações
- Forma como o coach escreve — continua igual
- Telas que já funcionam — não são afetadas

### Resultado final

- O atleta vê o treino na ordem exata que o coach escreveu
- O tempo estimado reflete a repetição correta de cada grupo
- As calorias refletem a repetição correta de cada grupo

**4 arquivos alterados, zero mudanças no banco.**

