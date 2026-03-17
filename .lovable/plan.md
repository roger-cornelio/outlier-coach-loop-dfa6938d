

## O problema — explicação simples

Quando o coach cola o treino e clica "Ver tudo" para expandir o bloco, ainda faltam linhas. Por exemplo, no bloco Strength com 15 linhas, só aparecem 8 ou 9.

### Por que isso acontece?

O sistema tem **duas versões** do texto do bloco:

1. **Texto original** — exatamente o que o coach colou (todas as 15 linhas)
2. **Texto processado** — o que o parser conseguiu classificar (ex: só 8 linhas que ele reconheceu como exercícios)

Quando o coach clica "Ver tudo", o sistema mostra o **texto processado**. Se o parser não reconheceu uma linha (como "Sendo", ou um grupo de exercícios que ele não entendeu), essa linha simplesmente não aparece — mesmo estando no texto original.

### A solução

Mudar a lógica de exibição para fazer uma **comparação simples**:

- Se o texto original tem **mais linhas** do que o texto processado → mostrar o texto original (é mais completo)
- Se o texto processado tem tudo → continuar usando ele (é mais organizado)

Assim, o coach **sempre** vê pelo menos tudo o que colou. Nenhuma linha some.

### O que NÃO muda

- O parser continua funcionando igual
- O salvamento não é alterado
- Os avisos de typo continuam funcionando
- Só muda **qual versão do texto é exibida** quando o coach expande o bloco

### Resultado

Ao expandir qualquer bloco, o coach vê **100% das linhas** que colou — sem exceção.

