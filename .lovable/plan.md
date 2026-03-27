

## Plano: Prova Alvo dentro do painel "Nível Competitivo"

### O que muda

Mover a informação da **Prova Alvo** para dentro do quadro "Nível Competitivo", com layout mais resumido e incluindo dados de projeção de evolução.

### Novo layout do painel

```text
┌──────────────────────────────────────────────────────────────┐
│  🏆 NÍVEL COMPETITIVO                                        │
│                                                              │
│  🏅 BOPE GAMES BH · HYROX PRO · 194 dias                    │
│                                                              │
│  SEU TEMPO    META PRO     FALTAM      PREVISÃO              │
│  1h19m57s     1h13m36s     ↓ 6m21s     ~10 meses            │
│                                                              │
│  [████████████████████░░░░░░░]                               │
│  🎯 Evolução de 39s/mês → PRO em ~10 meses                  │
│  📊 Performance projetada na prova: 1h15m30s                 │
└──────────────────────────────────────────────────────────────┘
```

### Mudanças em `DiagnosticRadarBlock.tsx`

**1. Mover Prova Alvo para dentro do quadro (mobile + desktop)**
- Remover o bloco separado da Prova Alvo do `MobileHeroBlock` (~linhas 987-1028)
- Remover o bloco separado "Prova Alvo inline — desktop" (~linhas 2442-2484)
- Adicionar uma linha resumida logo após o header "NÍVEL COMPETITIVO":
  - Ícone Medal + Nome da prova + Categoria + Dias restantes
  - Sem fantasma, sem %, sem partner — manter limpo

**2. Adicionar "Previsão de Performance" usando projeção de evolução**
- Se houver `provaAlvo` com `daysUntil` e `performanceSnapshot.currentTime`:
  - Usar `calculateProvaAlvoTarget(currentTime, daysUntil)` (já existe em `evolutionTimeframe.ts`)
  - Mostrar o tempo projetado para o dia da prova como uma linha extra após a frase de ação
  - Formato: `📊 Performance projetada: 1h15m30s`
- Se não houver prova alvo, o painel continua mostrando apenas as 4 colunas normalmente

**3. Renomear "Preparação" (coluna Previsão)**
- Manter como "Previsão" — é o tempo estimado para atingir o próximo nível competitivo

### O que não muda
- Lógica do `performanceSnapshot` (cálculos de gap, previsão)
- Lógica de `calculateEvolutionTimeframe` e `calculateProvaAlvoTarget`
- Tabelas no banco de dados
- Jornada Outlier (bloco separado, continua independente)

