

## Plano: Corrigir redirect da recuperação de senha

### Situação atual
O código usa `window.location.origin` para montar o `redirectTo` do reset de senha. O problema é que o backend de autenticação só redireciona para URLs que estão na lista de URLs permitidas. Se a URL do app não está nessa lista, o usuário cai na página genérica do Lovable.

### O que precisa ser feito

**1. Definir a URL correta do app**
- Se `app.outlier.run` já está configurado como domínio customizado → usar essa URL
- Se ainda não está configurado → configurar em Settings → Domains primeiro, ou usar `outlierdev.lovable.app`

**2. Registrar URLs permitidas no backend de autenticação**
- Adicionar as URLs do app (domínio customizado + lovable.app + preview) à lista de redirect URLs permitidas
- Isso garante que o link no email leve para o app correto

**3. Ajustar o código do reset de senha** (`src/pages/Auth.tsx` e `src/pages/CoachAuth.tsx`)
- Usar a URL publicada/customizada como fallback em vez de depender apenas de `window.location.origin`
- Isso cobre cenários onde o usuário está acessando de uma URL diferente da principal

### Resultado
O link de recuperação de senha no email abre a tela do OUTLIER (com logo e branding corretos) em vez da página do Lovable.

