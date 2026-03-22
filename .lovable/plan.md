

## Plano: Onboarding como Funil de Venda (Diagnóstico + Gargalos)

### Conceito

Transformar o `WelcomeScreen` em um fluxo de 4 steps que usa dados reais da prova HYROX do atleta como argumento de venda:

```text
Step 1: "ENTENDEMOS A SUA PROVA"
  → Busca automática pelo nome do perfil
  → Atleta seleciona sua prova
  → Loading: "Analisando sua performance..."

Step 2: "PARABÉNS POR ESSE RESULTADO"
  → Mostra finish time, evento, divisão
  → Destaque positivo: posição, pontos fortes

Step 3: "MAS PARA SER OUTLIER..."
  → Lista os gargalos extraídos (diagnostico_melhoria)
  → Visual impactante: barras vermelhas nos piores splits
  → "Você precisa melhorar: SkiErg, Sled Push, Run..."

Step 4: "PRONTO PARA SER FORA DA CURVA?"
  → CTA final: "COMEÇAR MINHA EVOLUÇÃO"
  → Salva coach_style PULSE + marca setup completo
  → Redireciona para dashboard

Fallback (sem prova encontrada):
  → Mostra busca manual
  → Botão "Pular" → vai direto ao Step 4 sem dados
```

### Arquivo

| Arquivo | Acao |
|---|---|
| `src/components/WelcomeScreen.tsx` | Refatorar para fluxo multi-step com busca, diagnóstico e venda |

### Fluxo tecnico

1. **Step 1** reutiliza a logica de `RoxCoachExtractor`: chama `search-hyrox-athlete` com `profile.name` + `profile.sexo`, mostra resultados para selecao. Apos selecao, chama `proxy-roxcoach` + `generateDiagnostic` para obter dados completos.

2. **Step 2** usa os dados do `diagnostico_resumo` recem-salvo (finish_time, evento, divisao, posicao).

3. **Step 3** usa os dados de `diagnostico_melhoria` recem-salvos para listar os top 3 gargalos (ordenados por `percentage` ou `improvement_value`), mostrando nome do exercicio e quanto tempo o atleta pode ganhar.

4. **Step 4** chama `saveCoachStyle('PULSE')` e `setCurrentView('dashboard')` (mesma logica atual).

### Design visual

- Fundo escuro com glow (manter atual)
- Transicoes com framer-motion entre steps
- Step 3 usa cores de alerta (vermelho/laranja) nos gargalos
- Cada step ocupa tela cheia (mobile-first)
- Animacoes sequenciais nos itens de gargalo

### Nao alterar

- Edge functions (search, scrape, proxy) — ja existem
- `useOnboardingDecision` — trigger continua sendo `first_setup_completed`
- `Index.tsx` — continua renderizando `WelcomeScreen` quando `currentView === 'welcome'`
- Fluxo pos-setup (dashboard, treinos, etc.)

