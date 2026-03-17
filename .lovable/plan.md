

## O que será feito — Explicação simples

### Correção 1: Blocos expandíveis

**Problema hoje:** Quando o coach cola um treino, cada bloco mostra no máximo 5 linhas. O resto fica escondido atrás de um texto "... +N linhas" que não é clicável. O coach não consegue ver nem conferir o treino completo.

**Solução:** Esse texto vira um **botão clicável**. Ao clicar, o bloco abre e mostra todas as linhas. Clicando de novo, recolhe. Simples assim.

---

### Correção 2: Detecção inteligente de erros de digitação

**Problema hoje:** Se o coach escreve "Strenght" em vez de "Strength", ou "ANRAP" em vez de "AMRAP", o sistema não reconhece como título de bloco. Resultado: os blocos ficam grudados (ex: Warm Up + Strength viram um bloco só).

**Solução:** O sistema vai comparar cada título suspeito com uma lista de termos conhecidos (Warm Up, Strength, AMRAP, EMOM, Core, Metcon, etc). Se o título estiver "quase certo" — com 1 ou 2 letras erradas — o sistema faz duas coisas:

1. **Separa o bloco normalmente** (para não grudar blocos)
2. **Mostra um aviso amarelo** para o coach: _"Strenght" → Você quis dizer "Strength"?_

O aviso é **apenas informativo**. O coach pode corrigir se quiser, mas **não é obrigado**. O salvamento **nunca é bloqueado** por causa de um typo.

---

### Resumo

| O quê | Como funciona |
|-------|---------------|
| Blocos truncados | Botão "Ver tudo" para expandir/recolher |
| Erro de digitação | Aviso amarelo sugerindo correção, sem bloquear nada |

Nenhuma lógica de cálculo, salvamento ou validação será alterada. Apenas melhorias visuais e de usabilidade.

