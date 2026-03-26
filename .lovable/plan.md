
Objetivo: destravar a Debug Bar no dashboard do atleta (`/app`) para que `Ctrl+Shift+D` funcione como esperado.

### Causa raiz
O bloqueio está no próprio `src/components/DebugKeyboardToggle.tsx`:
- `isAthleteRoute` fica `true` em `/app`
- o `useEffect` retorna cedo e **não registra** o listener de teclado nessa rota
- além disso, o componente retorna `null` em `/app`, então o fluxo de QA também fica desligado ali

Enquanto isso, o `GlobalDebugBar` já está preparado para aparecer em qualquer rota, desde que `isAllowed` vire `true`. Ou seja: o problema não é a barra em si, é o atalho estar desativado em `/app`.

### Plano de correção

#### 1) Reativar os atalhos em `/app`
Arquivo: `src/components/DebugKeyboardToggle.tsx`

Ajustes:
- remover a lógica que desliga o componente em rotas `/app`
- parar de condicionar `useQADebugMode` com `isAthleteRoute ? null : profile?.email`
- registrar `window.addEventListener('keydown', ...)` também no dashboard do atleta

Resultado esperado:
- `Ctrl+Shift+D` volta a alternar `localStorage.DEBUG_BAR`
- `Ctrl+Shift+Q` volta a permitir o fluxo de QA nessa rota também

#### 2) Manter a proteção de segurança
Mesmo com o atalho habilitado em `/app`, a segurança continua:
- `Ctrl+Shift+D` só ativa para `profile.email === 'roger.bm2016@gmail.com'`
- `GlobalDebugBar` só renderiza quando `useDebugAllowed()` retorna `isAllowed = true`
- usuários comuns continuam sem acesso

Ou seja: vamos remover o bloqueio por rota, não o bloqueio por permissão.

#### 3) Garantir consistência entre toggle e renderização
Arquivos envolvidos:
- `src/components/DebugKeyboardToggle.tsx`
- `src/hooks/useDebugAllowed.ts`
- `src/components/GlobalDebugBar.tsx`

Validação lógica:
- atalho grava/remove `DEBUG_BAR`
- `useDebugAllowed` escuta `debug-bar-toggle`
- `GlobalDebugBar` aparece no rodapé quando `DEBUG_BAR=1` para owner

Não precisa mexer no backend nem em regras de autenticação.

### Implementação esperada
Mudança principal em `DebugKeyboardToggle.tsx`:
- remover:
  - o comentário/comportamento “Desativado em /app”
  - `if (isAthleteRoute) return;` dentro do `useEffect`
  - `if (isAthleteRoute) return null;` no render
  - o fallback que força `{ isQAActive: false, ... }` em rota de atleta
- manter:
  - a checagem do owner para `Ctrl+Shift+D`
  - os toasts “Debug ON/OFF”
  - o modal de QA

### Risco / cuidado
Baixo risco. A mudança é localizada e não altera dados do atleta. O único impacto é permitir que o atalho funcione onde hoje ele está explicitamente bloqueado.

### Como vou validar depois da implementação
1. Abrir `/app`
2. Pressionar `Ctrl+Shift+D`
3. Confirmar que aparece o toast `Debug ON`
4. Confirmar que a `GlobalDebugBar` surge no rodapé
5. Confirmar que o botão `🗑 Zerar Sessões` fica visível
6. Pressionar `Ctrl+Shift+D` de novo e confirmar `Debug OFF`

### O que não muda
- regras de owner/QA
- conteúdo da `GlobalDebugBar`
- lógica de reset de sessões
- qualquer fluxo de usuário final

### Resumo
A barra “parece bloqueada” porque o teclado está propositalmente desativado em `/app`. A correção é remover esse bloqueio de rota em `DebugKeyboardToggle.tsx` e deixar a permissão continuar sendo controlada apenas por owner/QA.
