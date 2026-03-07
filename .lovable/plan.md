

## Plano: Mover Demo Level Up para dentro do Admin

### O que muda

1. **Remover a rota `/demo/level-up`** do `App.tsx` e o import do `DemoLevelUp`

2. **Adicionar nova view `demoLevelUp` ao AdminPortal**:
   - Adicionar `"demoLevelUp"` ao tipo `AdminView`
   - Adicionar item no `navItems` com ícone `Shield` e label "Demo Level Up"
   - Renderizar o conteúdo do modal demo quando essa view estiver ativa (inline, sem página separada)

3. **Simplificar `DemoLevelUp.tsx`** para ser um componente (não página), exportando apenas o conteúdo dos botões + modal, sem o wrapper `min-h-screen`

### Resultado
A demo fica acessível apenas por admins autenticados, dentro do painel admin, como mais uma aba no menu lateral.

