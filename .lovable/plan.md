

## Plano: Adicionar link "Ainda não realizei prova oficial" na Landing

### Alteração

**Arquivo: `src/pages/Landing.tsx`**

Após o botão "RECEBER DIAGNÓSTICO" (linha ~76), adicionar um link secundário com o texto "Ainda não realizei prova oficial" que redireciona para `/login?mode=signup`.

Estilo: texto discreto, centralizado, com underline sutil — sem competir com o CTA principal. Mesmo padrão visual dos links muted existentes na página.

```
[⚡ RECEBER DIAGNÓSTICO]   ← CTA principal (já existe)

Ainda não realizei prova oficial →   ← novo link, abaixo
```

### O que não muda
- Diagnóstico gratuito, fluxo de coach, banco de dados

