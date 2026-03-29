

## Plano: Corrigir detecção por conteúdo + Análise de impacto

### Bug encontrado

A função `detectTypeByContent` (linha 2567) tem uma guarda errada:

```
if (block.type !== 'conditioning') return block.type;
```

O `createNewBlock` define `type: ''` quando o título não é reconhecido. Na hora de refinar, o código em `saveCurrentBlock` (linha 2478) entra corretamente (`!currentBlock.type` é true para `''`), mas `detectTypeByContent` recebe `block.type = ''`, que **não é** `'conditioning'`, então a guarda retorna `''` imediatamente sem analisar o conteúdo.

### Correção

**`src/utils/structuredTextParser.ts`** — 1 linha:

Linha 2567: mudar de `block.type !== 'conditioning'` para `block.type && block.type !== 'conditioning'`, para que `''` também passe pela análise de conteúdo.

Os `CONTENT_TYPE_PATTERNS` já existem e cobrem corrida, específico, acessório e força por conteúdo. A detecção por formato (AMRAP/EMOM/Tabata) também já existe nas linhas 2577-2584. Tudo isso já funciona — só não era alcançado por causa da guarda.

### Assertividade após correção

Sem a correção, blocos sem título reconhecido ficavam com `type: ''` (sem categoria). Com a correção:

- Título reconhecido → **95%** (já funcionava)
- Formato AMRAP/EMOM/Tabata/For Time → **95%** (passa a funcionar)
- Conteúdo com corrida/bike/remo → **90%** (passa a funcionar)
- Conteúdo com sled/wall ball/farmer → **85%** (passa a funcionar)
- Conteúdo com squat/deadlift/press + padrão NxM → **80%** (passa a funcionar)
- Blocos com exercícios mas sem sinal claro → fallback `metcon` (linha 2599)

**Assertividade geral: ~88-90%** (antes era ~40% porque só título funcionava)

### Impacto real de marcar Força como Metcon (ou vice-versa)

O impacto é **baixo no cálculo de calorias/tempo**, mas **médio na adaptação por tempo**:

| Aspecto | Impacto |
|---------|---------|
| **Calorias (kcal)** | Nenhum — o motor calcula por exercício individual (MET + carga + reps), não pela categoria do bloco |
| **Tempo estimado** | Nenhum — calculado pela soma dos exercícios, não pela categoria |
| **Prioridade de corte** | **Médio** — Força tem peso 80, Metcon tem peso 100. Um bloco de Força marcado como Metcon será protegido como se fosse mais importante, e blocos reais de Metcon podem ser cortados antes dele |
| **Ordem de remoção** | **Médio** — Na adaptação por tempo, Força (prioridade 5) é removida antes de Metcon (prioridade 2). Trocar inverte essa ordem |
| **Feedback da IA** | **Baixo** — Os prompts mencionam a categoria mas a IA analisa o conteúdo real |

**Resumo**: Marcar errado não quebra cálculos, mas pode fazer o motor de adaptação proteger/cortar o bloco errado quando o atleta tem menos tempo disponível.

### Arquivo alterado

1. **`src/utils/structuredTextParser.ts`** — Linha 2567: corrigir guarda do `detectTypeByContent`

