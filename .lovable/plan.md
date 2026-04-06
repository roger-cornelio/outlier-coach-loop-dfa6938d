

## Plano: Briefing do dia como fala natural do Coach

### Conceito

Em vez de card com labels e barras de progresso, o coach "fala" tudo em texto corrido natural — como se fosse uma mensagem de WhatsApp do treinador.

### Exemplo por coach style

**IRON:**
> "Hoje é força e condicionamento, uns 52 minutos. O pico vai ser no WOD principal — 5 rounds com carga até 70kg. Na semana, esse é o mais pesado, 8 de 10. Sem desculpa. Só execução."

**PULSE:**
> "Seu treino hoje é força com condicionamento, cerca de 52 minutos. O momento mais intenso vai ser o WOD de 5 rounds com 70kg. Comparado com a semana, esse treino pesa 8 de 10. Confia no processo — cada rep te aproxima."

**SPARK:**
> "Bora! Hoje tem força + condicionamento, ~52 min. O bicho pega no WOD principal — 5 rounds, 70kg na parada! Na semana esse é 8/10 em peso. Bora meter bronca! 🔥"

### UI

```text
┌─────────────────────────────────────────────────┐
│  🔥 IRON                                        │
│                                                  │
│  "Hoje é força e condicionamento, uns 52         │
│   minutos. O pico vai ser no WOD principal —     │
│   5 rounds com carga até 70kg. Na semana,        │
│   esse é o mais pesado, 8 de 10.                 │
│   Sem desculpa. Só execução."                    │
│                                                  │
└─────────────────────────────────────────────────┘
```

Um único bloco de texto, sem labels, sem barras, sem métricas separadas. Tudo integrado na fala.

### Como funciona

1. **Cálculos locais** (instantâneo):
   - Tipos de bloco do dia + tempo estimado
   - Bloco mais pesado via `identifyMainBlock()`
   - Nota 1-10 comparando com a semana

2. **Template de frase** por coach style — preenche com os dados calculados:
   - `{tiposTreino}`, `{tempoEstimado}`, `{blocoMaisPesado}`, `{detalhePico}`, `{notaSemana}`
   - Frase final do pool rotativo (hash do dia)

3. **Zero IA** — tudo client-side, instantâneo

### Alterações

**Deletar:**
- `src/components/PreWorkoutScreen.tsx`
- `supabase/functions/generate-preworkout-message/index.ts`

**Criar:**
- `src/components/DailyBriefingCard.tsx` — monta a frase natural com dados reais + frase final do pool

**Editar:**
- `src/components/Dashboard.tsx` — inserir no topo
- `src/pages/Index.tsx` — remover view `preWorkout` e imports

### Pool de frases finais (15 por style, rotação por dia)

Seleção: `index = (dayOfYear + weekNumber) % phrases.length`

Cada frase final é colada no fim do texto técnico, criando uma mensagem única e coesa.

