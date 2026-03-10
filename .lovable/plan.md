

## Plano: Esconder painel debug da API para usuários comuns

### Problema
O painel mostrando a URL da API externa (`api-outlier.onrender.com/diagnostico?...`) aparece para todos os usuários, expondo detalhes técnicos que não fazem sentido para atletas.

### Solução
Remover completamente esse painel de debug — ele não deve ser exibido para nenhum usuário na interface. Se a URL for útil para debugging, ela já aparece no console.

### Alterações

**`src/components/RoxCoachExtractor.tsx`**
- Remover o bloco JSX que renderiza o painel com `debugApiUrl`
- Manter o `console.log` da URL para debugging via DevTools
- Remover o state `debugApiUrl` se não for mais usado em nenhum lugar

