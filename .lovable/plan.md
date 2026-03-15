

## Explicação do Plano

### O que muda e por quê

O CEO identificou que a **Corrida 1** não é confiável como referência de pace porque:
- O perímetro da largada varia entre arenas
- Os atletas correm com adrenalina, fora do ritmo real

Por isso, a **Corrida 2** passa a ser o "Pace Base" — é o primeiro trecho após o Ski Erg, onde o atleta já estabeleceu seu ritmo verdadeiro.

### As 3 alterações no arquivo `FatigueIndexCard.tsx`

**1. Motor de Cálculo (useMemo)**
- **Antes:** Comparava Run 1 vs média das Runs 2-7
- **Agora:** Compara **Run 2** (pace base) vs média das **Runs 3 a 7** (fadiga)
- Run 1 e Run 8 ficam **fora** do cálculo
- Fórmula: `((Média Runs 3-7 − Run 2) / Run 2) × 100`

**2. Gráfico Visual**
- O gráfico de linha passa a mostrar apenas **Runs 2 a 7** (6 pontos)
- Isso garante que o visual corresponda exatamente ao que está sendo calculado

**3. Botão Info (Popover)**
- Um ícone discreto de informação ao lado do título "Resistência sob Fadiga"
- Ao clicar, aparece um texto explicando:
  - Run 2 é o pace base
  - Runs 3-7 são a média de fadiga
  - Run 1 é excluída (adrenalina) e Run 8 é excluída (sprint final)

### O que NÃO muda
- O gauge semicircular (visual do velocímetro) continua igual
- As cores de status permanecem: Verde (≤5%), Amarelo (≤12%), Vermelho (>12%)
- A validação de prova completa (8 runs) continua obrigatória

