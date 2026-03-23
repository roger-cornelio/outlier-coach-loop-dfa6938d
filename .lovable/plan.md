

## Plano: Corrigir detecção de dia — `DIA:` prefix e case-insensitive

### Causa raiz

Na linha 2762-2763 do parser:
```ts
const detectedDay = detectDay(line);
if (detectedDay && isUpperCaseLine(line)) {
```

`isUpperCaseLine("DIA: Segunda")` retorna `false` porque "Segunda" tem mixed case. O parser **exige** que a linha inteira esteja em MAIÚSCULAS para reconhecer como marcador de dia, mas o coach escreve "DIA: Segunda", "DIA: terça", etc.

Resultado: todos os dias caem no mesmo bloco, gerando um treino único com tudo misturado.

### Correção

| Arquivo | O que muda |
|---|---|
| `src/utils/structuredTextParser.ts` | Na detecção de dia (linha 2762), adicionar check explícito para prefixo `DIA:` — se a linha começa com `DIA:` (case-insensitive), tratar SEMPRE como marcador de dia, **sem exigir** `isUpperCaseLine`. Manter o check de uppercase como fallback para linhas sem prefixo (ex: "SEGUNDA" sozinha). |

### Detalhes

Trocar:
```ts
const detectedDay = detectDay(line);
if (detectedDay && isUpperCaseLine(line)) {
```

Por:
```ts
const hasDiaPrefix = /^DIA:\s*/i.test(line);
const detectedDay = detectDay(line);
if (detectedDay && (hasDiaPrefix || isUpperCaseLine(line))) {
```

Isso resolve todos os formatos que o coach usa:
- `DIA: Segunda` ✓ (prefixo DIA:)
- `DIA: terça` ✓ (prefixo DIA:)
- `SEGUNDA` ✓ (uppercase, já funcionava)
- `DIA: QUARTA` ✓ (ambos)

Uma linha, zero risco de side effects.

