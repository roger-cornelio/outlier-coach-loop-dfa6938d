

## Plano: Simplificar pills de região

### Como vai ficar

```text
┌─────────────────────────────────────────────┐
│  🔍 [Buscar prova por nome, cidade...]      │
│─────────────────────────────────────────────│
│  ┌─────────────────┬────────────────────┐   │
│  │ Oficial HYROX ▪ │  Não Oficial       │   │
│  └─────────────────┴────────────────────┘   │
│─────────────────────────────────────────────│
│  (●) Brasil   ( ) ✈️ Internacional          │  ← SÓ 2 pills, sem emoji 🇧🇷
│                          [Estado ▼]         │  ← só com Brasil selecionado
│─────────────────────────────────────────────│
│  (lista de provas...)                       │
└─────────────────────────────────────────────┘
```

Quando **Não Oficial** está selecionado: nenhum pill aparece, busca sempre Brasil internamente.

### Mudanças no `src/components/EventSearchPanel.tsx`

1. **Tipo `RegiaoFilter`**: remover `'TODAS'`, ficar `'BRASIL' | 'INTERNACIONAL'`
2. **Array `REGIAO_OPTIONS`**: remover item `TODAS`, trocar label `'🇧🇷 Brasil'` por apenas `'Brasil'`
3. **`buildFilters`**: remover o case `'TODAS'` — agora sempre é Brasil ou Internacional
4. **Busca inicial e lógica de debounce**: sem mudança, continuam funcionando igual

Apenas 4 linhas de código mudam. Nenhuma lógica de busca é alterada.

