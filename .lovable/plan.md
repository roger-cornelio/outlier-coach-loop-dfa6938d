

## Plano: Corrigir classificação de provas manuais

### Problema Atual

Quando um atleta cadastra uma prova manualmente (ex: "BOPE GAMES"), ela é salva com `tipo_evento: 'OFICIAL'`. Isso faz com que ela apareça na aba **"Oficial HYROX"**, mesmo não sendo uma prova oficial.

### O que vai mudar

**Antes (errado):**
```text
┌─────────────────────────────────────┐
│  Oficial HYROX  │  Não Oficial      │
│  ─────────────────────────────────  │
│  ✅ HYROX São Paulo                 │
│  ✅ HYROX Rio de Janeiro            │
│  ❌ BOPE GAMES  ← aparece aqui     │
└─────────────────────────────────────┘
```

**Depois (correto):**
```text
┌─────────────────────────────────────┐
│  Oficial HYROX  │  Não Oficial      │
│  ─────────────────────────────────  │
│  ✅ HYROX São Paulo                 │  ✅ BOPE GAMES  ← agora aqui
│  ✅ HYROX Rio de Janeiro            │
└─────────────────────────────────────┘
```

### Mudanças técnicas

1. **`src/hooks/useDiscoveredEvents.ts`** — 2 linhas alteradas:
   - Linha 123: adicionar `tipo_evento: 'PARALELA'` no payload de inserção
   - Linha 146: trocar `tipo_evento: 'OFICIAL'` por `'PARALELA'` no objeto de retorno

2. **Correção de dados existentes** — usando ferramenta de inserção (não migração):
   - `UPDATE discovered_events SET tipo_evento = 'PARALELA' WHERE origem_principal = 'MANUAL' AND tipo_evento = 'OFICIAL'`
   - Isso corrige provas como "BOPE GAMES" que já foram salvas erradas

### O que NÃO muda

- Nenhuma lógica de busca é alterada
- Provas oficiais HYROX (vindas do site oficial) continuam como `OFICIAL`
- A interface das abas e filtros permanece igual

