

## Plano: Feedback Local Sempre Específico (Nunca Genérico)

### Problema
O feedback cai em mensagens genéricas em dois cenários:
1. **Sem dados de tempo**: quando o atleta completa mas não registra tempo, o bucket sempre retorna `OK` → mensagem vaga
2. **Granularidade perdida**: 5 buckets (ELITE/STRONG/OK/TOUGH/DNF) são mapeados em apenas 3 categorias de texto (great/goodButMore/bad), fazendo ELITE e STRONG darem a mesma mensagem

### Solução

**1. Expandir as categorias de feedback no `coachCopy.ts`**
- Adicionar 2 novas categorias à interface `feedback`: `elite` e `tough` (total: 6 categorias: `elite`, `great`, `goodButMore`, `tough`, `bad`, `missed`)
- Escrever frases específicas para cada coach (IRON/PULSE/SPARK) em cada nova categoria
  - `elite`: frases de reconhecimento máximo ("performance acima do topo", etc.)
  - `tough`: frases de encorajamento para dia difícil mas com presença ("dia duro, mas você estava lá")

**2. Refinar o mapeamento `getBucketFeedbackCategory`**
- ELITE → `elite` (não mais agrupado com STRONG)
- STRONG → `great`
- OK → `goodButMore`
- TOUGH → `tough` (não mais agrupado com DNF)
- DNF → `bad`

**3. Tratar cenário sem tempo registrado no `classifyPerformanceLocal`**
- Se completou mas não registrou tempo → bucket `STRONG` (presunção positiva: completou o treino)
- Se não completou → `DNF`
- Isso elimina o fallback para `OK` genérico quando falta dado de tempo

### Arquivos Modificados
- `src/config/coachCopy.ts` — nova interface + frases por coach × categoria
- `src/components/PerformanceFeedback.tsx` — ajuste no `classifyPerformanceLocal`

### Resultado
O atleta **sempre** recebe uma mensagem específica ao seu bucket e ao estilo do coach, nunca mais a frase genérica "Treino registrado. Continue evoluindo."

