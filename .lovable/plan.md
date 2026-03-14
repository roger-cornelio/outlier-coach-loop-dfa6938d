

## Diagnóstico: Por que "Validar texto" trava o sistema

### Causa Raiz Identificada

O problema **não é o botão em si**, mas sim o que roda **durante o render** do componente `TextModelImporter.tsx`.

Nas **linhas 831-832 e 858**, a função `previewAutoFormatChanges(rawText)` é chamada **inline dentro do JSX**, ou seja, roda a cada re-render:

```text
Linha 831:  {rawText.trim() && (() => {
Linha 832:    const preview = previewAutoFormatChanges(rawText);  ← RODA A CADA RENDER
...
Linha 858:  {rawText.trim() && previewAutoFormatChanges(rawText).hasChanges && (  ← RODA DE NOVO
```

Essa função (`dslAutoFormat.ts`) chama `isInsideStructuredBlock()` para **cada linha do texto**, e essa por sua vez faz um **loop reverso** buscando o último `BLOCO:`. Complexidade: **O(n²)** onde n = número de linhas.

Com um treino de semana inteira (100-300 linhas), isso gera **milhares de iterações a cada keystroke ou re-render**, travando a thread principal do browser.

Além disso, `previewAutoFormatChanges` é chamada **duas vezes** no mesmo render (linhas 832 e 858), duplicando o custo.

### O que causa o travamento no "Validar texto"

1. Coach digita/cola texto → `setRawText()` dispara re-render
2. Re-render executa `previewAutoFormatChanges(rawText)` **2x** inline (O(n²) cada)
3. Ao clicar "Validar texto", `setIsParsing(true)` dispara mais um re-render
4. O parser de 3570 linhas (`parseStructuredText`) roda em macrotask com timeout de 3s
5. Enquanto o parser roda, a UI já está lenta pelo custo acumulado do autoformat inline

### Plano de Correção (3 itens)

**1. Memoizar `previewAutoFormatChanges` com `useMemo`**
- Extrair a chamada para um `useMemo` que depende apenas de `rawText`
- Elimina as 2 chamadas inline redundantes no JSX
- Resultado é recalculado apenas quando `rawText` muda (não a cada re-render)

**2. Otimizar `isInsideStructuredBlock` de O(n²) para O(n)**
- Pré-computar um array de flags `insideStructuredBlock[]` em uma única passada forward pelo texto
- `previewAutoFormatChanges` usa esse array em vez de chamar a função reversa para cada linha

**3. Debounce no `previewAutoFormatChanges` para textos longos**
- Para textos com >100 linhas, usar debounce de 300ms no cálculo
- Evita recálculo a cada keystroke durante digitação rápida

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/TextModelImporter.tsx` | Extrair `previewAutoFormatChanges` para `useMemo`, eliminar chamadas inline duplicadas |
| `src/utils/dslAutoFormat.ts` | Otimizar `isInsideStructuredBlock` para single-pass O(n), pré-computar flags |

### Risco

Baixo. Mudanças são puramente de performance — comportamento funcional permanece idêntico.

