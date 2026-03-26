

## Plano: Ajustes na sidebar do Admin Portal

### Mudanças em `src/pages/AdminPortal.tsx`:

1. **Barra de rolagem na navegação**: Envolver o `<nav>` em um container com `overflow-y-auto` e altura calculada para ocupar o espaço disponível (excluindo o header)

2. **Remover footer da sidebar**: Apagar o bloco "User Info & Logout" (linhas 339-358) — sem email, sem botão Sair no rodapé

3. **Nome do admin no header da sidebar**: Ao lado de "ADMIN", mostrar o nome do perfil (sem email): `ADMIN · Roger`

4. **Botão Sair no header principal (top-right)**: Adicionar botão de logout com ícone no canto direito do header sticky (linha 369-381), usando `ml-auto`

### Resultado visual
- Sidebar: header com "ADMIN · Nome" + nav scrollável com todos os itens
- Header principal: título da seção à esquerda, botão Sair à direita
- Sem email visível, sem footer na sidebar

