

## Plano: Dashboard de Métricas de Negócio com Filtro de Período

### O que será construído

Uma nova aba **"Métricas"** no Admin Portal com filtro de período global e por seção, permitindo medir evolução mês a mês ou em qualquer intervalo.

### Filtro de período

Componente reutilizável no topo com:
- **Presets rápidos**: Últimos 7 dias, 30 dias, 90 dias, Este mês, Mês passado, Este ano
- **Período customizado**: Date picker com data início e fim
- Todas as queries e cálculos respeitam o período selecionado

### 3 Seções do Dashboard

**1. KPIs de Negócio (cards)**
- Atletas ativos no período (com coach vinculado)
- Coaches ativos no período
- Churn rate no período (atletas desvinculados / total)
- LTV estimado (tempo médio × ticket configurável, default R$99)
- Comparativo com período anterior (ex: +12% vs mês passado)

**2. Funil Diagnóstico → Conversão**
- Total de diagnósticos no período (tabela `diagnostic_leads`)
- Convertidos (`converted = true`) no período
- Taxa de conversão (%)
- Gráfico de diagnósticos por dia/semana no período
- Lista de leads não convertidos para remarketing (com filtro de período)

**3. Métricas por Coach**
- Tabela: coach, atletas vinculados, atletas perdidos, taxa de retenção — tudo filtrado pelo período
- Ordenável por coluna

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/admin/BusinessMetricsDashboard.tsx` | Novo — dashboard completo com filtro de período |
| `src/components/admin/PeriodFilter.tsx` | Novo — componente reutilizável de filtro de período (presets + custom range) |
| `src/pages/AdminPortal.tsx` | Editar — adicionar aba "Métricas" com ícone `TrendingUp` no sidebar |

### Detalhes técnicos

- Filtro de período usa `date-fns` para calcular ranges (já instalado)
- Queries filtram por `created_at` dentro do range selecionado via `.gte()` e `.lte()`
- Comparativo automático: calcula o mesmo período anterior (ex: se 30 dias, compara com os 30 dias antes) para mostrar delta percentual nos KPIs
- Churn calculado via `coach_athletes` (atletas com `unlinked_at` no período)
- Sem migration necessária — usa tabelas existentes (`diagnostic_leads`, `coach_athletes`, `profiles`)
- Recharts para gráficos (já instalado)
- Responsivo com grid adaptativo

