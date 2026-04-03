

## Plano: Adicionar Busca por Atleta + Filtro de Período Global

### O que muda

1. **Campo de busca por atleta** no topo da lista (acima dos cards KPI ou entre KPIs e lista), com busca por nome ou email — filtra a lista em tempo real enquanto digita.

2. **Filtro de período global** (usando o `PeriodFilter` que já existe em `src/components/admin/PeriodFilter.tsx`) posicionado ao lado da busca. Esse range de datas é passado como prop para os feedbacks de cada atleta expandido, substituindo os date pickers individuais que existem dentro de cada `AthleteFeedbacksColumn`.

### Arquivos alterados

**`src/components/CoachOverviewTab.tsx`**
- Adicionar estado `searchTerm` com input de busca (ícone Search + placeholder "Buscar atleta...")
- Filtrar `sortedAthletes` por `athlete_name` ou `athlete_email` contendo o termo
- Importar e posicionar `PeriodFilter` ao lado da busca
- Elevar estado `dateRange` para o nível do componente
- Passar `dateRange` como prop para `AthleteFeedbacksColumn`
- Remover os date pickers internos do `AthleteFeedbacksColumn` (já recebe range via prop)

### Layout (mobile 430px)

```text
[🔍 Buscar atleta...              ]
[7d] [30d] [90d] [Este mês] [📅→📅]
─────────────────────────────────────
KPI Cards (como já estão)
─────────────────────────────────────
Lista de atletas filtrada
```

### Sem alteração no banco
Filtro é 100% client-side sobre dados já carregados.

