

# Plano: Extração RoxCoach + Salvamento + Dashboard Analítico

## Resumo

Criar funcionalidade completa de extração de dados do RoxCoach na página `/importar-prova`, com input de URL, chamada à API externa, salvamento no banco, e apresentação visual dos dados (splits em cards + diagnóstico em tabela com badges).

## 1. Banco de Dados (2 migrações)

### Tabela `diagnostico_melhoria`
```sql
CREATE TABLE public.diagnostico_melhoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL,
  movement text NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  your_score numeric NOT NULL DEFAULT 0,
  top_1 numeric NOT NULL DEFAULT 0,
  improvement_value numeric NOT NULL DEFAULT 0,
  percentage numeric NOT NULL DEFAULT 0,
  total_improvement numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostico_melhoria ENABLE ROW LEVEL SECURITY;

-- RLS: usuário lê/insere/deleta próprios dados
CREATE POLICY "Users can view own diagnostico" ON public.diagnostico_melhoria FOR SELECT USING (auth.uid() = atleta_id);
CREATE POLICY "Users can insert own diagnostico" ON public.diagnostico_melhoria FOR INSERT WITH CHECK (auth.uid() = atleta_id);
CREATE POLICY "Users can delete own diagnostico" ON public.diagnostico_melhoria FOR DELETE USING (auth.uid() = atleta_id);
CREATE POLICY "Block anon diagnostico" ON public.diagnostico_melhoria FOR ALL USING (false);
CREATE POLICY "Admins can view all diagnostico" ON public.diagnostico_melhoria FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

### Tabela `tempos_splits`
```sql
CREATE TABLE public.tempos_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL,
  split_name text NOT NULL,
  time text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tempos_splits ENABLE ROW LEVEL SECURITY;

-- Mesmas políticas RLS
CREATE POLICY "Users can view own splits" ON public.tempos_splits FOR SELECT USING (auth.uid() = atleta_id);
CREATE POLICY "Users can insert own splits" ON public.tempos_splits FOR INSERT WITH CHECK (auth.uid() = atleta_id);
CREATE POLICY "Users can delete own splits" ON public.tempos_splits FOR DELETE USING (auth.uid() = atleta_id);
CREATE POLICY "Block anon splits" ON public.tempos_splits FOR ALL USING (false);
CREATE POLICY "Admins can view all splits" ON public.tempos_splits FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

## 2. Componente `RoxCoachExtractor` (novo arquivo)

`src/components/RoxCoachExtractor.tsx`

- Input com placeholder "Cole a URL do seu resultado no RoxCoach..."
- Botão "Hackear Meus Dados" com spinner durante loading
- Ao clicar: `fetch(`https://api-outlier.onrender.com/diagnostico?url=${encodeURIComponent(url)}`)`
- Com o JSON de retorno:
  1. Deletar dados antigos do atleta (para permitir re-importação)
  2. Bulk insert no `diagnostico_melhoria` com `atleta_id = user.id`
  3. Bulk insert no `tempos_splits` com `atleta_id = user.id`
  4. Toast de sucesso ou erro
  5. Trigger re-fetch dos dados para exibição

## 3. Componente `RoxCoachDashboard` (novo arquivo)

`src/components/RoxCoachDashboard.tsx`

- Hook que busca dados de `tempos_splits` e `diagnostico_melhoria` do usuário logado
- **Seção 1 - Tempos/Splits**: Grid de cards com `split_name` como label e `time` em destaque (fonte grande, cor primária)
- **Seção 2 - Diagnóstico de Melhoria**: Tabela com colunas movement, metric, value, your_score, top_1, improvement_value, percentage, total_improvement. Coluna `percentage` usa Badge com cor baseada no valor (verde < 5%, amarelo 5-15%, vermelho > 15%)

## 4. Integração na página `ImportarProva.tsx`

Adicionar as duas seções ao final da página existente:
- `RoxCoachExtractor` (input + botão) no topo ou como seção separada
- `RoxCoachDashboard` abaixo, exibido quando há dados salvos

## Arquivos criados/modificados

| Arquivo | Ação |
|---|---|
| Migration SQL (2 tabelas) | Criar |
| `src/components/RoxCoachExtractor.tsx` | Criar |
| `src/components/RoxCoachDashboard.tsx` | Criar |
| `src/pages/ImportarProva.tsx` | Modificar (adicionar seções) |

