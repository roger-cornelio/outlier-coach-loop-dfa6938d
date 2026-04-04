

## Plano: Adicionar botão de excluir usuário no CRM

### O que muda
Adicionar um botão de lixeira (Trash2) na coluna "Ações" de cada linha do CRM, ao lado do botão existente de desativar coach. Ao clicar, abre um diálogo de confirmação e chama a Edge Function `delete-user` que já existe e já faz a exclusão completa (dados, perfil, auth).

### Implementação

**Arquivo: `src/components/admin/crm/VisaoGeralTab.tsx`**

1. Importar o ícone `Trash2` do lucide-react
2. Adicionar estado `deleteTarget` (similar ao `deactivateTarget` existente) e `deletingUser`
3. Na coluna de Ações, adicionar botão de lixeira para **todos os usuários** (não apenas coaches)
4. Adicionar um segundo `AlertDialog` de confirmação com aviso de que a exclusão é permanente
5. No handler, chamar `supabase.functions.invoke('delete-user', { body: { target_user_id } })` e atualizar a lista local ao confirmar

### Segurança
A Edge Function `delete-user` já valida que apenas **superadmins** podem excluir. Usuários sem permissão receberão erro 403.

### Resultado
- Botão de excluir visível em cada linha do CRM
- Confirmação obrigatória antes de excluir
- Exclusão completa via Edge Function existente (perfil, dados, auth)

