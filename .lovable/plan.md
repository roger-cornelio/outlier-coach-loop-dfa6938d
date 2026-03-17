

## Plano: Corrigir badges "2 ROUNDS" em todas as telas

### O que está errado

Quando o coach escreve 3 seções de "2 ROUNDS" no mesmo bloco, só aparece 1 badge. Os exercícios ficam todos misturados sem separação visual.

### Por que acontece (3 problemas)

1. **O parser descarta as repetições** — Existe uma regra que elimina linhas iguais consecutivas. Então a 2ª e 3ª vez que "2 rounds" aparece, o sistema joga fora. A proteção contra isso só funciona quando o texto está com asteriscos (`**2 ROUNDS**`), não com texto simples.

2. **A preview do coach ignora os marcadores** — Mesmo quando o sistema consegue detectar as múltiplas estruturas, a tela de preview do coach simplesmente mostra o marcador como texto puro em vez de renderizar como badge visual.

3. **A tela de execução do atleta usa um caminho diferente** — Ela processa o conteúdo por uma função separada que manda as linhas "2 rounds" para um lugar que nunca é exibido como badge inline.

### O que vamos corrigir

| Problema | Correção |
|---|---|
| Parser descartando "2 rounds" repetidos | Proteger linhas estruturais (como "N rounds") de serem eliminadas como duplicatas |
| Preview do coach não mostrando badges | Adicionar detecção de marcadores estruturais na renderização da preview |
| Tela de execução do atleta perdendo dados | Trocar a função de processamento por uma que preserve a ordem e os marcadores |
| Função auxiliar de separação de conteúdo | Fazer ela também gerar marcadores inline para linhas estruturais sem asteriscos |

### Telas afetadas

- Editor/preview do coach
- Visualização semanal do atleta
- Tela de execução do treino

### Resultado esperado

Em todas as telas, o atleta e o coach verão:

```text
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

Cada grupo fica visualmente separado com seu badge, na ordem que o coach escreveu. Sem mudanças no banco de dados — tudo é correção de lógica de exibição.

