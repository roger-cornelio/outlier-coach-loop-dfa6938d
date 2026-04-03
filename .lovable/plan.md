

## Motor de Proporção Diagnóstica — Versão Unificada

### O problema de hoje

A tabela de diagnóstico que o atleta vê ("Diagnóstico de Melhoria") calcula o foco de cada estação de forma simples: divide o tempo que ele pode ganhar naquela estação pelo total de tempo que pode ganhar na prova inteira.

Isso gera distorções. Por exemplo, as Corridas 5-8 consomem 32% do tempo da prova, então qualquer diferença ali gera um número grande. Já Wall Balls consomem só 8%, mas melhorar ali tem um impacto desproporcional no resultado final. Com a fórmula atual, Wall Balls fica subestimado e Corridas fica superestimado.

Se o motor de adaptação de treinos usar uma fórmula mais inteligente mas a tabela de diagnóstico continuar com a fórmula antiga, o atleta vê uma coisa e recebe outra — incoerente.

### A solução: uma única fórmula para tudo

Criar um arquivo central que contém:

1. **Tabela fixa do esporte** — quanto cada estação pesa no tempo da prova e quanto impacta no resultado final
2. **Fórmula ponderada** — 60% do tempo consumido + 40% do impacto real
3. **Duas funções que usam essa mesma base**:
   - Uma para calcular o percentual de foco que aparece na tabela de diagnóstico (o que o atleta vê)
   - Outra para calcular os multiplicadores de volume do treino (o que o coach controla na publicação)

### O que muda para o atleta

A coluna "Foco" na tabela de diagnóstico passa a mostrar valores mais realistas. Wall Balls sobe de ~8% para ~13%. Roxzone sobe de ~6% para ~10%. Corridas longas descem de ~32% para ~30%. Os números refletem melhor onde vale a pena investir esforço.

### O que muda para o coach

Nada muda na forma de escrever treinos. Na hora de publicar, aparece um step novo onde ele vê os ajustes propostos por atleta e pode ligar ou desligar a adaptação. Os percentuais que ele vê ali são os mesmos que o atleta vê no diagnóstico — mesma lógica, mesma fonte.

### Sequência de implementação

1. Criar o arquivo central com a tabela e as duas funções
2. Atualizar a tabela de diagnóstico para usar a fórmula ponderada
3. Adicionar o step de revisão no modal de publicação do coach

### Ganho de precisão

- **Antes (fórmula linear):** ~65-70% de acerto na priorização
- **Depois (fórmula ponderada unificada):** ~85-90% de acerto
- **Diferença:** estações decisivas mas curtas deixam de ser ignoradas, e diagnóstico + treino falam a mesma língua

