

## Plano: Superadmin acessa Diagnóstico Gratuito logado + busca qualquer atleta

### Problema atual

1. **AppGate** redireciona usuários logados que acessam `/diagnostico-gratuito` para seus dashboards (conforme plano anterior aprovado mas ainda não implementado)
2. **DiagnosticoGratuito** usa `isNameSimilar()` para restringir a busca ao nome do perfil logado — superadmin fica preso ao próprio nome

### O que será feito

**1. AppGate — permitir superadmin no diagnóstico**

Na lógica de `/diagnostico-gratuito`, quando o usuário logado for `superadmin`, permitir acesso normalmente (não redirecionar). Outros roles (athlete, coach, admin) continuam sendo redirecionados para seus dashboards.

**2. DiagnosticoGratuito — bypass de validação de nome para superadmin**

Na função `handleQueryChange`, quando `isSuperAdmin === true`, pular a verificação `isNameSimilar()` e permitir busca de qualquer nome livremente.

### Arquivos alterados

1. **`src/components/AppGate.tsx`** — Adicionar exceção: se `state === 'superadmin'` e `pathname === '/diagnostico-gratuito'`, renderizar children (não redirecionar)
2. **`src/pages/DiagnosticoGratuito.tsx`** — Usar `isSuperAdmin` do `useAuth()` para pular validação de `isNameSimilar` e não mostrar `nameMismatchWarning`

### Sem alteração no banco

