

## Plano: Polish Mobile nos Fluxos Críticos (430px)

### Problema Identificado

Após análise visual e de código, os seguintes problemas existem na viewport de 430px:

---

### 1. Landing Page — Header crowded

O header fixo (`Landing.tsx` linha 87) usa `px-6 py-5` e coloca dois links ("Já Sou Outlier" e "Sou Coach") lado a lado com `gap-4`. Em 430px, isso fica apertado e o separador vertical (`span.h-5.border-r`) ocupa espaço desnecessário.

**Correção:**
- Reduzir padding do header para `px-4 py-3` no mobile
- Diminuir font dos links para `text-xs` no mobile
- Esconder separador vertical em mobile (`hidden sm:inline`)
- Reduzir gap para `gap-2` no mobile

### 2. Landing Page — CTA buttons overflow

O botão "RECEBER DIAGNÓSTICO" (linha 140) usa `px-12 py-5 text-lg` — funciona mas é largo demais. O CTA final "COMECE AGORA" usa `px-16 py-6 text-xl` — pode sair da tela em 430px.

**Correção:**
- CTA hero: `px-8 py-4 text-base sm:px-12 sm:py-5 sm:text-lg`
- CTA final: `px-10 py-5 text-lg sm:px-16 sm:py-6 sm:text-xl`

### 3. Landing Page — Coach section button + badge wrap

Na seção "Para Coaches" (linha 322-331), o botão e o badge de "aprovação sujeita" ficam em `flex-col sm:flex-row`, mas o botão usa `text-base px-8` — apertado em 430px.

**Correção:**
- Botão: `text-sm px-6 py-3 sm:text-base sm:px-8 sm:py-4`

### 4. Dashboard — Main content padding

`Dashboard.tsx` usa `px-6 py-6` no `<main>` (linha 341). Em 430px, 24px de padding cada lado consome 48px, deixando apenas 382px de conteúdo.

**Correção:**
- `px-4 sm:px-6 py-4 sm:py-6`

### 5. WeeklyTrainingView — Header e content padding

Header usa `px-6 py-4` (linha 274) e content usa `px-6 py-8` (linha 301). Bloco de exercício usa `p-6` (linha 491). Tudo consome padding excessivo em mobile.

**Correção:**
- Header: `px-4 sm:px-6 py-3 sm:py-4`
- Content main: `px-4 sm:px-6 py-6 sm:py-8`
- Block cards: `p-4 sm:p-6`
- Day tabs: ajustar `min-w-[52px]` para `min-w-[44px]` e `text-lg` para `text-base sm:text-lg`
- Day name header (`text-3xl` linha 375): `text-2xl sm:text-3xl`
- Block title (`text-2xl` linha 499): `text-xl sm:text-2xl`

### 6. WeeklyTrainingView — "Iniciar Treino" button

O botão (linha 616-624) usa `text-xl px-8 py-5` — ocupa muito espaço vertical em mobile.

**Correção:**
- `text-lg px-6 py-4 sm:text-xl sm:px-8 sm:py-5`

### 7. CoachOverviewTab — Expanded grid 4-col em mobile

O grid expandido (linha 507) usa `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. Já é responsivo, mas o padding interno `px-3 sm:px-4` e o tamanho do conteúdo pode ser otimizado.

**Correção:**
- O grid já funciona razoavelmente, mas os 4 blocos em coluna no mobile geram scroll excessivo. Agrupar Stats + Perfil em um `grid-cols-2` interno quando em mobile:
  ```
  grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4
  ```
  Com Stats e Perfil ficando lado a lado no mobile, e Feedbacks + Ações abaixo.

### 8. MobileNav — Menu hamburger overlap com conteúdo

O botão fixo (linha 126) usa `top-4 left-4` e pode sobrepor conteúdo. Está funcionando, mas precisa de `safe-area-inset` para notch de iPhones.

**Correção:**
- Adicionar `pt-[env(safe-area-inset-top)]` ao botão
- Ou: wrapper com `top-[max(1rem,env(safe-area-inset-top))]`

### 9. Auth Page — Hero branding too large on mobile

Logo "OUTLIER" em `size="hero"` (linha 724) e tagline com `tracking-[0.25em]` e `mb-12` (linha 715) deixam muito espaço antes do form de login.

**Correção:**
- Reduzir `mb-12` para `mb-8 sm:mb-12`
- Ajustar OutlierWordmark com um size prop menor no mobile via CSS (ou usar `size="xl"` condicionalmente)

### 10. Simulator Screen — Splits table text-xs pode ficar cortado

Em `SimulatorScreen.tsx`, a tabela de splits (que vem do `TargetSplitsTable`) precisa de scroll horizontal em 430px.

**Correção:**
- Wrap com `overflow-x-auto` se não existir

---

### Arquivos alterados

1. **`src/pages/Landing.tsx`** — Header padding, CTA sizes, coach button
2. **`src/components/Dashboard.tsx`** — Main padding
3. **`src/components/WeeklyTrainingView.tsx`** — Header, content, block cards, tabs, CTA
4. **`src/components/CoachOverviewTab.tsx`** — Expanded grid layout mobile
5. **`src/components/MobileNav.tsx`** — Safe area inset
6. **`src/pages/Auth.tsx`** — Hero spacing reduction

### Sem alteração no banco

Todas as mudanças são CSS/Tailwind — zero impacto em dados ou lógica.

