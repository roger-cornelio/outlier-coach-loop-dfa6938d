

## Plano: Reestruturar "Nível Competitivo" — Prova Alvo abaixo da régua em grid de 4 colunas

### Layout final pretendido

```text
┌──────────────────────────────────────────────────────────────┐
│  🏆 NÍVEL COMPETITIVO                                        │
│                                                              │
│  Seu Tempo       Meta PRO       Faltam        Previsão       │
│  1h19m57s        1h13m36s       ↓ 6m21s       ~10 meses      │
│                                                              │
│  [████████████████████░░░░░░░]                               │
│  🎯 Com evolução de 39s/mês, você atinge PRO em ~10 meses   │
│                                                              │
│  ── separador fino ──────────────────────────────────────    │
│                                                              │
│  PROVA ALVO              Categoria    Preparação   Result.   │
│  BOPE GAMES 2026         PRO          194 dias     1h15m38s  │
│  (Belo Horizonte)                                            │
│                                                              │
│  [👻 Se a prova fosse hoje, você estaria no Top 3%]          │
└──────────────────────────────────────────────────────────────┘
```

### Mudanças em `DiagnosticRadarBlock.tsx`

**Ambos mobile (~linhas 2324-2390) e desktop (~linhas 2482-2557):**

1. **Remover** o bloco "Prova Alvo resumida" que fica ACIMA do grid (entre header e as 4 colunas)
2. **Remover** a linha separada "📊 Performance projetada na prova" que fica após a frase de ação
3. **Adicionar** após a frase de ação (e antes do botão fantasma):
   - Um separador fino (`border-t border-border/10`)
   - Um **grid de 4 colunas** com:
     - Col 1: **PROVA ALVO** — nome da prova (bold) + cidade em parênteses abaixo (muted, menor)
     - Col 2: **Categoria** — ex: "PRO"
     - Col 3: **Preparação** — ex: "194 dias"
     - Col 4: **Resultado Esperado** — tempo projetado via `calculateProvaAlvoTarget(currentTime, daysUntil)`
   - Este bloco só aparece se `provaAlvo` existir

4. O botão fantasma 👻 continua logo abaixo, sem mudança

### Parsing do nome da prova
- Nome completo: `deduplicateRaceName(provaAlvo.nome)` → ex: "BOPE GAMES BELO HORIZONTE 2026"
- Separar cidade: extrair as palavras entre o prefixo do evento e o ano, mostrar em parênteses abaixo
- Simplificação: se não conseguir separar, mostrar o nome completo na primeira linha sem subtítulo

### O que não muda
- Header "NÍVEL COMPETITIVO"
- Grid de 4 colunas (Seu Tempo / Meta / Faltam / Previsão)
- Barra de progresso e frase de ação
- Botão fantasma e modal
- Lógica de cálculo
- Nenhuma tabela no banco

