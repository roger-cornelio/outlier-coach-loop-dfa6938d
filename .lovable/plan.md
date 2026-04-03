

## Plano: Superadmin testa onboarding sem criar conta nova

### Problema
Hoje, o superadmin (roger.bm2016@gmail.com) já completou o setup, então sempre vai direto pro dashboard. Não tem como ver as telas que um atleta novo vê (escolha de coach, configuração, boas-vindas).

### Solução
Quando o superadmin acessar `/app?force-onboarding=1`, o sistema ignora que o setup já foi feito e mostra o onboarding completo desde o início — como se fosse um atleta novo.

Qualquer outro usuário que tente usar esse parâmetro será ignorado. Só funciona para superadmin.

### Como usar
- Acessar `outlierdev.lovable.app/app?force-onboarding=1` → vê todo o fluxo de onboarding
- Acessar `outlierdev.lovable.app/app` normalmente → vai pro dashboard como sempre

### Arquivo alterado
1. **`src/pages/Index.tsx`** — Adicionar verificação do parâmetro de URL antes da lógica de navegação

