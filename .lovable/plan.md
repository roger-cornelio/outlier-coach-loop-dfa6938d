

## Plano: Mensagem amigável para rate limit + aumentar limite de emails/hora

### Problema
Quando o rate limit de email é atingido (erro 429 `email rate limit exceeded`), a mensagem técnica é exibida diretamente ao usuário. Além disso, o limite padrão de emails por hora é muito baixo para um app que pode viralizar.

### 1. Mensagem amigável no signup (Auth.tsx)

**Arquivo**: `src/pages/Auth.tsx` (linhas ~379-391)

Adicionar tratamento específico para rate limit no bloco de erros do signup:

```typescript
if (error.message.includes('rate limit')) {
  toast({
    title: 'Muitas tentativas',
    description: 'Nossos servidores estão processando muitos cadastros. Aguarde alguns minutos e tente novamente.',
    variant: 'destructive',
  });
} else if (error.message.includes('already registered')) {
  // ... existing
}
```

Também adicionar o mesmo tratamento no bloco de forgot-password (linha ~407) e login (linha ~344), caso rate limit apareça nesses fluxos.

### 2. Aumentar rate limit de emails

**Arquivo**: `supabase/config.toml`

Adicionar configuração de rate limit de email na seção `[auth]`:

```toml
[auth]
rate_limit_email_sent = 100
```

Isso aumenta de 3-4 emails/hora (padrão) para 100/hora, suportando muito mais cadastros simultâneos.

### Resumo
- 1 arquivo de código alterado (`Auth.tsx`) — tratamento de erro amigável
- 1 arquivo de config alterado (`config.toml`) — aumento do rate limit

