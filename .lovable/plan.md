

# Eliminar Redundância do "Status Competitivo"

## Problema

O nível (ex: "HYROX PRO") aparece em 3 lugares: header da identidade, bloco "Status competitivo", e na barra da Jornada. Isso gera repetição sem valor.

## Solução

### 1. Remover bloco "Status competitivo" separado

No desktop (linhas ~689-698 do `DiagnosticRadarBlock.tsx`), o bloco que mostra "Status competitivo / HYROX PRO / frase de resumo" sera removido por completo.

No mobile (linhas ~189-193 do `MobileDecisionCard`), o mini bloco "Status competitivo / HYROX PRO" tambem sera removido.

### 2. Substituir por dados uteis no header da identidade

O header da identidade (desktop linhas ~680-687, mobile linhas ~167-177) ja mostra nome + categoria. Adicionar logo abaixo:

- **Tempo ultima prova**: `formatOfficialTime(validatingCompetition.time_in_seconds)` (se existir)
- **Ranking categoria**: `Top X%` (ja calculado como `100 - outlierScore.score`)
- **Evolucao**: placeholder "---" por enquanto (dado nao calculado hoje)

Se nao houver prova oficial, mostrar "Sem prova oficial registrada" em texto sutil.

Formato:

```text
ATLETA NOME
HYROX PRO WOMEN

Ultima prova: 1h19m57  |  Top 41%  |  Evolucao: ---
```

### 3. Na Jornada, remover label "HYROX PRO" repetido

Na barra de progresso da Jornada (desktop linhas ~768-771), ja temos `currentLevelLabel -> targetLevelLabel`. O `currentLevelLabel` vem de `journeyData` e mostra ex: "PRO".

Manter apenas `PRO -> ELITE  78%` na barra. Nenhum outro lugar dentro da Jornada mostrara o nome do nivel.

## Dados disponiveis (sem mudancas de backend)

- `validatingCompetition.time_in_seconds` — tempo da ultima prova oficial
- `validatingCompetition.event_date` — data da prova
- `formatOfficialTime()` — funcao ja existente em `athleteStatusSystem.ts`
- `outlierScore.score` — para calcular ranking (Top X%)
- Evolucao desde ultima prova: dado nao disponivel hoje, usar placeholder "---"

## Arquivo alterado

Apenas `src/components/DiagnosticRadarBlock.tsx`

## Detalhes tecnicos

### Mudancas no desktop (layout completo)

1. **Remover** bloco "Status competitivo" (linhas ~689-698)
2. **Expandir** bloco identidade (linhas ~680-687) para incluir linha de dados competitivos:
   - Import `formatOfficialTime` de `@/utils/athleteStatusSystem`
   - Usar `validatingCompetition` do `useAthleteStatus()` (ja chamado na linha 505)
   - Linha: `Ultima prova: {tempo} | Top {rank}% | Evolucao: ---`
   - Se sem prova: "Sem prova oficial registrada" em cor `text-muted-foreground/50`

### Mudancas no mobile (MobileDecisionCard)

1. **Remover** bloco "Status competitivo" (linhas ~189-193)
2. **Adicionar** mesma linha de dados competitivos abaixo de `athleteCategory` (linha ~177)
3. Formato compacto para mobile: empilhar verticalmente se necessario

### Na Jornada (ambos layouts)

Nenhuma mudanca necessaria — a barra ja mostra `PRO -> ELITE` sem repetir "HYROX PRO". O bloco duplicado era o "Status competitivo" que sera removido.
