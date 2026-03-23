

## Plano: Alinhar Copy e Posicionamento ao Modelo de Negocio Real

### Contexto (entendimento do modelo)
- **Coach dedicado** monta treino manualmente com base no diagnostico — zero treino generico
- **Diagnostico no onboarding** = isca de venda (lead magnet gratuito → conversao para plano pago)
- **Feedback em tempo real** = feito pela IA, nao pelo coach

### O que precisa mudar

**1. Landing Page (`src/pages/Landing.tsx`)**

Textos atuais que contradizem o modelo:
- "Treinos genéricos não funcionam" → ok, mas o desc fala "programa baseado nos seus dados" sem mencionar o coach humano
- "treinos personalizados" no hero → vago, parece automatico
- Step 03 "Evolua com dados" → nao menciona coach dedicado
- Seçao "TECNOLOGIA DE PERFORMANCE" → foca em tech, nao no valor humano

Mudanças:
- Hero subtitle: "Diagnóstico gratuito + treino personalizado por um coach dedicado"
- Card 1: manter titulo, mudar desc para enfatizar coach humano que usa dados
- Card 3: reforçar que o coach monta o treino com base no diagnostico
- Step 03: "Treine com um coach dedicado" — desc: "Seu coach monta cada treino com base no seu diagnóstico. Feedback em tempo real acompanha sua evolução."
- Seçao tech: renomear para "O QUE VOCE RECEBE" com items mais orientados a valor (diagnostico gratuito, coach dedicado, feedback instantaneo, evolução mensuravel)

**2. Onboarding CTA (`src/components/WelcomeScreen.tsx`)**

Step `cta` (linha 675-677): texto atual "Acesse treinos personalizados, benchmarks e evolução em tempo real" — generico demais.

Mudança: "Seu diagnóstico revelou onde melhorar. Um coach dedicado vai montar treinos específicos para seus gargalos."

Step `profileCta` (linhas 826-828): manter motivacional mas reforçar que o proximo passo é ser conectado a um coach.

Botao CTA: "COMEÇAR MINHA EVOLUÇÃO" → "QUERO MEU PLANO DE TREINO"

**3. Dashboard diagnosis text**

O hook `useAthleteDiagnosis` ja tem copy adequada. Nao precisa mudar.

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/pages/Landing.tsx` | Reescrever copy das 4 seçoes para posicionar coach dedicado + diagnostico como isca |
| `src/components/WelcomeScreen.tsx` | Ajustar copy dos steps `cta` e `profileCta` para vender o plano do coach |

### Resumo
Duas edições de copy focadas em comunicar: (1) diagnostico gratuito como porta de entrada, (2) coach humano dedicado como diferencial, (3) feedback IA em tempo real como valor agregado. Sem mudanças de logica ou banco.

