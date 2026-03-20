

## Plano: Separar Exercícios Novos vs Linhas Não Interpretadas no Modal

### Problema Atual
O modal "Detalhes da interpretação" mistura tudo numa lista só: exercícios desconhecidos (ex: "Squat to Stand", "Pike Lunges") junto com linhas estruturais que a IA não entendeu (ex: "40,30,20,10", "30/30" Side Plank"). O coach não sabe o que é exercício novo vs. texto mal formatado.

### Solução
Dividir o modal em **duas seções visuais distintas**:

**Seção 1 — 🟡 Exercícios Novos (amarelo suave)**
- Linhas que **parecem exercícios** (contêm palavras, sem números puros)
- Fuzzy match contra `global_exercises` confirma que NÃO existe no dicionário
- Mostra botão **"Sugerir"** para enviar ao admin
- Tom: informativo — "Estes exercícios ainda não estão no nosso dicionário"

**Seção 2 — 🔴 Linhas Não Interpretadas (vermelho/laranja forte)**
- Linhas que são **números puros** ("40,30,20,10"), **notação ambígua** ("30/30""), ou **prefixos sem contexto** ("A-", "B-")
- Sem botão de sugerir (não são exercícios)
- Tom: **recomendação forte** — "⚠️ Recomendamos corrigir estas linhas antes de publicar. O atleta não verá estimativas de tempo/calorias."

### Mudanças Técnicas

**1. `src/utils/parsingCoverage.ts`**
- Adicionar campo `category: 'new_exercise' | 'uninterpretable'` ao `UnmatchedLine`
- Criar função `classifyUnmatchedLine(text)` que usa heurísticas:
  - Linha é só números/vírgulas/hífens → `uninterpretable`
  - Linha tem aspas de tempo (30") sem nome claro → `uninterpretable`
  - Linha começa com "A-", "B-" sem exercício reconhecível → `uninterpretable`
  - Linha tem pelo menos 2+ letras formando nome → `new_exercise`

**2. `src/components/TextModelImporter.tsx` (modal, linhas ~1112-1161)**
- Separar `coverageReport.unmatchedLines` em dois arrays filtrados por `category`
- Renderizar seção "Exercícios novos" (amarelo) com botão Sugerir
- Renderizar seção "Linhas não interpretadas" (vermelho/laranja) com alerta forte e sem botão Sugerir
- Badge no header: mostrar contagem separada se houver linhas não interpretadas

### Arquivos Modificados
- `src/utils/parsingCoverage.ts` — classificação das linhas
- `src/components/TextModelImporter.tsx` — UI do modal dividida em 2 seções

