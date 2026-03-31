

## Plano: Corrigir ordem do nome de atletas brasileiros (Sobrenome, Nome → Nome Sobrenome)

### Problema
O HYROX retorna nomes no formato "CORNÉLIO, ROGER" (sobrenome primeiro). O app exibe assim direto, quando deveria mostrar "Roger Cornélio".

### Solução

**1. Criar utilidade `normalizeAthleteName` no frontend**

**Arquivo**: `src/utils/displayName.ts`

Adicionar função que detecta o formato "SOBRENOME, NOME" (com vírgula) e inverte para "NOME SOBRENOME":

```typescript
export function normalizeAthleteName(name: string): string {
  const raw = name?.trim() ?? '';
  if (!raw || !raw.includes(',')) return raw;
  const [lastName, firstName] = raw.split(',').map(p => p.trim());
  return [firstName, lastName].filter(Boolean).join(' ') || raw;
}
```

**2. Aplicar normalização nos pontos de entrada dos dados**

Onde `athlete_name` do scraping é armazenado em `nome_atleta`:

- `src/components/WelcomeScreen.tsx` — nas linhas onde seta `nome_atleta: selectedResult?.athlete_name` (4 ocorrências)
- `src/pages/DiagnosticoGratuito.tsx` — onde seta `nome_atleta: selectedResult?.athlete_name`
- `src/components/RoxCoachExtractor.tsx` — onde seta `nome_atleta: result.athlete_name`
- `src/pages/ImportarProva.tsx` — onde usa `parsed.resumoRow.nome_atleta`

Em cada ponto, envolver com `normalizeAthleteName()`.

**3. Normalizar também nos resultados de busca (search-hyrox-athlete)**

**Arquivo**: `supabase/functions/search-hyrox-athlete/index.ts` (linha 215)

Aplicar a mesma lógica de inversão no `athleteName` retornado antes de pushá-lo nos results. Isso corrige na origem para que todos os consumidores recebam o nome correto.

### Resumo
- 1 utilidade adicionada (`displayName.ts`)
- 1 edge function corrigida (search-hyrox-athlete)
- 3-4 componentes atualizados para normalizar na entrada

