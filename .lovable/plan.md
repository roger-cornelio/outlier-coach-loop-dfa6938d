

## Plano: Onboarding + Tour Guiado para Coach

### Contexto atual

- Coach é aprovado pelo admin → recebe link para definir senha (`/coach/definir-senha`) → vai direto para `/coach/dashboard`
- Não existe nenhum onboarding ou tour para coaches
- Já existe um sistema de tour para atletas (`OnboardingTour.tsx` + `useOnboardingTour.ts`) que pode ser reaproveitado como pattern

### O que será criado

**1. Onboarding de primeiro acesso do Coach (3 etapas)**

Tela fullscreen que aparece na primeira vez que o coach acessa o dashboard:

- **Etapa 1 — Boas-vindas**: "Bem-vindo à OUTLIER, Coach!" + breve explicação da plataforma e do modelo B2B2C
- **Etapa 2 — Como funciona**: Explicação visual dos 3 pilares: Importar treinos → Gerenciar atletas → Acompanhar evolução
- **Etapa 3 — Próximos passos**: Checklist do que fazer primeiro (definir nome, vincular atletas, importar primeira planilha)

Ao completar, salva flag no `localStorage` (`outlier_coach_onboarding_seen`) e carrega o dashboard normalmente.

**2. Tour guiado do Dashboard (5 steps)**

Imediatamente após o onboarding (ou re-ativável via botão "?"), um tour overlay similar ao dos atletas, mostrando:

1. **Aba Atletas** — "Aqui você gerencia sua base, aprova solicitações e acompanha feedbacks"
2. **Aba Importar** — "Cole sua planilha de treinos e o sistema parseia automaticamente"
3. **Aba Programações** — "Semanas salvas aparecem aqui, prontas para publicar"
4. **Vincular Atleta** — "Use este botão para convidar atletas por email"
5. **Pronto!** — "Seu painel está configurado. Bora treinar!"

### Fluxo completo

```text
Coach aprovado → Define senha → Login → /coach/dashboard
  → [Primeiro acesso] → Onboarding (3 telas) → Tour guiado (5 steps) → Dashboard
  → [Acessos seguintes] → Dashboard direto
```

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/hooks/useCoachOnboardingTour.ts` | Novo — hook com steps e estado do tour+onboarding |
| `src/components/CoachOnboarding.tsx` | Novo — telas de onboarding (3 etapas) |
| `src/components/CoachTour.tsx` | Novo — overlay do tour guiado (reutiliza pattern do `OnboardingTour.tsx`) |
| `src/pages/CoachDashboard.tsx` | Editar — integrar onboarding + tour no mount |

### Detalhes técnicos

- Persistência via `localStorage` (keys: `outlier_coach_onboarding_seen`, `outlier_coach_tour_seen`)
- Sem dependência de banco — não precisa de migration
- Animações com framer-motion (mesmo pattern do tour de atleta)
- Responsivo mobile-first (430px viewport atual)
- Botão "?" discreto no header do dashboard para re-iniciar o tour

