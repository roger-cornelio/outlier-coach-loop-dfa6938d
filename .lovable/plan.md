

# Reorganizar Dashboard Mobile OUTLIER

## Estrutura atual (mobile)

Hoje o mobile mostra um unico `MobileDecisionCard` grande com tudo misturado (nome, score, barra, gargalos, CTA), seguido de 2 collapsibles (Perfil fisiologico, Dados avancados).

## Nova estrutura proposta (5 blocos)

### BLOCO 1 -- CAMINHO PARA ELITE (card principal, 60-70% da tela)

Card com fundo destaque (laranja escuro / `bg-gradient-to-r from-orange-950 to-amber-950`).

Conteudo:
- Header compacto: nome do atleta + `PRO -- XP para ELITE` (sem repetir nivel em outros cards)
- Barra de progresso GROSSA (`h-6`) com `PRO -> ELITE XX%`
- Lista "Faltam:" com gargalos de performance (top 2 piores metricas com estrelas)
- Treino de hoje: label do workout
- Botao "BORA TREINAR" 100% largura, grande

Dados: `journeyData`, `worstMetrics`, `todayWorkoutLabel`, `onStartWorkout`

### BLOCO 2 -- STATUS DO ATLETA (card menor)

Card simples, sem barra. 3 linhas:
- `Top X% da categoria`
- `Ultima prova: 1h19m57`
- `Evolucao: ---`

Dados: `outlierScore.score`, `validatingCompetition`, placeholder evolucao

### BLOCO 3 -- GARGALOS (lista simples)

Lista com todos os gargalos (metricas abaixo de 50%), cada um com estrelas. Sem repetir nivel. Titulo: "Gargalos de performance".

Dados: `scores` filtrados por `percentile_value < 50`

### BLOCO 4 -- PROXIMO PASSO

Substituir volume ("250 sessoes restantes") por:
- `Proximo benchmark sugerido: {next_benchmark}`
- Se tiver prova oficial pendente: mostrar isso

Volume total (benchmarks X/Y, treinos X/Y) vai para modo avancado.

Dados: `targetLevel` do `journeyData`

### BLOCO 5 -- PERFIL FISIOLOGICO (colapsado)

Botao que abre modal com radar + VO2 + lactato. Ja existe como `MobilePhysiologicalModal` -- manter como esta.

## O que sera REMOVIDO do primeiro scroll mobile

- Outlier Score com barra longa (movido para Bloco 2 como "Top X%")
- "HYROX PRO" repetido em multiplos lugares
- Volume total de treinos e benchmarks (vai para modo avancado)
- Benchmarks totais como mini-barras (vai para modo avancado)
- Radar aberto (fica colapsado no Bloco 5)
- Score relativo grande "78/100 para ELITE" (substituido pela barra no Bloco 1)

## Header do Bloco 1

```text
LAIS MORAIS
PRO -- 22 XP para ELITE
```

Sem Crown icon, sem "HYROX PRO WOMEN" -- nivel aparece apenas na barra.

## Mudancas tecnicas

### Arquivo: `src/components/DiagnosticRadarBlock.tsx`

**1. Reescrever `MobileDecisionCard` (linhas 128-289)**

Transformar no Bloco 1 com:
- Fundo laranja escuro: `bg-gradient-to-r from-orange-950/90 to-amber-950/80 border-orange-800/30`
- Header: nome + `{currentLevelLabel} -- {XP} para {targetLevelLabel}`
- Barra grossa `h-6` com labels inline
- Gargalos: top 2 `worstMetrics` com estrelas
- Treino de hoje com `Flame` icon
- CTA botao grande

**2. Criar novos componentes inline para Blocos 2-4**

- `MobileStatusBlock`: card com Top X%, ultima prova, evolucao
- `MobileBottlenecksBlock`: lista completa de gargalos com estrelas
- `MobileNextStepBlock`: proximo benchmark sugerido (derivado do gargalo mais fraco)

**3. Alterar o render mobile (linhas 634-669)**

Layout mobile simplificado passa a ser:
```
Bloco 1: MobileDecisionCard (reescrito)
Bloco 2: MobileStatusBlock (novo)
Bloco 3: MobileBottlenecksBlock (novo)
Bloco 4: MobileNextStepBlock (novo)
Bloco 5: MobilePhysiologicalModal (existente)
```

Modo avancado: quando ativado, mostra `MobileAdvancedDataSection` com mini-barras de volume e limitador detalhado (existente, sem mudanca).

**4. Remover do MobileDecisionCard**

- Score relativo "78/100 para ELITE"
- Dados competitivos inline (movidos para Bloco 2)
- Toggle avancado (mover para apos Bloco 5)

### Desktop: sem mudancas

O layout desktop (linhas 675-1128) permanece inalterado. Apenas o branch `isMobile && !advancedMode` muda.

