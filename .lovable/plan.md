

## Plano: Dica sobre simulados como botão em qualquer nível da régua

### O que muda

A frase "Realize um simulado para medir o quão próximo você está da meta" deixa de ser texto visível apenas em 0% e passa a ser um **botão discreto sempre visível** abaixo da régua, independente do percentual de progresso.

### Comportamento

- Aparece como um **botão pequeno** (ex: "💡 Como avanço na régua?") abaixo da barra de progresso
- Ao clicar, exibe um tooltip ou popover com a explicação: "A régua avança conforme você realiza simulados. Cada simulado mede o quão próximo você está da meta."
- Visível em **qualquer nível** da régua (0%, 46%, 80%...)
- **Não aparece** apenas se a meta já foi atingida (`isGoalReached`)

### Arquivo

`src/components/DiagnosticRadarBlock.tsx` — mobile e desktop, entre a barra de progresso e a frase de ação. Usar `Popover` ou `Tooltip` para o conteúdo expandido.

### O que não muda
- Cálculos, barra, frase de ação
- Nenhuma tabela no banco

