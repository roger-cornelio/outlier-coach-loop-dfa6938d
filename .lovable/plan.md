

## Plano: Corrigir aliases no global_exercises

### Problema
Vários exercícios não têm variações sem espaço (ex: `backsquat`), singular (`deadlift`), ou abreviações comuns (`rdl`, `benchpress`). Isso prejudica tanto o fuzzy matching local quanto a referência que a IA usa no prompt.

### Mudanças (1 operação de UPDATE no banco, zero arquivos de código)

Usar a ferramenta de insert/update para atualizar os aliases dos seguintes exercícios:

| Exercício | Aliases atuais | Aliases a adicionar |
|-----------|---------------|---------------------|
| Back Squat | bs, agachamento traseiro | **backsquat**, back squats |
| Front Squat | fs, agachamento frontal | **frontsquat**, front squats |
| Pull-ups | pullup, pull up, barra fixa | **pullups** |
| Push-ups | pushup, push up, flexão | **pushups** |
| Deadlifts | dl, levantamento terra | **deadlift** |
| Air Squats | air squat, bodyweight squat, agachamento livre | **airsquat**, airsquats |
| Kettlebell Swings | kettlebell swing, kbs, swing | **kb swing**, kbswing, kbswings |
| Box Jumps | bj, salto caixa | **boxjump**, boxjumps, box jump |
| Wall Balls | wb, wall ball, wallball | **wallballs** |
| Double Unders | du, double under, corda dupla | **doubleunder**, doubleunders |
| Chin-ups | chin up, chinup | **chinups** |
| Goblet Squat | gs, agachamento goblet | **gobletsquat** |
| Hip Thrusts | hip thrust, elevação pélvica | **hipthrust**, hipthrusts |
| Romanian Deadlift | romanian dl, stiff, stiff leg | **rdl**, romaniandl |
| Bench Press | supino, bp | **benchpress** |
| Barbell Row | remada curvada, bent over row | **barbellrow** |
| Farmers Carry | farmers walk, carregamento, farmer | **farmerscarry** |
| Step-ups | step up, subida banco | **stepup**, stepups |
| Sit-ups | situp, abdominal, ghd situp | **situps** |
| Toes to Bar | ttb, t2b, toes to bar | **toestobar** |
| Muscle-ups | mu, muscle up, bar muscle up | **muscleup**, muscleups |
| Rope Climbs | rope climb, subida corda | **ropeclimb**, ropeclimbs |
| Burpee Broad Jump | bbj, burpee broad jump | **burpeebroadjump** |
| Box Jump Over | bjo, box jump over | **boxjumpover** |

**Nota**: Shoulder Press já NÃO tem 'ohs' nos aliases (aliases atuais: ohp, overhead press, press militar). Nenhuma correção necessária.

### Execução
- 24 statements UPDATE via ferramenta de insert, cada um adicionando aliases com `array_cat`
- Zero mudanças em código ou schema
- Efeito imediato: a Edge Function `parse-workout-blocks` busca `global_exercises` a cada chamada, então os novos aliases são usados na próxima interpretação

