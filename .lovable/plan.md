

## Plano: Remover placeholders e debug bars de produção

### O que será removido

**1. Nutrição e Medicina do Esporte** — páginas placeholder sem funcionalidade

**2. 3 barras de debug** — visíveis em produção, poluem a UI

### Alterações

**Deletar arquivos (4):**
- `src/pages/Nutricao.tsx`
- `src/pages/MedicinaDoEsporte.tsx`
- `src/components/DebugPanel.tsx`
- `src/components/StructuredEditorDebugBar.tsx`

**Editar `src/App.tsx`:**
- Remover imports de `Nutricao`, `MedicinaDoEsporte`, `GlobalDebugBar`
- Remover as 2 rotas (`/nutricao`, `/medicina-do-esporte`)
- Remover `<GlobalDebugBar />`

**Editar `src/components/AppSidebar.tsx`:**
- Remover itens "Nutrição" e "Medicina do Esporte" do array de navegação
- Remover imports de `Apple` e `Stethoscope`

**Editar `src/components/MobileNav.tsx`:**
- Remover itens "Nutrição" e "Medicina do Esporte" do array de navegação
- Remover imports de `Apple` e `Stethoscope`

**Editar `src/pages/Index.tsx`:**
- Remover import e uso de `<DebugPanel />`

**Editar `src/components/StructuredWorkoutEditor.tsx`:**
- Remover import e uso de `<StructuredEditorDebugBar />`

### Resultado
- Sidebar e mobile nav ficam mais limpos (sem itens "em breve")
- Zero barras de debug em produção
- 4 arquivos a menos no projeto

