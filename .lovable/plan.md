

## Plano: Pular busca de prova no onboarding quando veio do fluxo "sem prova"

### Problema
Usuário busca no diagnóstico gratuito, não encontra prova, clica "Nunca fez HYROX → Pular", faz cadastro, e cai no onboarding que mostra a mesma tela de busca novamente — redundante.

### Solução

**1. `src/pages/DiagnosticoGratuito.tsx`** — Ao clicar "Nunca fez HYROX", salvar flag no localStorage:
```
localStorage.setItem('outlier_skip_race_search', 'true')
```

**2. `src/components/WelcomeScreen.tsx`** — No mount, checar essa flag. Se existir:
- Consumir e remover do localStorage
- Iniciar direto no step `'profile'` em vez de `'search'`

### Resultado
Quem já buscou e não encontrou prova vai direto para o questionário de perfil, sem repetir a busca.

