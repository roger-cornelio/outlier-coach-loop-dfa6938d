

## Plano: Corrigir auto-detecção de categoria que não funciona

### Causa raiz

Dois bugs impedem a detecção:

1. **`createNewBlock` cria blocos com `type: ''`** (linha 2341), mas a auto-detecção em `saveCurrentBlock` verifica `if (currentBlock.type === 'conditioning')`. Como `'' !== 'conditioning'`, a inferência por conteúdo nunca executa.

2. **`detectBlockType(title)` existe mas nunca é chamada**. A função que detecta categoria pelo título (usando `TYPE_PATTERNS` com "Warm Up", "Strength", etc.) foi definida mas nenhum código a invoca.

### Correção (2 pontos)

**1. `createNewBlock` deve detectar pelo título ao criar o bloco**

Quando `rawTitle` não está vazio, chamar `detectBlockType(rawTitle)`. Se retornar algo diferente de `'conditioning'`, usar como tipo. Se não, manter `''` para que o fallback por conteúdo funcione depois.

```
const detectedType = rawTitle ? detectBlockType(rawTitle) : 'conditioning';
type: detectedType !== 'conditioning' ? detectedType : '' as any
```

**2. `saveCurrentBlock` deve checar `'' OU 'conditioning'`**

Mudar a condição de `currentBlock.type === 'conditioning'` para `!currentBlock.type || currentBlock.type === 'conditioning'`, garantindo que blocos com `type: ''` também passem pela inferência por conteúdo.

### Arquivos alterados

1. **`src/utils/structuredTextParser.ts`** — Duas edições:
   - Na função `createNewBlock`: chamar `detectBlockType(rawTitle)` para preencher tipo pelo título
   - Na função `saveCurrentBlock` (linha ~2478): expandir condição para incluir `type === ''`

### Resultado esperado

- Bloco com título "Warm Up" → automaticamente `aquecimento`
- Bloco com título "Strength" → automaticamente `forca`
- Bloco com título "30' AMRAP" → automaticamente `metcon`
- Bloco sem título com conteúdo de corrida → automaticamente `corrida`
- Coach pode alterar manualmente qualquer categoria

