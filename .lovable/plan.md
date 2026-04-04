

## Plano: Corrigir email de recuperação de senha vazio

### Problema
O email de reset de senha chega sem conteúdo visível — sem botão, sem link. O template padrão do sistema de autenticação não está renderizando o link de recuperação corretamente.

### Solução
Configurar templates de email de autenticação personalizados para o projeto. Isso substitui o template genérico por um email com branding OUTLIER que inclui corretamente o botão de redefinição de senha.

### Passos

1. **Verificar se já existe domínio de email configurado** — checar o status atual da infraestrutura de email do projeto

2. **Se não houver domínio configurado** — iniciar o setup de domínio de email para que os emails venham do domínio do app (em vez de `no-reply@auth.lovable.cloud`)

3. **Criar templates de email de autenticação** — gerar templates personalizados com:
   - Logo e branding OUTLIER (cores, fontes do app)
   - Botão funcional de "Redefinir Senha" com o link correto
   - Texto em português
   - Templates para todos os tipos de email de auth (reset, verificação, magic link, etc.)

4. **Deploy dos templates** — publicar as funções de email para que entrem em vigor

### Resultado
- Email de recuperação chega com visual OUTLIER e botão funcional de "Redefinir Senha"
- Link no botão aponta para `app.outlier.run` com o fluxo correto
- Todos os emails de autenticação ficam com branding consistente

### Pré-requisito
Será necessário configurar um domínio de email (ex: `outlier.run`) para envio. Caso não queira configurar domínio agora, uma alternativa mais simples é verificar se o template padrão do sistema pode ser ajustado para incluir o link corretamente.

