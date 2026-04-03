

## Plano: Adicionar sub-slogan na tela de boas-vindas

### Mudança

No `AthleteWelcomeScreen.tsx`, inserir duas linhas de sub-slogan entre o headline ("VOCÊ ESTÁ PRESTES A SE TORNAR OUTLIER.") e o card do coach:

**Linha 1:** "Treino comum não é mais uma opção."
**Linha 2:** "Pronto para ser fora da curva?"

### Estilo
- `text-muted-foreground`, itálico, `text-lg md:text-xl`
- Fade-in animado (delay após headline)

### Arquivo alterado
1. **`src/components/AthleteWelcomeScreen.tsx`** — Inserir `<motion.p>` com as duas linhas entre o headline (linha ~93) e o card do coach (linha ~96)

