

## Plano: Loading com frases rotativas em vez de spinner

### O que muda

**Arquivo:** `src/pages/Index.tsx` — linhas 236-242

Substituir o spinner genérico por uma sequência de frases que trocam automaticamente com animação suave:

1. **"Preparando sua experiência..."** (0s)
2. **"Entendendo sua prova..."** (2.5s)
3. **"Avaliando splits reais..."** (5s)
4. **"Quase lá..."** (7.5s)

Cada frase aparece com fade-in/fade-out usando Framer Motion (já importado no arquivo). O spinner continua visível mas menor, acima do texto.

### Implementação

- Criar um state `phraseIndex` com `useState(0)`
- `useEffect` com `setInterval` de 2.5s que incrementa o índice ciclicamente
- Array de frases fixo
- Animação com `AnimatePresence` + `motion.p` (key = phraseIndex) para transição suave entre frases

### Arquivo alterado

1. **`src/pages/Index.tsx`** — Bloco de loading (linhas 236-242)

