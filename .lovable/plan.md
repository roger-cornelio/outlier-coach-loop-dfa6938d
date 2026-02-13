

# Upgrade Visual da Jornada Outlier -- 6 Melhorias

## Resumo

Seis melhorias visuais e funcionais no bloco "Jornada Outlier" dentro de `src/components/DiagnosticRadarBlock.tsx`, usando exclusivamente dados que ja existem no frontend (hooks `useAthleteStatus` e `useJourneyProgress`, utils `outlierScoring.ts`). Nenhuma tabela nova, nenhum endpoint novo.

---

## 1. Outlier Score visivel no topo da Jornada

Adicionar um bloco destacado no inicio da Jornada mostrando o score existente (`outlierScore.score`, 0-100) escalado para 0-1000, com label descritivo (`getScoreDescription`) e cor dinamica (`getScoreColorClass`).

```text
+------------------------------------------+
| OUTLIER SCORE                            |
| 742 / 1000          "Forte"              |
| [barra fina animada]                     |
| Provisorio (sem prova oficial)  <- tag   |
+------------------------------------------+
```

**Fonte dos dados**: `outlierScore` ja vem de `useAthleteStatus()` (linha 92 do componente). Funcoes `getScoreDescription` e `getScoreColorClass` ja existem em `outlierScoring.ts`.

**Calculo**: `displayScore = Math.round(outlierScore.score * 10)` para escala 0-1000.

---

## 2. Sistema de estrelas (1-5) nos gargalos

Substituir os percentis numericos nos "requisitos faltantes" e no bloco de impacto por estrelas visuais (lucide `Star` icon).

**Mapeamento**:
- percentil >= 80: 5 estrelas (preenchidas, cor verde)
- percentil >= 60: 4 estrelas (cor azul)
- percentil >= 40: 3 estrelas (cor amarela)
- percentil >= 20: 2 estrelas (cor laranja)
- abaixo: 1 estrela (cor vermelha)

Funcao helper `percentileToStars(p: number): { count: number; color: string }` criada inline no componente.

Aplicado em:
- Lista "Para chegar em X faltam" (worstMetrics, linhas 410-414)
- Blocos de impacto na prova (linhas 736-752)

---

## 3. Barra de progresso mais espessa com simbolos de milestone

- Aumentar a barra principal de `h-2.5` para `h-4`
- Percentual ao lado em `text-2xl font-bold`
- Adicionar marcadores de milestone (icones pequenos) posicionados na barra nos pontos 25%, 50%, 75%
- Cada milestone usa um icone diferente: `Target` (25%), `TrendingUp` (50%), `Crown` (75%)
- Milestones ja atingidos ficam coloridos (primary), os futuros ficam em muted

---

## 4. Contadores animados nos Benchmarks e Treinos

Criar um hook inline `useAnimatedCounter(target, duration)` que anima de 0 ate o valor alvo usando `requestAnimationFrame`.

Aplicar nos contadores:
- `{targetLevel.benchmarksCompleted}/{targetLevel.benchmarksRequired}` 
- `{targetLevel.trainingSessions}/{targetLevel.trainingRequired}`

A animacao ocorre uma unica vez no mount (sem re-trigger em re-renders).

---

## 5. Ultimo Marco em formato medalha/conquista

Transformar o bloco atual (linhas 397-402) de um simples texto em um card visualmente destacado:

```text
+------------------------------------------+
|  [Trophy icon]   ULTIMO MARCO            |
|                                          |
|  INTERMEDIATE -> PRO                     |
|  87 dias   |   +12% melhoria             |
+------------------------------------------+
```

- Fundo com gradiente sutil (`bg-gradient-to-r from-amber-500/10 to-transparent`)
- Borda lateral dourada (`border-l-amber-500`)
- Icone `Trophy` do lucide em cor amber
- Transicao de nivel mostrando `currentLevelLabel`
- Como nao temos dados historicos de "dias" e "% melhoria" no hook atual, mostrar apenas o nivel atual com visual de conquista. Dados de dias e melhoria ficam como "---" ate implementacao futura.

---

## 6. Radar sempre aberto com opcao de ocultar

- Mudar `isRadarOpen` de `useState(false)` para `useState(true)` (linha 103)
- Manter o botao de toggle para o usuario ocultar manualmente
- Alterar texto do botao: "Ocultar" quando aberto (ja esta), "Ver perfil" quando fechado (ja esta)
- Nenhuma outra mudanca no radar

---

## Arquivos alterados

Apenas **1 arquivo**: `src/components/DiagnosticRadarBlock.tsx`

Nenhum hook novo, nenhuma tabela nova, nenhum endpoint novo.

## Detalhes tecnicos

### Imports adicionais
- `Star, Trophy` do `lucide-react`
- `getScoreDescription, getScoreColorClass` do `@/utils/outlierScoring`
- `useRef, useEffect` (para o animated counter)

### Funcoes helper (inline no componente)
1. `percentileToStars(p: number)` -- retorna `{ count: number; colorClass: string }`
2. `useAnimatedCounter(target: number, duration: number)` -- hook simples com requestAnimationFrame

### Ordem dos blocos na Jornada (apos mudancas)
1. Outlier Score (NOVO)
2. Barra principal de progresso (espessa, com milestones)
3. Mini barras Benchmarks/Treinos (com contadores animados)
4. Ultimo Marco (visual medalha)
5. Requisitos faltantes (com estrelas)

### Performance
- Contadores usam `useRef` + `useEffect` com cleanup, sem re-renders desnecessarios
- Animacoes de barra usam framer-motion (ja presente)
- Nenhuma query adicional ao backend

