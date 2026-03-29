

## Plano: Botão condicional — "Acessar minha conta" para usuários logados

### Problema
No diagnóstico gratuito, o CTA sempre mostra "COMEÇAR MEUS 30 DIAS GRÁTIS" mesmo se o usuário já está cadastrado/logado. Para usuários autenticados, deveria mostrar "ACESSAR MINHA CONTA" e ir direto para `/app`.

### Alterações em `src/pages/DiagnosticoGratuito.tsx`

**1. Importar `useAuth`** e detectar sessão ativa:
```typescript
import { useAuth } from '@/hooks/useAuth';
const { user } = useAuth();
```

**2. Botão CTA condicional** (linha ~1051-1058):
- Se `user` existe → texto "ACESSAR MINHA CONTA", `navigate('/app')`
- Se não → texto atual "COMEÇAR MEUS 30 DIAS GRÁTIS", `setStep('coach-selection')`

**3. Subtexto condicional** (linha ~1060-1062):
- Se logado → esconder "Cancele quando quiser"

### Resultado
Usuários logados veem "ACESSAR MINHA CONTA" e vão direto para `/app`. Novos usuários continuam no fluxo de onboarding.

