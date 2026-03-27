

## Plano: Visor de Ação Unificado — Status + Projeção de Evolução

### Problema atual
O visor de 4 colunas (Última Prova, Status Atual, Próximo, GAP) é abstrato — mostra tempos de referência entre níveis mas não responde "quanto tempo falta pra eu subir?". A projeção de evolução já tem essa resposta (taxa/mês), mas fica separada num card abaixo.

### Novo layout proposto

Substituir as 4 colunas + card de projeção separado por um **visor unificado de 2 linhas**:

```text
┌────────────────────────────────────────────────────────────┐
│  SEU TEMPO         META PRO          FALTAM      PREVISÃO  │
│  01:22:30          01:10:00          ↓ 12m30s    ~8 meses  │
│                                                             │
│  [████████████████████░░░░░░░░░░] ← barra de progresso     │
│                                                             │
│  "Com evolução de 90s/mês, você atinge PRO em ~8 meses"   │
└────────────────────────────────────────────────────────────┘
```

### As 4 colunas novas

1. **SEU TEMPO** — tempo da última prova oficial (já existe)
2. **META [NÍVEL]** — tempo necessário para o próximo nível (ex: "Meta PRO: 01:10:00")
3. **FALTAM** — gap real do atleta: `currentTime - nextReqSec` (não gap entre referências)
4. **PREVISÃO** — meses estimados para atingir o próximo nível: `gapSeconds / ratePerMonth` (dados da projeção de evolução)

**Barra de progresso**: posição do atleta entre seu tempo atual e a meta do próximo nível.

**Frase de ação**: "Com evolução de Xs/mês, você atinge [NÍVEL] em ~N meses" — ou "Meta atingida ✓" se já bateu.

### Mudanças técnicas

**Arquivo**: `src/components/DiagnosticRadarBlock.tsx`

1. **`performanceSnapshot` (useMemo, ~linha 1887)**: 
   - Calcular `gapToNext = currentTime - nextReqSec` (gap real do atleta, não entre referências)
   - Usar `evolutionProjection.ratePerMonth` para calcular `monthsToNext = Math.ceil(gapToNext / ratePerMonth)`
   - Gerar `actionPhrase` e `progressPercent`

2. **Grid mobile (linhas 2319-2357)** e **Grid desktop (linhas 2466-2498)**:
   - Trocar as 4 colunas antigas pelas 4 novas (Seu Tempo, Meta, Faltam, Previsão)
   - Adicionar barra de progresso visual abaixo
   - Adicionar frase de ação

3. **Remover card de Projeção de Evolução separado** (linhas 2360-2387 mobile):
   - O gráfico de 12 meses e os 3 mini-cards (Resultado Esperado, Ganho/mês, Ganho em 12m) são absorvidos pelo visor unificado
   - Manter o gráfico de linha como um accordion/expandível dentro do visor, para quem quiser ver o detalhe

### Regras
- Se atleta já é ELITE → "Meta ELITE atingida ✓", sem previsão
- Se gap < 60s → destaque verde "Quase lá!"
- Se não há projeção (sem dados) → mostrar "—" na coluna Previsão

### O que não muda
- Lógica de `calculateEvolutionTimeframe` (fonte dos dados de taxa/mês)
- Tabelas no banco de dados
- Card de Projeção de Evolução standalone (`EvolutionProjectionCard.tsx`) — continua disponível para uso em outras telas (Diagnóstico Gratuito)

