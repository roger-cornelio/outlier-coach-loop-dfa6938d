

## Plano: Botão "Zerar Sessões" no Debug Bar (apenas modo desenvolvedor)

### Mudança

**`src/components/GlobalDebugBar.tsx`**:
- Adicionar botão **"🗑 Zerar Sessões"** ao lado dos controles existentes
- Visível apenas quando `isAllowed` é true (Owner ou QA mode)
- Ao clicar: limpa `outlier-benchmark-history` e zera `workoutResults` no `outlier-store-v2` do localStorage, depois recarrega a página
- Botão com estilo discreto (vermelho/destrutivo) para evitar cliques acidentais

### Segurança
- O botão só aparece dentro do `GlobalDebugBar`, que já é invisível para usuários normais do app
- Nenhum usuário final verá essa opção

