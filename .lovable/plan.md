

## Plano: Unificar "Transformações Reais" e "Depoimentos" em uma única seção

### O que muda

As duas seções separadas ("TRANSFORMAÇÕES REAIS" com cards de antes/depois e "QUEM JÁ É OUTLIER" com depoimentos) serão fundidas em uma única seção chamada **"TRANSFORMAÇÕES REAIS"**.

Cada card passa a conter:
- Nome, cidade, badge de nível (Open → Pro)
- Tempos Antes / Depois com seta
- Barra de progresso + tempo ganho (-14:23)
- Chips das estações foco
- **Citação do depoimento** integrada abaixo dos dados
- Avatar com iniciais + cidade

### Arquivo alterado

**`src/pages/Landing.tsx`**
- Unificar os arrays `transformations` e `testimonials` em um único array com todos os campos
- Remover a seção "QUEM JÁ É OUTLIER" separada
- No card unificado: manter o layout atual de antes/depois no topo, e adicionar a quote + avatar na parte inferior do mesmo card
- Ícone de aspas (Quote) posicionado no canto do card como decoração

### Layout do card unificado

```text
┌─────────────────────────────┐
│ MARCOS OLIVEIRA   OPEN→PRO  │
│ São Paulo                    │
│                              │
│  Antes  →  Depois            │
│ 1:32:45   1:18:22            │
│ ████████████░░░  -14:23      │
│ [Sled Push] [SkiErg] [WB]   │
│                              │
│ "O diagnóstico mostrou..."   │
│                              │
│ 🟠 MO  Marcos O. · SP       │
└─────────────────────────────┘
```

### Resultado
- Menos scroll na página
- Prova social mais forte: dados + voz do atleta no mesmo card
- Uma única seção com título "TRANSFORMAÇÕES REAIS"

