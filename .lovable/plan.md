

## Plano: Adicionar "Prova Alvo" no onboarding do atleta

### Problema
O atleta só pode cadastrar sua prova alvo depois de completar o onboarding, na tela dedicada. Essa informação deveria ser coletada durante o setup inicial, já que impacta diretamente o dashboard (countdown, metas, periodização).

### Onde inserir
No fluxo do onboarding (WelcomeScreen.tsx), entre o step `profileGoal` (qual seu objetivo) e `profileCta` (motivacional). Um novo step chamado `provaAlvo` onde o atleta:

1. Vê a pergunta "Você já tem uma prova alvo?"
2. Pode responder **SIM** → abre mini-formulário inline (busca em discovered_events + cadastro manual)
3. Pode responder **AINDA NÃO** → pula para o próximo step

### Mini-formulário inline (sem modal)
- Busca por nome em `discovered_events` (reutilizando lógica do EventSearchPanel)
- Se não encontrar, formulário manual simplificado: Nome da prova, Categoria (dropdown HYROX), Data, Cidade
- Ao salvar, insere na tabela `athlete_races` com `race_type = 'ALVO'`

### Sincronização
- **CRM**: A prova alvo já é acessível via `athlete_races` que o CRM consulta. Adicionar o campo `onboarding_target_race` no profile com o nome da prova para consulta rápida.
- **Dashboard**: Já usa `useAthleteRaces()` para mostrar a prova alvo — não precisa de mudança.

### Arquivos alterados
1. **`src/components/WelcomeScreen.tsx`** — Novo step `provaAlvo` entre `profileGoal` e `profileCta`, com busca de eventos + form manual inline
2. **`src/components/admin/crm/VisaoGeralTab.tsx`** — Exibir prova alvo na ficha do CRM (se existir no `athlete_races`)

### Fluxo atualizado
```text
profileConfig → profile → profileGoal → [NOVO: provaAlvo] → profileCta → coach → planSelection
```

