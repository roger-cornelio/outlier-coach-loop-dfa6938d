

## Plano: Adicionar Social Proof à Landing Page

### O que será adicionado

Três novas seções na Landing Page, inseridas entre "COMO FUNCIONA" e "O QUE VOCÊ RECEBE":

---

### 1. Seção "Números" — Métricas de impacto

Barra horizontal com 3-4 métricas animadas (counter up on scroll):
- **500+** Diagnósticos gerados
- **12min** Melhoria média identificada  
- **98%** Precisão do diagnóstico
- **3** Categorias: Open · Pro · Elite

Cards minimalistas em linha, com número grande em `text-primary` e label pequeno abaixo.

---

### 2. Seção "Antes & Depois" — Transformações reais

2-3 cards mostrando evolução de atletas fictícios (dados placeholder realistas):
- Nome, categoria (Open → Pro)
- Tempo anterior → Tempo atual
- Barra visual de progresso
- Estações que mais melhoraram

Layout: cards lado a lado em desktop, carousel/stack em mobile.

---

### 3. Seção "Depoimentos" — Testemunhos de atletas

3 cards de depoimento com:
- Citação do atleta (texto curto, aspas estilizadas)
- Nome + cidade + categoria
- Avatar placeholder com iniciais

Layout: grid 3 colunas desktop, stack mobile. Aspas grandes decorativas em `text-primary/20`.

---

### Implementação

**Arquivo único**: `src/pages/Landing.tsx`

- Adicionar as 3 seções após "COMO FUNCIONA" (linha 139) e antes de "DIFERENCIAIS" (linha 141)
- Usar os mesmos padrões visuais existentes: `motion` com `fadeUp`, `font-display`, `tracking-widest`, cards `bg-card border border-border`
- Dados hardcoded (placeholder) — não precisa de banco
- Animação de contagem nos números usando `useEffect` + `useInView` do framer-motion
- Totalmente responsivo (mobile-first, já que viewport atual é 430px)

### Ordem final das seções
1. Hero
2. Por que Outlier?
3. Como Funciona
4. **Números** (novo)
5. **Antes & Depois** (novo)
6. **Depoimentos** (novo)
7. O que você recebe
8. Para Coaches
9. CTA Final
10. Footer

