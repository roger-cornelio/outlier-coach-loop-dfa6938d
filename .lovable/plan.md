

# Separar Score (Status) de Progresso (Missao)

## Problema

O bloco "Jornada Outlier" no desktop mistura duas coisas: o Outlier Score (metrica de status/ranking) e a barra de progressao (missao para o proximo nivel). Sao dados distintos apresentados juntos.

## Solucao

Dividir em 2 blocos visuais separados dentro do mesmo card.

---

## Bloco 1: OUTLIER SCORE (metrica de status)

Formato compacto, sem barra longa de 0-1000. Foco em ranking relativo.

```text
OUTLIER SCORE
Top 18% da categoria
+12% desde ultima prova (ou "---" se nao disponivel)
```

### Mudancas tecnicas

No desktop (`DiagnosticRadarBlock.tsx`, linhas ~734-758):
- Remover o bloco grande com `AnimatedCounter target={displayScore}`, a barra de progresso do score, e o texto "/ 1000"
- Substituir por layout compacto:
  - Titulo: "OUTLIER SCORE"
  - Linha principal: "Top {rank}% da categoria" (usando `Math.max(1, Math.round(100 - outlierScore.score))`)
  - Linha secundaria: "Evolucao: ---" (placeholder, dado nao disponivel hoje)
  - Badge "Provisorio" mantido se `outlierScore.isProvisional`
- Manter o label descritivo (Elite, Forte, etc.) como badge lateral

No mobile (`MobileDecisionCard`, linhas ~203-207):
- O score relativo "X/100 para ELITE" ja existe e esta bom
- Adicionar abaixo: "Top {rank}% da categoria" em texto pequeno

---

## Bloco 2: PROGRESSAO (missao)

Formato com barra + checklist de requisitos. Ja existe mas sera isolado visualmente.

```text
PRO -> ELITE   ██████░░ 78%

Faltam:
- Sled Pull ★★☆☆☆
- Lunges ★☆☆☆☆
- 3 benchmarks
- 5 treinos
```

### Mudancas tecnicas

No desktop (linhas ~760-870):
- Manter a barra de progresso com milestones como esta
- Manter mini barras de Benchmarks e Treinos
- Manter gargalos de performance
- Separar visualmente do Outlier Score com divisor ou card proprio
- Remover referencia ao Outlier Score deste bloco (evitar mistura)

No mobile:
- Ja esta separado no Card de Decisao (barra + gargalos). Sem mudanca.

---

## Resumo de mudancas

### Arquivo: `src/components/DiagnosticRadarBlock.tsx`

**Desktop - Bloco Outlier Score (linhas ~734-758):**
1. Remover `AnimatedCounter` com valor absoluto (742/1000)
2. Remover barra de progresso do score
3. Remover texto "/ 1000"
4. Novo layout compacto: "Top X% da categoria" + badge de nivel + evolucao placeholder

**Desktop - Bloco Progressao (linhas ~760-870):**
5. Separar visualmente como secao propria dentro do card
6. Adicionar header "Progressao" ou "Missao" para diferenciar do Score
7. Nenhuma mudanca funcional nos dados

**Mobile - MobileDecisionCard (linhas ~190-207):**
8. Adicionar "Top X% da categoria" abaixo do score relativo
9. Manter o resto como esta

---

## Dados utilizados (sem backend)

- `outlierScore.score` -- para calcular ranking (Top X%)
- `outlierScore.isProvisional` -- badge provisorio
- `getScoreDescription()` / `getScoreColorClass()` -- label descritivo
- `journeyData.*` -- progressao, benchmarks, treinos (ja usado)
- Evolucao: placeholder "---" (dado nao disponivel)
