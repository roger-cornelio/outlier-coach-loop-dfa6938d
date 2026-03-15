

## Problema Identificado

O componente `EvolutionProjectionCard.tsx` que editamos **não está sendo usado em lugar nenhum**. A projeção de evolução está **duplicada inline** diretamente no `DiagnosticRadarBlock.tsx` — duas vezes (mobile e desktop). Por isso:

- A copy antiga ("este é o ritmo de evolução necessário para atingir o próximo nível") continua aparecendo
- O gráfico de 12 meses não aparece
- A terceira métrica mostra "Meses" com ícone de calendário em vez de "Ganho em 12m"

## O que será feito

Atualizar as **duas versões inline** no `DiagnosticRadarBlock.tsx` (mobile + desktop) para refletir o que programamos:

### 1. Copy atualizada (mobile + desktop)
**De:** "este é o ritmo de evolução necessário para atingir o próximo nível:"
**Para:** "essa é a evolução esperada nos próximos 12 meses"

### 2. Terceira métrica (mobile + desktop)
**De:** Ícone de calendário + número de meses + label "meses"
**Para:** Ganho projetado em 12 meses (ex: "3min 0s") + label "Ganho em 12m"

### 3. Gráfico de evolução 12 meses (desktop)
Adicionar o `AreaChart` com projeção mês a mês (mesmo que já existe no `EvolutionProjectionCard.tsx`) na versão desktop do bloco inline.

### Arquivo alterado
- `src/components/DiagnosticRadarBlock.tsx` — duas seções: mobile (~linha 2337) e desktop (~linha 2499)

