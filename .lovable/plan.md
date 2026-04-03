

## Plano: Tour Interativo com Visual OUTLIER (Atleta + Coach)

### Resumo

Redesenhar os tours de atleta e coach para: (1) usar ícones Lucide e paleta OUTLIER em vez de emojis, (2) simular a navegação real com mini bottom nav destacando a aba ativa, (3) mostrar previews esquemáticos do conteúdo de cada aba, (4) exibir apenas na primeira vez (já funciona via localStorage — manter comportamento atual).

### Regra de exibição

O tour já é exibido apenas uma vez por usuário (localStorage com `userId`). Isso não muda. O coach já tem botão de ajuda para reativar manualmente — manter.

### Mudanças — Atleta

**1. `src/hooks/useOnboardingTour.ts`**
- Reduzir de 7 para 5 steps, alinhados às 5 abas reais: Dashboard, Treino, Evolução, Provas, Config
- Trocar emojis por nomes de ícones Lucide (ex: `LayoutDashboard`, `Calendar`, `TrendingUp`, `Target`, `Settings`)
- Adicionar campo `tabId` mapeando para o id da aba na bottom nav
- Adicionar campo `previewItems` — lista de 2-3 labels do conteúdo daquela aba

**2. `src/components/OnboardingTour.tsx`** — Redesign completo:
- Ícones Lucide renderizados em círculo com `bg-primary/10 text-primary` (orange)
- **Mini bottom nav** dentro do card: replica os 5 tabs, aba atual highlighted em orange
- **Preview cards** esquemáticos no corpo: 2-3 mini cards com ícone + label representando features da aba (usando `bg-secondary`, `border-border`)
- Animação de slide horizontal entre steps
- Gradiente orange sutil no topo do card
- Manter progress bar, dots, botões Próximo/Voltar

### Mudanças — Coach

**3. `src/hooks/useCoachOnboardingTour.ts`**
- Aplicar o mesmo padrão nos `TOUR_STEPS` do coach: ícones Lucide, `tabId`, `previewItems`
- Onboarding slides (3 fullscreen) mantêm emojis pois são conceituais, não mapeiam abas

**4. `src/components/CoachTour.tsx`** — Mesmo redesign visual:
- Mini nav com abas do coach (Atletas, Importar, Programações, Vincular)
- Preview cards esquemáticos
- Ícones Lucide + paleta OUTLIER
- Reutilizar componentes/estilos do tour de atleta onde possível

**5. `src/components/CoachOnboarding.tsx`**
- Trocar emojis dos slides por ícones Lucide em círculo com estilo OUTLIER
- Manter bullets e estrutura, apenas atualizar visual

### Arquivos alterados

1. `src/hooks/useOnboardingTour.ts` — Steps reduzidos + campos Lucide
2. `src/components/OnboardingTour.tsx` — Redesign completo
3. `src/hooks/useCoachOnboardingTour.ts` — Tour steps com Lucide
4. `src/components/CoachTour.tsx` — Redesign visual
5. `src/components/CoachOnboarding.tsx` — Ícones Lucide nos slides

### Sem alteração no banco

