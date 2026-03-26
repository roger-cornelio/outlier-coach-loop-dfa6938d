

## Plano: Tornar o botão "Zerar Sessões" acessível na rota /app

### Problema
O `GlobalDebugBar` é desativado completamente na rota `/app` (linha 35-38), então o botão "Zerar Sessões" não aparece quando você está no dashboard do atleta — que é exatamente onde precisa testar.

### Mudança

**`src/components/GlobalDebugBar.tsx`**:
- Remover a restrição que esconde o debug bar na rota `/app`
- Ou: manter o debug bar oculto em `/app` mas mostrar um **mini botão flutuante** (apenas o ícone 🗑) no canto inferior direito, visível somente para Owner/QA mode
- O mini botão executa a mesma lógica de reset (limpa localStorage + reload)

### Abordagem recomendada
Remover o bloqueio da rota `/app` para o debug bar inteiro — ele já é protegido por `isAllowed` (Owner/QA only), então não há risco de usuários finais verem.

### Mudança concreta
- Linha 35-38: remover o check `isAthleteRoute` da condição de retorno `null`
- De: `if (!auth || !isAllowed || isAthleteRoute) return null;`
- Para: `if (!auth || !isAllowed) return null;`

