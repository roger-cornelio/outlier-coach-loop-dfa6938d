

## Plano: Corrigir Tamanho do Header da Landing

**Problema**: O `OutlierWordmark` com `size="sm"` já usa `text-2xl md:text-3xl` por padrão. A classe extra `!text-2xl md:!text-3xl` é redundante — não altera nada.

### Alteração em `src/pages/Landing.tsx` (linha 20)

Trocar de `size="sm"` para `size="md"` para usar `text-4xl md:text-5xl`, que é significativamente maior:

```tsx
// De:
<OutlierWordmark size="sm" className="!text-2xl md:!text-3xl" />

// Para:
<OutlierWordmark size="md" />
```

Isso dobra o tamanho visual da wordmark no header, de `text-2xl` para `text-4xl`.

