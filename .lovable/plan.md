

## Plano: Aumentar Header da Landing Page

O header está com `py-3` e textos muito pequenos (`text-lg`, `text-xs`). Vou aumentar o padding, o tamanho da wordmark e dos links para dar mais presença visual.

### Alterações em `src/pages/Landing.tsx`

1. **Header padding**: `py-3` → `py-5 md:py-6`
2. **Wordmark**: `!text-lg md:!text-xl` → `!text-2xl md:!text-3xl` (mais impacto)
3. **Links "Sou Coach" / "Sou Atleta"**: `text-xs md:text-sm` → `text-sm md:text-base`
4. **Ícones dos links**: `w-3.5 h-3.5` → `w-4 h-4`
5. **Separador**: `h-4` → `h-5`
6. **Gap entre links**: `gap-3 md:gap-4` → `gap-4 md:gap-6`
7. **Container**: `max-w-6xl` → `max-w-7xl` para ocupar mais largura

