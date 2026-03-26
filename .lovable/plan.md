

## Plano: Permitir Debug Bar para qualquer conta do Owner

### Problema
O `Ctrl+Shift+D` só funciona quando logado com `roger.bm2016@gmail.com`. Se você testa como atleta com outro email, o atalho é ignorado.

### Opções

**Opção A (recomendada):** Adicionar o email da conta de atleta na whitelist do owner.
- Alterar `OWNER_EMAIL` para uma lista em `DebugKeyboardToggle.tsx`
- Alterar `OWNER_WHITELIST` em `useDebugAllowed.ts`
- Adicionar o email de atleta que você usa para testes

**Opção B:** Usar o modo QA (`Ctrl+Shift+Q`) que funciona em ambiente dev/preview para qualquer email — já está implementado. Basta digitar o código QA (`outlier2024qa`) e a barra aparece.

### Mudança (Opção A)

**`src/components/DebugKeyboardToggle.tsx`**:
- Trocar `OWNER_EMAIL` (string) por array com ambos os emails
- Ajustar check: `OWNER_EMAILS.includes(profile.email.toLowerCase())`

**`src/hooks/useDebugAllowed.ts`**:
- Adicionar o mesmo email na `OWNER_WHITELIST`

**`src/hooks/useQADebugMode.ts`**:
- Adicionar o mesmo email na `OWNER_WHITELIST`

### Importante
Preciso saber qual é o email da conta de atleta para adicionar à whitelist. Alternativamente, você pode usar **Ctrl+Shift+Q** agora mesmo (funciona em preview/dev) e digitar o código `outlier2024qa` para ativar a Debug Bar sem precisar de mudança de código.

