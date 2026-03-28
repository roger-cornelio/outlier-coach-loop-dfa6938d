

## Plano: Trocar coach via configuração com lista de coaches disponíveis

### Problema
O botão "Trocar coach" na tela de configuração (`AthleteConfig.tsx`, linha 379) apenas mostra um toast pedindo para falar com suporte. O atleta não consegue trocar de coach sozinho.

### Solução
Substituir o toast por um modal que reutiliza a lógica já existente de busca/recomendação de coaches (`get_recommended_coaches` e `search_coaches_by_name`). Ao selecionar um novo coach:
1. Remove o vínculo atual (deleta de `coach_athletes` + limpa `profiles.coach_id`)
2. Cria uma `coach_link_request` pendente para o novo coach
3. Feedback visual imediato

### Alterações

**1. Novo componente: `src/components/ChangeCoachModal.tsx`**
- Modal com busca por nome + lista de coaches recomendados (reutiliza as RPCs existentes)
- Ao clicar em um coach: desvincula do atual, insere request pendente, fecha modal
- Props: `open`, `onClose`, `currentCoachName`

**2. `src/components/AthleteConfig.tsx`**
- Importar `ChangeCoachModal`
- Estado `showChangeCoach` para controlar o modal
- Botão "Trocar coach" abre o modal em vez de toast
- Após troca bem-sucedida: atualizar `coachName` local para "Pendente..." e recarregar

**3. Migração SQL** — RPC `unlink_current_coach`
- `SECURITY DEFINER`, recebe apenas `_athlete_id uuid` (usa `auth.uid()` para validar)
- Deleta de `coach_athletes WHERE athlete_id = _athlete_id`
- Seta `profiles.coach_id = NULL WHERE user_id = _athlete_id`
- Retorna `true`

### Fluxo do usuário

```text
[Trocar coach] → Modal abre
  ├── Buscar por nome (search_coaches_by_name)
  └── Coaches recomendados (get_recommended_coaches)
       ↓
  Clica no coach desejado
       ↓
  1. RPC unlink_current_coach → remove vínculo atual
  2. INSERT coach_link_requests (pending) → solicita novo vínculo
  3. Toast: "Solicitação enviada para [Coach]!"
  4. Modal fecha, tela atualiza para "Pendente..."
```

### O que não muda
- Dashboard do coach, RPCs de busca, fluxo de onboarding
- O novo coach ainda precisa aprovar a solicitação

