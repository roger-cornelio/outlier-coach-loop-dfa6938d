

## O que será feito

### Renomear "Gap Total" → "Resultado Esperado"

O label "Gap total" será trocado por **"Resultado Esperado"** nos 3 locais onde aparece: mobile, desktop e EvolutionProjectionCard.

### Novo cálculo do valor

O valor exibido passa a ser:

**Tempo Atual − Ganho em 12 meses = Resultado Esperado**

Exemplo: se o atleta tem 1:25:08 e o ganho em 12m é 3min 0s → resultado esperado = **1:22:08**

O formato será **horas:minutos:segundos** (ex: `1:22:08`).

### Gráfico — formato do eixo Y

O eixo Y do gráfico de projeção passará a exibir **horas:minutos:segundos** em vez de apenas horas:minutos.

### Arquivos alterados
- `src/components/DiagnosticRadarBlock.tsx` — mobile (linha ~2379-2380), desktop (linha ~2562-2564), e lógica do novo cálculo + formato do gráfico
- `src/components/diagnostico/EvolutionProjectionCard.tsx` — mesma alteração (linha ~227-228)

