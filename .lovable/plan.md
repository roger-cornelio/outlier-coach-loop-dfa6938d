

## Plano: Adicionar Regra de Descending/Ascending Rep Scheme ao Prompt

### O que será feito

Adicionar ao prompt da Edge Function `parse-workout-blocks` uma regra e exemplos para o padrão de **rep scheme decrescente/crescente** (ex: "40,30,20,10" seguido de exercícios).

### Mudanças no arquivo `supabase/functions/parse-workout-blocks/index.ts`

**1. Nova regra no FORMAT RECOGNITION (após linha 149)**
- Reconhecer padrões como "40,30,20,10", "21-15-9", "50-40-30-20-10" seguidos de exercícios
- Instrução: somar todas as reps (40+30+20+10=100), retornar `reps: soma`, `sets: 1`
- Guardar o esquema original no campo `notes` (ex: "Rep scheme: 40,30,20,10")

**2. Dois exemplos few-shot novos (após os exemplos existentes)**

Exemplo 1 — Warm Up decrescente:
```
Input: title "Warm Up", content "40,30,20,10\nShoulder Taps\nCalf Raises"
Output: [
  {"slug":"shoulder_taps","name":"Shoulder Taps","movementPatternSlug":"core","sets":1,"reps":100,"notes":"Rep scheme: 40,30,20,10"},
  {"slug":"calf_raises","name":"Calf Raises","movementPatternSlug":"isolation","sets":1,"reps":100,"notes":"Rep scheme: 40,30,20,10"}
]
```

Exemplo 2 — Fran-style 21-15-9:
```
Input: title "WOD", content "21-15-9\nThrusters (43kg)\nPull-ups"
Output: [
  {"slug":"thrusters","name":"Thrusters","movementPatternSlug":"squat_vertical_push","sets":1,"reps":45,"loadKg":43,"notes":"Rep scheme: 21-15-9"},
  {"slug":"pull_ups","name":"Pull-ups","movementPatternSlug":"pull","sets":1,"reps":45,"notes":"Rep scheme: 21-15-9"}
]
```

### Arquivo modificado
- `supabase/functions/parse-workout-blocks/index.ts` — adição de 1 regra + 2 exemplos no prompt

### Risco
**Zero.** Apenas texto adicional no prompt. Não altera lógica de parsing nem motor de cálculo.

