

## Plano: Sexo nas configurações do onboarding + visível no perfil do coach

### Alterações

**1. `src/components/WelcomeScreen.tsx`** — Nova tela `profileConfig`
- Incluir toggle Masculino/Feminino junto com Peso, Altura, Idade
- Persistir `sexo` no `handleFinish` (update profiles)
- Mesmo visual das demais telas de onboarding

**2. `src/components/CoachOverviewTab.tsx`** — Coluna "Perfil" do atleta expandido
- Exibir badge com sexo do atleta (ex: "♂ Masculino" / "♀ Feminino") ao lado de peso/altura
- O campo `sexo` já existe no `AthleteOverview` e já é carregado pelo hook

**3. `src/hooks/useCoachOverview.ts`** — Incluir `session_duration` no fallback (já tem `sexo`)

### Resumo da tela `profileConfig`
4 seções visuais:
1. **Biometria**: Peso, Altura, Idade, Sexo (M/F toggle)
2. **Estilo de treinador**: IRON / PULSE / SPARK (cards)
3. **Tempo disponível**: 60 min / Sem limite (cards)

### Coach vê no painel
Na expansão do atleta, coluna "Perfil": badge de sexo + badge de tempo disponível + dados existentes (peso, altura, onboarding, equipamentos)

Sem migration — todos os campos já existem na tabela `profiles`.

