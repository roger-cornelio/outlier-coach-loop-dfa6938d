

## Plano: Aumentar Área do Hero da Landing Page

A seção hero atual usa `min-h-[90vh]`. Vou aumentar para `min-h-screen` (100vh) e ampliar o espaçamento interno para dar mais respiro visual ao conteúdo central.

### Alterações em `src/pages/Landing.tsx` (linha 36)

1. **Altura mínima**: `min-h-[90vh]` → `min-h-screen` (ocupa a tela inteira)
2. **Padding vertical**: `py-20 pt-28` → `py-32 pt-36` (mais espaço acima e abaixo)
3. **Espaço entre descrição e CTA**: `mt-12` → `mt-16` (mais respiro antes do botão)

